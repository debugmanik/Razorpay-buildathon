import { demoRepo } from '../../data/demoRepository';
import { getRecoveryImpactMetrics } from '../../data/analytics';
import { getDashboardMetrics } from '../../data/dashboard';
import { getQueueData } from '../../data/queue';
import { searchCasesAction } from '@/app/actions/header';
import { RecoveryEngine, RecoveryRepository, FullCaseContext } from '../core';
import { SimulationActionProvider } from '../../providers/SimulationActionProvider';
import { ActionStatus, ActionType, CaseStatus } from '@/types/domain';

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

class MockRepository implements RecoveryRepository {
  public cases: Record<string, FullCaseContext> = {};
  public audits: { caseId: string; eventType: string; description: string; actionId?: string }[] = [];
  public actions: { id: string; caseId: string; type: ActionType; attempt: number; status: ActionStatus; amountRecovered?: number }[] = [];

  async getCaseContext(caseId: string) {
    return this.cases[caseId] || null;
  }
  async saveCaseState(caseId: string, status: CaseStatus, updates: Partial<FullCaseContext>) {
    if (this.cases[caseId]) {
      this.cases[caseId].status = status;
      Object.assign(this.cases[caseId], updates);
    }
  }
  async createAction(caseId: string, type: ActionType, attempt: number) {
    const existing = this.actions.find(a => a.caseId === caseId && a.type === type && a.attempt === attempt);
    if (existing) return { id: existing.id, existing: true };
    const id = `act_${Date.now()}_${Math.random()}`;
    this.actions.push({ id, caseId, type, attempt, status: 'pending' });
    return { id, existing: false };
  }
  async saveAudit(caseId: string, eventType: string, description: string, actionId?: string) {
    this.audits.push({ caseId, eventType, description, actionId });
  }
  async updateActionOutcome(actionId: string, status: ActionStatus, resultDetails: string, amountRecovered: number) {
    const action = this.actions.find(a => a.id === actionId);
    if (action) {
      action.status = status;
      action.amountRecovered = amountRecovered;
    }
  }
}

describe('Master Pass: Multi-Scenario, Financial Reconciliation & System Integrity', () => {
  let repo: MockRepository;
  let engine: RecoveryEngine;

  beforeEach(() => {
    repo = new MockRepository();
    engine = new RecoveryEngine(repo, new SimulationActionProvider());
    demoRepo.reset();
  });

  describe('1. Multi-Scenario Recovery Loops', () => {
    it('handles checkout_dropoff scenario with bounded customer notification', async () => {
      repo.cases['checkout_case'] = {
        id: 'checkout_case',
        status: 'ready',
        type: 'checkout_dropoff',
        amountAtRisk: 2999,
        attemptCount: 0,
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 2, previousFailures: 0 },
        paymentDetails: { failureReason: 'Session abandoned at checkout' },
        policy: {
          id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'checkout_dropoff',
          maxAttempts: 2, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        recommendedAction: 'send_checkout_recovery',
        decision: 'ACT'
      };

      await engine.processNextBoundedAction('checkout_case');

      expect(repo.cases['checkout_case'].status).toBe('recovered');
      const audits = repo.audits.filter(a => a.caseId === 'checkout_case').map(a => a.eventType);
      expect(audits).toContain('ACTION_EXECUTED');
      expect(audits).toContain('PAYMENT_RECOVERED');
    });

    it('handles subscription_failure with retry limits and cooldown', async () => {
      repo.cases['sub_case'] = {
        id: 'sub_case',
        status: 'ready',
        type: 'subscription_failure',
        amountAtRisk: 1499,
        attemptCount: 2, // Reached max attempts
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 6, previousFailures: 2 },
        paymentDetails: { failureReason: 'Card renewal processing failure' },
        policy: {
          id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'subscription_failure',
          maxAttempts: 2, cooldownMinutes: 5, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        recommendedAction: 'retry_subscription',
        decision: 'ESCALATE'
      };

      await engine.processNextBoundedAction('sub_case');

      // Policy must block retry #3 and escalate
      expect(repo.cases['sub_case'].status).toBe('escalated');
      expect(repo.cases['sub_case'].decision).toBe('ESCALATE');
      const audits = repo.audits.filter(a => a.caseId === 'sub_case').map(a => a.eventType);
      expect(audits).toContain('RECOVERY_ESCALATED');
    });

    it('handles mandate_failure with structured sequencer', async () => {
      repo.cases['mandate_case'] = {
        id: 'mandate_case',
        status: 'ready',
        type: 'mandate_failure',
        amountAtRisk: 799,
        attemptCount: 0,
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 3, previousFailures: 0 },
        paymentDetails: { failureReason: 'Auto-debit authorization delay' },
        policy: {
          id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'mandate_failure',
          maxAttempts: 2, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        recommendedAction: 'retry_mandate',
        decision: 'ACT'
      };

      await engine.processNextBoundedAction('mandate_case');

      expect(repo.cases['mandate_case'].status).toBe('recovered');
      const action = repo.actions.find(a => a.caseId === 'mandate_case');
      expect(action?.type).toBe('retry_mandate');
    });

    it('supports B2B receivable promise-to-pay status tracking without premature revenue recognition', () => {
      // Promise-to-pay creation must record promise metadata but NOT count as recovered revenue
      const b2bCase = demoRepo.cases['case_acme_b2b'];
      expect(b2bCase).toBeDefined();
      expect(b2bCase.status).toBe('recovering');
      expect(b2bCase.metadata?.promiseStatus).toBe('PROMISED');

      // Overview, Analytics, and Queue must NOT count this as recovered
      const analytics = getRecoveryImpactMetrics('all');
      expect(analytics.recoveredRevenue).not.toBe(b2bCase.amountAtRisk);
      
      // Only confirmed captured payments are counted (Karan 4999 + Amit 1999 = 6998)
      expect(analytics.recoveredRevenue).toBe(6998);
    });
  });

  describe('2. Critical Financial Reconciliation', () => {
    it('guarantees Overview, Analytics, and Queue actual recovered revenue are exactly identical', async () => {
      const dashboard = await getDashboardMetrics();
      const analytics = getRecoveryImpactMetrics('all');
      const queue = await getQueueData();

      // Absolute reconciliation invariant:
      expect(dashboard.recoveredRevenue).toBe(analytics.recoveredRevenue);
      expect(queue.metrics.recoveredRevenue).toBe(analytics.recoveredRevenue);

      // Verify that expected recovery is strictly distinct from actual recovered revenue
      expect(dashboard.expectedRecovery).not.toBe(dashboard.recoveredRevenue);
      expect(dashboard.expectedIncrementalRecoveryValue).not.toBe(dashboard.recoveredRevenue);
      expect(dashboard.expectedNetRecoveryValue).not.toBe(dashboard.recoveredRevenue);
    });
  });

  describe('3. Global Search Functionality', () => {
    it('searches accurately across customer name, case ID, payment ID, invoice ID, subscription ID, mandate ID', async () => {
      // 1. Customer Name
      const byCustomer = await searchCasesAction('Aarav');
      expect(byCustomer.length).toBeGreaterThan(0);
      expect(byCustomer[0].customerName).toContain('Aarav');

      // 2. Case ID
      const byCaseId = await searchCasesAction('case_priya_fail');
      expect(byCaseId.length).toBe(1);
      expect(byCaseId[0].id).toBe('case_priya_fail');

      // 3. Payment ID
      const byPaymentId = await searchCasesAction('pay_demo_aarav_001');
      expect(byPaymentId.length).toBe(1);
      expect(byPaymentId[0].id).toBe('case_aarav_hero');

      // 4. Invoice ID
      const byInvoice = await searchCasesAction('inv_b2b_9918');
      expect(byInvoice.length).toBe(1);
      expect(byInvoice[0].id).toBe('case_acme_b2b');

      // 5. Subscription ID
      const bySub = await searchCasesAction('sub_prime_881');
      expect(bySub.length).toBe(1);
      expect(bySub[0].id).toBe('case_amit_sub');

      // 6. Mandate ID
      const byMandate = await searchCasesAction('mandate_sip_442');
      expect(byMandate.length).toBe(1);
      expect(byMandate[0].id).toBe('case_kavita_mandate');
    });
  });

  describe('4. Merchant Policy Update & Demo Reset', () => {
    it('validates and updates merchant policy correctly', () => {
      expect(demoRepo.currentPolicy.maxAttempts).toBe(2);

      demoRepo.updatePolicy({ maxAttempts: 3, escalationThreshold: 25000 });
      expect(demoRepo.currentPolicy.maxAttempts).toBe(3);
      expect(demoRepo.currentPolicy.escalationThreshold).toBe(25000);

      // Throws on invalid input
      expect(() => demoRepo.updatePolicy({ maxAttempts: 5 })).toThrow('Invalid maxAttempts');
    });

    it('resets demo state to initial seed without deleting repository integrity', () => {
      demoRepo.cases['custom_temp_case'] = {
        id: 'custom_temp_case',
        status: 'ready',
        type: 'payment_failure',
        amountAtRisk: 1000,
        attemptCount: 0,
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 0, previousFailures: 0 },
      };

      expect(demoRepo.cases['custom_temp_case']).toBeDefined();

      demoRepo.reset();

      // Custom case removed, seeded cases restored
      expect(demoRepo.cases['custom_temp_case']).toBeUndefined();
      expect(demoRepo.cases['case_aarav_hero']).toBeDefined();
      expect(demoRepo.cases['case_priya_fail']).toBeDefined();
      expect(demoRepo.cases['case_vikram_abstain']).toBeDefined();
      expect(demoRepo.currentPolicy.maxAttempts).toBe(2);
    });
  });
});
