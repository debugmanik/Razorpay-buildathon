import { calculateRecoveryScore } from '../scoring';
import { selectIntervention } from '../intervention';
import { RecoveryEngine, RecoveryRepository, FullCaseContext } from '../core';
import { SimulationActionProvider } from '../../providers/SimulationActionProvider';
import { getRecoveryImpactMetrics, getOpportunityTypeEconomics, getBatchOutcomeQuality } from '../../data/analytics';
import { demoRepo } from '../../data/demoRepository';
import { ActionStatus, ActionType, CaseStatus } from '@/types/domain';

class TestRecoveryRepository implements RecoveryRepository {
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

describe('RecoverX Economic Decisioning & Governance Engine', () => {
  let repo: TestRecoveryRepository;
  let engine: RecoveryEngine;

  beforeEach(() => {
    repo = new TestRecoveryRepository();
    engine = new RecoveryEngine(repo, new SimulationActionProvider());
  });

  describe('1. Baseline & Intervention Estimates & Incremental Calculations', () => {
    it('calculates estimated natural recovery baseline, intervention probability, and incremental lift using dynamic formula', () => {
      const score = calculateRecoveryScore({
        previousSuccesses: 4,
        previousFailures: 1,
        amountAtRisk: 12500,
        isTemporaryFailureSignal: true,
        isHighRiskSignal: false,
      });

      expect(score.estimatedBaselineRecoveryProbability).toBe(0.24);
      expect(score.recoveryProbability).toBe(0.85);
      expect(score.incrementalLift).toBe(0.61); // 85% - 24% = +61pp lift
      expect(score.expectedRecovery).toBe(10625); // 12500 * 0.85
      expect(score.expectedIncrementalRecoveryValue).toBe(7625); // 12500 * 0.61
    });

    it('calculates expected net recovery value for custom configured scenario (Aarav Hero)', () => {
      const score = calculateRecoveryScore({
        previousSuccesses: 4,
        previousFailures: 1,
        amountAtRisk: 12500,
        isTemporaryFailureSignal: true,
        isHighRiskSignal: false,
        customInterventionProbability: 0.78,
        customBaselineProbability: 0.24,
      });

      expect(score.estimatedBaselineRecoveryProbability).toBe(0.24);
      expect(score.recoveryProbability).toBe(0.78);
      expect(score.incrementalLift).toBe(0.54); // +54pp lift
      expect(score.expectedRecovery).toBe(9750); // ₹9,750
      expect(score.expectedIncrementalRecoveryValue).toBe(6750); // ₹6,750

      const intervention = selectIntervention({
        caseType: 'payment_failure',
        recoveryProbability: score.recoveryProbability,
        expectedRecovery: score.expectedRecovery,
        diagnosisCategory: 'Temporary Payment Failure',
        expectedIncrementalRecoveryValue: score.expectedIncrementalRecoveryValue,
      });

      expect(intervention.action).toBe('create_recovery_payment');
      expect(intervention.estimatedInterventionCost).toBe(10);
      expect(intervention.expectedNetRecoveryValue).toBe(6740); // 6750 - 10 = ₹6,740
      expect(intervention.decision).toBe('ACT');
    });
  });

  describe('2. Tri-State Decisioning: ACT / ABSTAIN / ESCALATE', () => {
    it('ACT: Executes recovery when net recovery value is positive and merchant policy approves', async () => {
      repo.cases['hero_act'] = {
        id: 'hero_act',
        status: 'ready',
        type: 'payment_failure',
        amountAtRisk: 12500,
        attemptCount: 0,
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 4, previousFailures: 1 },
        paymentDetails: { failureReason: 'Temporary network timeout' },
        policy: {
          id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'payment_failure',
          maxAttempts: 3, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        recommendedAction: 'create_recovery_payment',
        expectedIncrementalRecoveryValue: 6750,
        estimatedInterventionCost: 10,
        expectedNetRecoveryValue: 6740,
      };

      await engine.processNextBoundedAction('hero_act');

      expect(repo.cases['hero_act'].decision).toBe('ACT');
      expect(repo.cases['hero_act'].status).toBe('recovered');
      
      const events = repo.audits.filter(a => a.caseId === 'hero_act').map(a => a.eventType);
      expect(events).toContain('DECISION_ACT');
      expect(events).toContain('POLICY_CHECKED');
      expect(events).toContain('ACTION_APPROVED');
      expect(events).toContain('PAYMENT_RECOVERED');
    });

    it('ABSTAIN: Withholds automated intervention when expected net recovery is <= 0 (Low-Value/Low-Lift)', async () => {
      // Amount ₹5,000, baseline 72%, intervention 74%, lift +2pp, incremental ₹100, cost ₹150, net -₹50
      repo.cases['case_abstain'] = {
        id: 'case_abstain',
        status: 'ready',
        type: 'payment_failure',
        amountAtRisk: 5000,
        attemptCount: 0,
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 8, previousFailures: 1 },
        paymentDetails: { failureReason: 'Card security check delay' },
        policy: {
          id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'payment_failure',
          maxAttempts: 3, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        recommendedAction: 'create_recovery_payment',
        expectedIncrementalRecoveryValue: 100,
        estimatedInterventionCost: 150,
        expectedNetRecoveryValue: -50,
      };

      await engine.processNextBoundedAction('case_abstain');

      // Status should remain ready, decision marked ABSTAIN, and no execution should have occurred
      expect(repo.cases['case_abstain'].decision).toBe('ABSTAIN');
      expect(repo.cases['case_abstain'].attemptCount).toBe(0);
      
      const actions = repo.actions.filter(a => a.caseId === 'case_abstain');
      expect(actions.length).toBe(0); // Zero actions executed

      const events = repo.audits.filter(a => a.caseId === 'case_abstain').map(a => a.eventType);
      expect(events).toContain('DECISION_ABSTAIN');
      expect(events).not.toContain('ACTION_EXECUTED');
    });

    it('ESCALATE: Routes to manual review when policy escalation threshold is exceeded', async () => {
      // Amount ₹84,000 exceeds escalationThreshold ₹50,000
      repo.cases['case_escalate'] = {
        id: 'case_escalate',
        status: 'ready',
        type: 'payment_failure',
        amountAtRisk: 84000,
        attemptCount: 0,
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 0, previousFailures: 3 },
        paymentDetails: { failureReason: 'Insufficient funds' },
        policy: {
          id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'payment_failure',
          maxAttempts: 3, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        recommendedAction: 'create_recovery_payment',
        expectedIncrementalRecoveryValue: 8400,
        estimatedInterventionCost: 50,
        expectedNetRecoveryValue: 8350,
      };

      await engine.processNextBoundedAction('case_escalate');

      expect(repo.cases['case_escalate'].status).toBe('escalated');
      expect(repo.cases['case_escalate'].decision).toBe('ESCALATE');
      
      const events = repo.audits.filter(a => a.caseId === 'case_escalate').map(a => a.eventType);
      expect(events).toContain('DECISION_ESCALATE');
      expect(events).toContain('RECOVERY_ESCALATED');
      expect(events).not.toContain('ACTION_EXECUTED');
    });

    it('Policy Overrides Economics: High net expected value CANNOT bypass merchant policy guardrails', async () => {
      // Huge amount at risk and massive net recovery value, but policy is disabled or max attempts reached
      repo.cases['policy_override'] = {
        id: 'policy_override',
        status: 'ready',
        type: 'payment_failure',
        amountAtRisk: 30000,
        attemptCount: 3, // Already reached maxAttempts
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 5, previousFailures: 0 },
        policy: {
          id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'payment_failure',
          maxAttempts: 3, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
          createdAt: new Date(), updatedAt: new Date()
        },
        recommendedAction: 'create_recovery_payment',
        expectedIncrementalRecoveryValue: 20000,
        estimatedInterventionCost: 10,
        expectedNetRecoveryValue: 19990, // Extremely positive economics
      };

      await engine.processNextBoundedAction('policy_override');

      // Policy must strictly override economics!
      expect(repo.cases['policy_override'].status).toBe('escalated');
      expect(repo.cases['policy_override'].decision).toBe('ESCALATE');
      
      const executed = repo.actions.filter(a => a.caseId === 'policy_override');
      expect(executed.length).toBe(0);
    });
  });

  describe('3. Financial Integrity & Audit Invariants', () => {
    it('never recognizes expected or incremental recovery as actual recovered revenue', () => {
      const metrics = getRecoveryImpactMetrics('all');
      
      // Actual recovered revenue must only equal confirmed captured amounts in repo
      let confirmedSucceededRevenue = 0;
      demoRepo.actions.filter(a => a.status === 'succeeded' && a.amountRecovered > 0).forEach(a => {
        confirmedSucceededRevenue += a.amountRecovered;
      });

      expect(metrics.recoveredRevenue).toBe(confirmedSucceededRevenue);
      expect(metrics.recoveredRevenue).not.toBe(metrics.expectedRecovery);
      expect(metrics.recoveredRevenue).not.toBe(metrics.expectedIncrementalRecoveryValue);
      expect(metrics.recoveredRevenue).not.toBe(metrics.expectedNetRecoveryValue);
    });

    it('records complete traceable economic decision audit logs during analyzing transition', async () => {
      repo.cases['unscored_case'] = {
        id: 'unscored_case',
        status: 'analyzing',
        type: 'payment_failure',
        amountAtRisk: 10000,
        attemptCount: 0,
        createdAt: new Date(),
        customerHistory: { previousSuccesses: 3, previousFailures: 1 },
        paymentDetails: { failureReason: 'Temporary network timeout' },
        policy: {
          id: 'pol_1', merchantId: 'm1', name: 'Standard', caseType: 'payment_failure',
          maxAttempts: 3, cooldownMinutes: 0, recoveryWindowHours: 24, escalationThreshold: 50000, enabled: true,
          createdAt: new Date(), updatedAt: new Date()
        },
      };

      await engine.processNextBoundedAction('unscored_case');

      const audits = repo.audits.filter(a => a.caseId === 'unscored_case').map(a => a.eventType);
      expect(audits).toContain('BASELINE_SCORED');
      expect(audits).toContain('INTERVENTION_SCORED');
      expect(audits).toContain('INCREMENTAL_VALUE_CALCULATED');
      expect(audits).toContain('INTERVENTION_COST_EVALUATED');
      expect(audits).toContain('DECISION_ACT');
    });
  });

  describe('4. Batch Analytics Aggregation', () => {
    it('aggregates opportunity type economics with baseline and incremental estimates', () => {
      const economics = getOpportunityTypeEconomics('all');
      expect(economics.length).toBeGreaterThan(0);
      
      for (const item of economics) {
        expect(item.amountAtRisk).toBeGreaterThanOrEqual(0);
        expect(item.baselineEstimate).toBeGreaterThanOrEqual(0);
        expect(item.withActionEstimate).toBeGreaterThanOrEqual(item.baselineEstimate);
        expect(item.incrementalRecovery).toBeGreaterThanOrEqual(0);
      }
    });

    it('categorizes batch outcome quality including abstained and escalated cases', () => {
      const quality = getBatchOutcomeQuality('all');
      const statuses = quality.map(q => q.status);
      
      expect(statuses).toContain('Successfully Recovered');
      expect(statuses).toContain('Customer Pending');
      expect(statuses).toContain('Abstained');
      expect(statuses).toContain('Policy Stopped');
      expect(statuses).toContain('Manually Escalated');
    });
  });
});
