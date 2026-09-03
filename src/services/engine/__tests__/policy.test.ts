import { evaluatePolicy } from '../../policy/engine';
import { RecoveryPolicy, CaseStatus } from '@/types/domain';

describe('Policy Engine', () => {
  const defaultPolicy: RecoveryPolicy = {
    id: 'test-policy',
    merchantId: 'merch_1',
    name: 'Test Policy',
    caseType: 'payment_failure',
    maxAttempts: 3,
    cooldownMinutes: 10,
    recoveryWindowHours: 24,
    escalationThreshold: 50000,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('allows valid action', () => {
    const result = evaluatePolicy({
      policy: defaultPolicy,
      currentAttemptCount: 1,
      caseStatus: 'ready',
      caseCreatedAt: new Date(),
      amountAtRisk: 1000,
      action: 'create_recovery_payment',
      hasPromiseToPay: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.stop).toBe(false);
  });

  it('blocks if policy is disabled and escalates', () => {
    const result = evaluatePolicy({
      policy: { ...defaultPolicy, enabled: false },
      currentAttemptCount: 1,
      caseStatus: 'ready',
      caseCreatedAt: new Date(),
      amountAtRisk: 1000,
      action: 'create_recovery_payment',
    });
    expect(result.allowed).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.escalate).toBe(true);
  });

  it('blocks if max attempts reached and escalates', () => {
    const result = evaluatePolicy({
      policy: defaultPolicy,
      currentAttemptCount: 3,
      caseStatus: 'ready',
      caseCreatedAt: new Date(),
      amountAtRisk: 1000,
      action: 'create_recovery_payment',
    });
    expect(result.allowed).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.escalate).toBe(true);
    expect(result.reason).toContain('Maximum attempts');
  });

  it('blocks if cooldown period has not elapsed', () => {
    const lastAction = new Date();
    // 5 minutes ago, but cooldown is 10 mins
    lastAction.setMinutes(lastAction.getMinutes() - 5); 

    const result = evaluatePolicy({
      policy: defaultPolicy,
      currentAttemptCount: 1,
      caseStatus: 'ready',
      caseCreatedAt: new Date(),
      lastActionAt: lastAction,
      amountAtRisk: 1000,
      action: 'create_recovery_payment',
    });
    expect(result.allowed).toBe(false);
    expect(result.stop).toBe(false); // Does not stop the whole flow, just blocks current execution
    expect(result.reason).toContain('Cooldown period');
  });

  it('blocks and escalates if recovery window expired', () => {
    const createdAt = new Date();
    // 25 hours ago, window is 24 hours
    createdAt.setHours(createdAt.getHours() - 25);

    const result = evaluatePolicy({
      policy: defaultPolicy,
      currentAttemptCount: 1,
      caseStatus: 'ready',
      caseCreatedAt: createdAt,
      amountAtRisk: 1000,
      action: 'create_recovery_payment',
    });
    expect(result.allowed).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.escalate).toBe(true);
    expect(result.reason).toContain('Recovery window');
  });

  it('blocks further actions if case is already recovered', () => {
    const result = evaluatePolicy({
      policy: defaultPolicy,
      currentAttemptCount: 1,
      caseStatus: 'recovered',
      caseCreatedAt: new Date(),
      amountAtRisk: 1000,
      action: 'create_recovery_payment',
    });
    expect(result.allowed).toBe(false);
    expect(result.stop).toBe(true);
  });

  it('blocks further actions if case is already stopped or escalated', () => {
    ['stopped', 'escalated'].forEach((status) => {
      const result = evaluatePolicy({
        policy: defaultPolicy,
        currentAttemptCount: 1,
        caseStatus: status as CaseStatus,
        caseCreatedAt: new Date(),
        amountAtRisk: 1000,
        action: 'create_recovery_payment',
      });
      expect(result.allowed).toBe(false);
      expect(result.stop).toBe(true);
    });
  });
});
