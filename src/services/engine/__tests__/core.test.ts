import { RecoveryEngine, RecoveryRepository, FullCaseContext } from '../core';
import { SimulationActionProvider } from '../../providers/SimulationActionProvider';
import { ActionStatus, ActionType, CaseStatus } from '@/types/domain';

class MockRecoveryRepository implements RecoveryRepository {
  public cases: Record<string, FullCaseContext> = {};
  public audits: Record<string, unknown>[] = [];
  public actions: Record<string, unknown>[] = [];

  async getCaseContext(caseId: string) {
    return this.cases[caseId] || null;
  }
  async saveCaseState(caseId: string, status: CaseStatus, updates: Partial<FullCaseContext>) {
    if (this.cases[caseId]) {
      this.cases[caseId].status = status;
      Object.assign(this.cases[caseId], updates);
    }
  }
  async createAction(caseId: string, type: ActionType, attempt: number, policyId?: string) {
    const existing = this.actions.find(a => a.caseId === caseId && a.type === type && a.attempt === attempt);
    if (existing) return { id: existing.id as string, existing: true };
    const id = `act_${Date.now()}_${Math.random()}`;
    this.actions.push({ id, caseId, type, attempt, policyId, status: 'pending' });
    return { id, existing: false };
  }
  async saveAudit(caseId: string, eventType: string, description: string, actionId?: string) {
    this.audits.push({ caseId, eventType, description, actionId });
  }
  async updateActionOutcome(actionId: string, status: ActionStatus, resultDetails: string, amountRecovered: number) {
    const action = this.actions.find(a => a.id === actionId);
    if (action) {
      action.status = status;
      action.resultDetails = resultDetails;
      action.amountRecovered = amountRecovered;
    }
  }
}

describe('Recovery Engine Core Orchestration', () => {
  let repo: MockRecoveryRepository;
  let engine: RecoveryEngine;

  beforeEach(() => {
    repo = new MockRecoveryRepository();
    engine = new RecoveryEngine(repo, new SimulationActionProvider());
  });

  it('executes the Hero Case successfully', async () => {
    repo.cases['hero'] = {
      id: 'hero',
      status: 'ready',
      type: 'payment_failure',
      amountAtRisk: 12500,
      attemptCount: 0,
      createdAt: new Date(),
      customerHistory: { previousSuccesses: 4, previousFailures: 0 },
      paymentDetails: { failureReason: 'network timeout' },
      metadata: { scenario: 'HERO_PAYMENT_RECOVERY' },
      policy: {
        id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'payment_failure',
        maxAttempts: 3, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
        createdAt: new Date(), updatedAt: new Date()
      },
      recommendedAction: 'create_recovery_payment'
    };

    await engine.processNextBoundedAction('hero');

    expect(repo.cases['hero'].status).toBe('recovered');
    
    // Verify Audit Trail
    const events = repo.audits.map(a => a.eventType);
    expect(events).toContain('POLICY_CHECKED');
    expect(events).toContain('ACTION_EXECUTED');
    expect(events).toContain('PAYMENT_RECOVERED');
  });

  it('enforces bounded failure (Priya scenario) incrementally', async () => {
    repo.cases['bounded'] = {
      id: 'bounded',
      status: 'ready',
      type: 'payment_failure',
      amountAtRisk: 25000,
      attemptCount: 1, // Suppose attempt 1 already failed
      createdAt: new Date(),
      customerHistory: { previousSuccesses: 0, previousFailures: 3 },
      metadata: { scenario: 'BOUNDED_RETRY_FAILURE' },
      policy: {
        id: 'pol_strict', merchantId: 'm1', name: 'Strict', caseType: 'payment_failure',
        maxAttempts: 2, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
        createdAt: new Date(), updatedAt: new Date()
      },
      recommendedAction: 'create_recovery_payment'
    };

    // First invocation -> Should execute Retry #2 and fail
    await engine.processNextBoundedAction('bounded');
    
    // The action should fail, putting the case back in 'ready' to be picked up or blocked
    expect(repo.cases['bounded'].status).toBe('ready');
    expect(repo.cases['bounded'].attemptCount).toBe(2);

    // Second invocation -> Policy Engine should block because attemptCount (2) >= maxAttempts (2)
    await engine.processNextBoundedAction('bounded');

    // Case should now be stopped/escalated
    expect(repo.cases['bounded'].status).toBe('escalated');

    // Verify Escalation Audit
    const events = repo.audits.filter(a => a.caseId === 'bounded').map(a => a.eventType);
    expect(events).toContain('RECOVERY_ESCALATED');
  });

  it('enforces idempotency on action execution', async () => {
    repo.cases['idem'] = {
      id: 'idem',
      status: 'ready',
      type: 'payment_failure',
      amountAtRisk: 1000,
      attemptCount: 0, // next attempt is 1
      createdAt: new Date(),
      customerHistory: { previousSuccesses: 0, previousFailures: 0 },
      policy: {
        id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'payment_failure',
        maxAttempts: 3, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
        createdAt: new Date(), updatedAt: new Date()
      },
      recommendedAction: 'create_recovery_payment'
    };

    // Pre-insert the exact action the engine would try to create to trigger idempotency guard
    await repo.createAction('idem', 'create_recovery_payment', 1);

    await engine.processNextBoundedAction('idem');

    // Because the action already exists, the engine should skip execution and NOT transition to recovering/recovered
    expect(repo.cases['idem'].status).toBe('ready'); // Unchanged
    expect(repo.cases['idem'].attemptCount).toBe(0); // Unchanged
    
    const executionEvents = repo.audits.filter(a => a.eventType === 'ACTION_EXECUTED');
    expect(executionEvents.length).toBe(0);
  });

  it('maps legacy retry_payment to create_recovery_payment automatically', async () => {
    repo.cases['legacy_case'] = {
      id: 'legacy_case',
      status: 'ready',
      type: 'payment_failure',
      amountAtRisk: 1000,
      attemptCount: 0,
      createdAt: new Date(),
      customerHistory: { previousSuccesses: 0, previousFailures: 0 },
      policy: {
        id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'payment_failure',
        maxAttempts: 3, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
        createdAt: new Date(), updatedAt: new Date()
      },
      recommendedAction: 'Retry Payment' // Legacy text
    };

    await engine.processNextBoundedAction('legacy_case');

    // Case recommendedAction should be updated
    expect(repo.cases['legacy_case'].recommendedAction).toBe('create_recovery_payment');

    // The action executed should be create_recovery_payment
    const createdAction = repo.actions.find(a => a.caseId === 'legacy_case');
    expect(createdAction?.type).toBe('create_recovery_payment');
  });
});
