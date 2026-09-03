import { demoRepo } from '../../data/demoRepository';
import { simulateCustomerIntentAction } from '@/app/actions/recovery';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Customer Intent Behavior & Duplicate Protection', () => {
  const caseId = 'case_test_intent';

  beforeEach(() => {
    demoRepo.reset();
    demoRepo.cases[caseId] = {
      id: caseId,
      status: 'recovering',
      type: 'receivable',
      amountAtRisk: 125000,
      attemptCount: 1,
      createdAt: new Date(),
      customerHistory: { previousSuccesses: 1, previousFailures: 0 },
      metadata: {
        customerName: 'Aarav Sharma',
        scenario: 'PROMISE_TO_PAY',
      },
      policy: {
        id: 'pol_1',
        merchantId: 'merch_1',
        name: 'Default',
        caseType: 'payment_failure',
        maxAttempts: 2,
        cooldownMinutes: 1,
        recoveryWindowHours: 24,
        escalationThreshold: 5000000,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      recoveryProbability: 0.90,
      expectedRecovery: 112500,
      recommendedAction: 'start_promise_to_pay',
      diagnosis: 'Overdue Invoice',
    };
  });

  it('Already Paid creates exactly one customer-intent event and sets Payment Verification Required', async () => {
    const res = await simulateCustomerIntentAction(caseId, 'ALREADY_PAID');
    expect(res.success).toBe(true);

    const ctx = await demoRepo.getCaseContext(caseId);
    expect(ctx).toBeDefined();
    expect(ctx?.status).toBe('recovering');
    expect(ctx?.status).not.toBe('recovered');
    expect(ctx?.metadata?.lastCustomerIntent).toBe('ALREADY_PAID');
    expect(ctx?.metadata?.intentStatus).toBe('payment_verification_required');

    const audits = demoRepo.getAuditsForCase(caseId);
    const intentAudits = audits.filter(a => a.eventType === 'CUSTOMER_INTENT_RECEIVED');
    const verificationAudits = audits.filter(a => a.eventType === 'PAYMENT_VERIFICATION_REQUIRED');
    const pendingAudits = audits.filter(a => a.eventType === 'ACTION_PENDING_CUSTOMER');

    expect(intentAudits.length).toBe(1);
    expect(intentAudits[0].description).toBe('Customer responded: Already Paid');
    expect(verificationAudits.length).toBe(1);
    expect(verificationAudits[0].description).toContain('Waiting for payment confirmation');
    // Does NOT show ACTION_PENDING_CUSTOMER
    expect(pendingAudits.length).toBe(0);
  });

  it('repeated Already Paid does not duplicate the audit trail or trigger repeated events', async () => {
    // Select Already Paid 3 times in a row
    await simulateCustomerIntentAction(caseId, 'ALREADY_PAID');
    const auditsAfterFirst = demoRepo.getAuditsForCase(caseId).length;

    await simulateCustomerIntentAction(caseId, 'ALREADY_PAID');
    await simulateCustomerIntentAction(caseId, 'ALREADY_PAID');

    const auditsAfterRepeats = demoRepo.getAuditsForCase(caseId);
    expect(auditsAfterRepeats.length).toBe(auditsAfterFirst);

    const intentAudits = auditsAfterRepeats.filter(a => a.eventType === 'CUSTOMER_INTENT_RECEIVED');
    expect(intentAudits.length).toBe(1);
  });

  it('Already Paid does NOT increase recovered revenue or mark case as recovered (Financial Integrity)', async () => {
    await simulateCustomerIntentAction(caseId, 'ALREADY_PAID');

    const ctx = await demoRepo.getCaseContext(caseId);
    expect(ctx?.status).toBe('recovering');
    expect(ctx?.status).not.toBe('recovered');

    const actions = demoRepo.getActionsForCase(caseId);
    const actualRecovered = actions.reduce((sum, a) => sum + (a.amountRecovered || 0), 0);
    expect(actualRecovered).toBe(0);
  });

  it('changing intent creates a new legitimate event without unbounded duplication', async () => {
    // 1. Initial Already Paid
    await simulateCustomerIntentAction(caseId, 'ALREADY_PAID');
    let audits = demoRepo.getAuditsForCase(caseId);
    expect(audits.filter(a => a.eventType === 'CUSTOMER_INTENT_RECEIVED').length).toBe(1);

    // 2. Change to Remind Later
    await simulateCustomerIntentAction(caseId, 'REMIND_LATER');
    audits = demoRepo.getAuditsForCase(caseId);
    expect(audits.filter(a => a.eventType === 'CUSTOMER_INTENT_RECEIVED').length).toBe(2);
    expect(audits.some(a => a.description === 'Customer responded: Remind Me Later')).toBe(true);

    const ctx = await demoRepo.getCaseContext(caseId);
    expect(ctx?.metadata?.lastCustomerIntent).toBe('REMIND_LATER');
    expect(ctx?.metadata?.intentStatus).toBe('remind_later');

    // 3. Repeated Remind Later does NOT duplicate
    await simulateCustomerIntentAction(caseId, 'REMIND_LATER');
    audits = demoRepo.getAuditsForCase(caseId);
    expect(audits.filter(a => a.eventType === 'CUSTOMER_INTENT_RECEIVED').length).toBe(2);

    // 4. Change back to Already Paid
    await simulateCustomerIntentAction(caseId, 'ALREADY_PAID');
    audits = demoRepo.getAuditsForCase(caseId);
    expect(audits.filter(a => a.eventType === 'CUSTOMER_INTENT_RECEIVED').length).toBe(3);
    expect(audits.some(a => a.description === 'Customer responded: Already Paid')).toBe(true);
  });

  it('Pay Now enters the existing recovery-payment flow and creates a recovery order', async () => {
    await simulateCustomerIntentAction(caseId, 'PAY_NOW');

    const ctx = await demoRepo.getCaseContext(caseId);
    expect(ctx?.status).toBe('recovering');
    expect(ctx?.metadata?.lastCustomerIntent).toBe('PAY_NOW');
    expect(ctx?.metadata?.recoveryOrderId).toBeDefined();

    const audits = demoRepo.getAuditsForCase(caseId);
    expect(audits.some(a => a.eventType === 'CUSTOMER_INTENT_RECEIVED' && a.description === 'Customer responded: Pay Now')).toBe(true);
    expect(audits.some(a => a.eventType === 'RECOVERY_PAYMENT_CREATED')).toBe(true);
  });
});
