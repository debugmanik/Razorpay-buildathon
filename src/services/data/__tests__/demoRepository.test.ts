import { DemoRepository } from '../demoRepository';

describe('DemoRepository', () => {
  let repo: DemoRepository;

  beforeEach(() => {
    repo = new DemoRepository();
  });

  describe('reset()', () => {
    it('should completely clear mutated state and reseed original data', async () => {
      // 1. Mutate state
      await repo.createAction('case_aarav_hero', 'create_recovery_payment', 1);
      await repo.saveAudit('case_aarav_hero', 'TEST_EVENT', 'Test description');
      await repo.markEventProcessed('evt_123');
      await repo.upsertPayment('pay_123', { id: 'pay_123' });
      const initialAuditsCount = repo.audits.length;

      expect(repo.actions.length).toBeGreaterThan(0);
      expect(repo.processedEventIds.has('evt_123')).toBe(true);
      expect(repo.payments['pay_123']).toBeDefined();

      // 2. Reset
      repo.reset();

      // 3. Verify clean state
      expect(repo.actions.length).toBe(5); // Seed creates 5 initial actions across scenarios
      expect(repo.audits.length).toBeLessThan(initialAuditsCount); // Reseed creates only initial audits
      expect(repo.processedEventIds.has('evt_123')).toBe(false); // Should be cleared
      expect(repo.payments['pay_123']).toBeUndefined(); // Should be cleared
      
      // Seed data should be back
      expect(repo.cases['case_aarav_hero']).toBeDefined();
      expect(repo.cases['case_priya_fail']).toBeDefined();
    });
  });

  describe('Policy Integrity', () => {
    it('should attach the immutable default policy on case creation', async () => {
      const caseId = await repo.createCaseFromPayment('pay_new', 1000, 'error', 'card');
      const c = repo.cases[caseId];
      expect(c.policy?.maxAttempts).toBe(2);
      expect(c.policy?.cooldownMinutes).toBe(1);
      expect(c.policy?.enabled).toBe(true);
    });
  });
});
