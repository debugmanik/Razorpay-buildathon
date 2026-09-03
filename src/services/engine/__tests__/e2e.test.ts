import { DemoRepository } from '../../data/demoRepository';
import { RecoveryEngine } from '../core';
import { SimulationActionProvider } from '../../providers/SimulationActionProvider';

describe('End-to-End Hardening & Reliability', () => {
  let repo: DemoRepository;
  let engine: RecoveryEngine;
  let actionProvider: SimulationActionProvider;

  let attachPolicy: (caseId: string) => void;

  beforeEach(() => {
    repo = new DemoRepository();
    actionProvider = new SimulationActionProvider();
    engine = new RecoveryEngine(repo, actionProvider);
    
    attachPolicy = (caseId: string) => {
      repo.cases[caseId].policy = {
        id: 'pol_1',
        merchantId: 'merch_1',
        name: 'Default',
        caseType: 'payment_failure',
        maxAttempts: 2, // 2 for Priya test
        cooldownMinutes: 1,
        recoveryWindowHours: 24,
        escalationThreshold: 5000000,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    };
  });

  describe('Financial Invariants', () => {
    it('enforces Expected Recovery = Amount at Risk * Recovery Probability', async () => {
      const caseId = await repo.createCaseFromPayment('pay_inv', 1250000, 'Test error', 'card');
      repo.cases[caseId].metadata = { scenario: 'HERO_PAYMENT_RECOVERY' };
      attachPolicy(caseId);
      await engine.processNextBoundedAction(caseId);

      const ctx = repo.cases[caseId];
      expect(ctx).toBeDefined();
      if (!ctx) return;

      const calculatedExpected = Math.round(ctx.amountAtRisk * ctx.recoveryProbability! * 100) / 100;
      expect(ctx.expectedRecovery).toBe(calculatedExpected);
    });

    it('enforces Recovered Revenue <= Amount at Risk', async () => {
      const caseId = await repo.createCaseFromPayment('pay_inv2', 1250000, 'Temporary error', 'card');
      repo.cases[caseId].metadata = { scenario: 'HERO_PAYMENT_RECOVERY' };
      attachPolicy(caseId);
      await engine.processNextBoundedAction(caseId);
      
      const ctx = repo.cases[caseId];
      expect(ctx).toBeDefined();
      
      const actions = repo.actions.filter(a => a.caseId === caseId);
      let recovered = 0;
      actions.forEach(a => recovered += a.amountRecovered);
      
      expect(recovered).toBeLessThanOrEqual(ctx!.amountAtRisk);
    });
  });

  describe('Hero Scenario (Aarav)', () => {
    it('executes successful deterministic recovery', async () => {
      const caseId = await repo.createCaseFromPayment('pay_aarav', 1250000, 'Temporary payment/network failure', 'card');
      repo.cases[caseId].metadata = { scenario: 'HERO_PAYMENT_RECOVERY' };
      attachPolicy(caseId);
      
      // Simulate historical state
      repo.payments['pay_aarav'] = { customer_id: 'cust_aarav' };
      repo.payments['hist1'] = { customer_id: 'cust_aarav', status: 'captured' };
      repo.payments['hist2'] = { customer_id: 'cust_aarav', status: 'captured' };
      repo.payments['hist3'] = { customer_id: 'cust_aarav', status: 'captured' };
      repo.payments['hist4'] = { customer_id: 'cust_aarav', status: 'captured' };

      await engine.processNextBoundedAction(caseId);

      const ctx = repo.cases[caseId];
      expect(ctx?.status).toBe('recovered');
      
      const actions = repo.actions.filter(a => a.caseId === caseId);
      expect(actions.length).toBe(1);
      expect(actions[0].status).toBe('succeeded');
      expect(actions[0].amountRecovered).toBe(1250000);

      // Idempotency: Execution again on a recovered case should gracefully block/ignore
      await engine.processNextBoundedAction(caseId);
      const actionsAfter = repo.actions.filter(a => a.caseId === caseId);
      expect(actionsAfter.length).toBe(1); // No new actions created
    });
  });

  describe('Bounded Failure (Priya)', () => {
    it('stops and escalates upon hitting limits', async () => {
      const caseId = await repo.createCaseFromPayment('pay_priya', 2500000, 'Insufficient funds', 'card');
      repo.cases[caseId].metadata = { scenario: 'BOUNDED_RETRY_FAILURE' };
      attachPolicy(caseId);
      repo.payments['pay_priya'] = { customer_id: 'cust_priya' };

      // Attempt 1
      await engine.processNextBoundedAction(caseId);
      let ctx = repo.cases[caseId];
      expect(ctx?.status).toBe('ready'); // Ready for next attempt since Simulation provider simulates failed on attempt 1
      
      // Since it's simulation, let's artificially jump time to avoid cooldown
      ctx = repo.cases[caseId];
      if (ctx) {
        ctx.lastActionAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
      }

      // Attempt 2
      await engine.processNextBoundedAction(caseId);
      ctx = repo.cases[caseId];
      expect(ctx?.status).toBe('ready'); 
      
      if (ctx) {
        ctx.lastActionAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
      }
      
      // Attempt 3 (Hits limit of 2)
      await engine.processNextBoundedAction(caseId);
      ctx = repo.cases[caseId];
      expect(ctx?.status).toBe('escalated'); 

      // Attempt 4 (Already escalated)
      await engine.processNextBoundedAction(caseId);
      const actions = repo.actions.filter(a => a.caseId === caseId);
      expect(actions.length).toBe(2); // No new actions should be created
    });
  });
});
