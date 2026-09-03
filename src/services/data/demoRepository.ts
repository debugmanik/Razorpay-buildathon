import { FullCaseContext, RecoveryRepository } from '../engine/core';
import { ActionStatus, ActionType, CaseStatus, RecoveryPolicy } from '@/types/domain';

export type DemoActionRecord = {
  id: string;
  caseId: string;
  type: ActionType;
  attempt: number;
  policyId?: string;
  status: ActionStatus;
  resultDetails?: string;
  amountRecovered: number;
  createdAt: Date;
};

export type DemoAuditRecord = {
  id: string;
  caseId: string;
  eventType: string;
  description: string;
  actionId?: string;
  createdAt: Date;
};

export const defaultPolicy: RecoveryPolicy = {
  id: 'pol_demo',
  merchantId: 'merch_1',
  name: 'Temporary Failure v2',
  caseType: 'payment_failure',
  maxAttempts: 2,
  cooldownMinutes: 1, // keeping it low for fast testing
  recoveryWindowHours: 24,
  escalationThreshold: 50000,
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export class DemoRepository implements RecoveryRepository {
  public cases: Record<string, FullCaseContext> = {};
  public actions: DemoActionRecord[] = [];
  public audits: DemoAuditRecord[] = [];
  public payments: Record<string, unknown> = {};
  public processedEventIds = new Set<string>();
  public currentPolicy: RecoveryPolicy = { ...defaultPolicy };

  constructor() {
    this.seed();
  }

  reset() {
    this.cases = {};
    this.actions = [];
    this.audits = [];
    this.payments = {};
    this.processedEventIds.clear();
    this.currentPolicy = { ...defaultPolicy };
    // Re-seed original data
    this.seed();
  }

  updatePolicy(updates: Partial<RecoveryPolicy>) {
    // Validate incoming updates
    const validatedUpdates: Partial<RecoveryPolicy> = {};
    if (updates.maxAttempts !== undefined) {
      if (![1, 2, 3].includes(updates.maxAttempts)) throw new Error('Invalid maxAttempts');
      validatedUpdates.maxAttempts = updates.maxAttempts;
    }
    if (updates.cooldownMinutes !== undefined) {
      if (![0, 1, 5, 15].includes(updates.cooldownMinutes)) throw new Error('Invalid cooldownMinutes');
      validatedUpdates.cooldownMinutes = updates.cooldownMinutes;
    }
    if (updates.recoveryWindowHours !== undefined) {
      if (![6, 24, 48].includes(updates.recoveryWindowHours)) throw new Error('Invalid recoveryWindowHours');
      validatedUpdates.recoveryWindowHours = updates.recoveryWindowHours;
    }
    if (updates.escalationThreshold !== undefined) {
      if (![25000, 50000, 100000].includes(updates.escalationThreshold)) throw new Error('Invalid escalationThreshold');
      validatedUpdates.escalationThreshold = updates.escalationThreshold;
    }
    if (updates.enabled !== undefined) {
      validatedUpdates.enabled = Boolean(updates.enabled);
    }
    
    const basePolicy = this.currentPolicy || defaultPolicy;
    this.currentPolicy = { ...basePolicy, ...validatedUpdates, updatedAt: new Date() };
  }

  seed() {
    // 1. Ready Case (Hero - Action Required)
    this.cases['case_aarav_hero'] = {
      id: 'case_aarav_hero',
      status: 'ready',
      type: 'payment_failure',
      amountAtRisk: 12500,
      attemptCount: 0,
      createdAt: new Date(),
      customerHistory: { previousSuccesses: 4, previousFailures: 1 },
      paymentDetails: { failureReason: 'Temporary network timeout' },
      metadata: { scenario: 'HERO_PAYMENT_RECOVERY', customerName: 'Aarav Sharma' },
      policy: defaultPolicy,
      
      recoveryProbability: 0.78,
      expectedRecovery: 9750,
      riskLevel: 'Medium',
      recommendedAction: 'create_recovery_payment',
      diagnosis: 'Temporary Payment Failure',
    };

    // 2. Escalated Case (Policy Escalation)
    this.cases['case_priya_fail'] = {
      id: 'case_priya_fail',
      status: 'escalated',
      type: 'payment_failure',
      amountAtRisk: 84000,
      attemptCount: 0,
      createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      customerHistory: { previousSuccesses: 0, previousFailures: 3 },
      paymentDetails: { failureReason: 'Insufficient funds' },
      metadata: { scenario: 'BOUNDED_RETRY_FAILURE', customerName: 'Priya Kapoor' },
      policy: { ...defaultPolicy, name: 'High Value Strict Policy' },
      
      recoveryProbability: 0.18,
      expectedRecovery: 15120,
      riskLevel: 'Critical',
      recommendedAction: 'manual_review',
      diagnosis: 'Hard Payment Failure',
    };

    // 3. Recovered Case (Successful Recovery)
    this.cases['case_karan_success'] = {
      id: 'case_karan_success',
      status: 'recovered',
      type: 'payment_failure',
      amountAtRisk: 4999,
      attemptCount: 1,
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      customerHistory: { previousSuccesses: 10, previousFailures: 0 },
      paymentDetails: { failureReason: 'Bank server down' },
      metadata: { scenario: 'SUCCESSFUL_RECOVERY', customerName: 'Karan Patel' },
      policy: defaultPolicy,
      
      recoveryProbability: 0.95,
      expectedRecovery: 4749,
      riskLevel: 'Low',
      recommendedAction: 'create_recovery_payment',
      diagnosis: 'Temporary Payment Failure',
      lastActionAt: new Date(Date.now() - 80000000),
    };

    // 4. Stopped Case (Policy Stopping Rule)
    this.cases['case_neha_stopped'] = {
      id: 'case_neha_stopped',
      status: 'stopped',
      type: 'payment_failure',
      amountAtRisk: 1499,
      attemptCount: 2,
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      customerHistory: { previousSuccesses: 2, previousFailures: 2 },
      paymentDetails: { failureReason: 'Card expired' },
      metadata: { scenario: 'MAX_ATTEMPTS_REACHED', customerName: 'Neha Gupta' },
      policy: defaultPolicy,
      
      recoveryProbability: 0.05,
      expectedRecovery: 74,
      riskLevel: 'High',
      recommendedAction: 'stop_recovery',
      diagnosis: 'Hard Payment Failure',
      lastActionAt: new Date(Date.now() - 170000000),
    };

    // 5. Checkout Drop-off -> Pending
    this.cases['case_riya_checkout'] = {
      id: 'case_riya_checkout',
      status: 'ready',
      type: 'checkout_dropoff',
      amountAtRisk: 8500,
      attemptCount: 0,
      createdAt: new Date(Date.now() - 1800000), // 30 mins ago
      customerHistory: { previousSuccesses: 1, previousFailures: 0 },
      metadata: { scenario: 'CHECKOUT_DROPOFF', customerName: 'Riya Mehta' },
      policy: defaultPolicy,
      
      recoveryProbability: 0.65,
      expectedRecovery: 5525,
      riskLevel: 'Low',
      recommendedAction: 'send_checkout_recovery',
      diagnosis: 'Checkout Drop-off',
    };

    // 6. Subscription Failure -> Recovered
    this.cases['case_amit_sub'] = {
      id: 'case_amit_sub',
      status: 'recovered',
      type: 'subscription_failure',
      amountAtRisk: 1999,
      attemptCount: 1,
      createdAt: new Date(Date.now() - 259200000), // 3 days ago
      customerHistory: { previousSuccesses: 12, previousFailures: 1 },
      paymentDetails: { failureReason: 'Network timeout' },
      metadata: { scenario: 'SUBSCRIPTION_RETRY', customerName: 'Amit Singh' },
      policy: defaultPolicy,
      
      recoveryProbability: 0.85,
      expectedRecovery: 1699,
      riskLevel: 'Low',
      recommendedAction: 'retry_subscription',
      diagnosis: 'Subscription Payment Failure',
      lastActionAt: new Date(Date.now() - 250000000),
    };

    // 7. B2B Receivable -> Promise to Pay
    this.cases['case_acme_b2b'] = {
      id: 'case_acme_b2b',
      status: 'recovering', // Awaiting promise fulfillment
      type: 'receivable',
      amountAtRisk: 125000,
      attemptCount: 1,
      createdAt: new Date(Date.now() - 1555200000), // 18 days ago
      customerHistory: { previousSuccesses: 5, previousFailures: 0 },
      metadata: { scenario: 'B2B_RECEIVABLE', customerName: 'Acme Industries' },
      policy: defaultPolicy,
      hasPromiseToPay: true,
      promiseStatus: 'promised',
      
      recoveryProbability: 0.90,
      expectedRecovery: 112500,
      riskLevel: 'Low',
      recommendedAction: 'start_promise_to_pay',
      diagnosis: 'Overdue Receivable',
      lastActionAt: new Date(Date.now() - 86400000),
    };

    const now = Date.now();
    
    // Audits for Hero Case
    this.audits.push({ id: `evt_${now}_1`, caseId: 'case_aarav_hero', eventType: 'RECOVERY_DETECTED', description: 'Recovery opportunity detected for ₹12,500', createdAt: new Date(now - 10000) });
    this.audits.push({ id: `evt_${now}_2`, caseId: 'case_aarav_hero', eventType: 'DIAGNOSIS_COMPLETED', description: 'Diagnosis: Temporary Payment Failure', createdAt: new Date(now - 8000) });
    this.audits.push({ id: `evt_${now}_3`, caseId: 'case_aarav_hero', eventType: 'RECOVERY_SCORED', description: 'Recovery Probability: 78% | Expected Recovery Value: ₹9,750', createdAt: new Date(now - 6000) });
    this.audits.push({ id: `evt_${now}_4`, caseId: 'case_aarav_hero', eventType: 'INTERVENTION_RECOMMENDED', description: 'Recommended Intervention: Create Recovery Payment', createdAt: new Date(now - 4000) });
    this.audits.push({ id: `evt_${now}_4a`, caseId: 'case_aarav_hero', eventType: 'POLICY_APPROVED', description: 'Policy check passed. Action allowed.', createdAt: new Date(now - 2000) });

    // Audits for Priya Case (Escalated)
    this.audits.push({ id: `evt_${now}_5`, caseId: 'case_priya_fail', eventType: 'RECOVERY_DETECTED', description: 'Recovery opportunity detected for ₹84,000', createdAt: new Date(now - 3600000) });
    this.audits.push({ id: `evt_${now}_6`, caseId: 'case_priya_fail', eventType: 'DIAGNOSIS_COMPLETED', description: 'Diagnosis: Hard Payment Failure', createdAt: new Date(now - 3598000) });
    this.audits.push({ id: `evt_${now}_7`, caseId: 'case_priya_fail', eventType: 'RECOVERY_SCORED', description: 'Recovery Probability: 18% | Expected Recovery Value: ₹15,120', createdAt: new Date(now - 3596000) });
    this.audits.push({ id: `evt_${now}_8`, caseId: 'case_priya_fail', eventType: 'INTERVENTION_RECOMMENDED', description: 'Recommended Intervention: Manual Review', createdAt: new Date(now - 3594000) });
    this.audits.push({ id: `evt_${now}_9`, caseId: 'case_priya_fail', eventType: 'POLICY_ESCALATED', description: 'Automation stopped. Amount exceeds escalation threshold.', createdAt: new Date(now - 3592000) });

    // Audits and Actions for Karan (Recovered)
    this.audits.push({ id: `evt_${now}_10`, caseId: 'case_karan_success', eventType: 'RECOVERY_DETECTED', description: 'Recovery opportunity detected for ₹4,999', createdAt: new Date(now - 86400000) });
    this.audits.push({ id: `evt_${now}_11`, caseId: 'case_karan_success', eventType: 'DIAGNOSIS_COMPLETED', description: 'Diagnosis: Temporary Payment Failure', createdAt: new Date(now - 86398000) });
    this.audits.push({ id: `evt_${now}_12`, caseId: 'case_karan_success', eventType: 'RECOVERY_SCORED', description: 'Recovery Probability: 95% | Expected Recovery Value: ₹4,749', createdAt: new Date(now - 86396000) });
    this.audits.push({ id: `evt_${now}_13`, caseId: 'case_karan_success', eventType: 'POLICY_APPROVED', description: 'Policy check passed. Action allowed.', createdAt: new Date(now - 86394000) });
    this.audits.push({ id: `evt_${now}_14`, caseId: 'case_karan_success', eventType: 'ACTION_EXECUTED', description: 'Executed: Create Recovery Payment', createdAt: new Date(now - 86392000) });
    this.audits.push({ id: `evt_${now}_15`, caseId: 'case_karan_success', eventType: 'PAYMENT_RECOVERED', description: 'Payment successful. Recovered ₹4,999.', createdAt: new Date(now - 80000000) });
    this.actions.push({ id: `act_${now}_1`, caseId: 'case_karan_success', type: 'create_recovery_payment', attempt: 1, status: 'succeeded', amountRecovered: 4999, createdAt: new Date(now - 86392000) });

    // Audits and Actions for Neha (Stopped)
    this.audits.push({ id: `evt_${now}_16`, caseId: 'case_neha_stopped', eventType: 'RECOVERY_DETECTED', description: 'Recovery opportunity detected for ₹1,499', createdAt: new Date(now - 172800000) });
    this.audits.push({ id: `evt_${now}_17`, caseId: 'case_neha_stopped', eventType: 'ACTION_EXECUTED', description: 'Executed: Create Recovery Payment (Attempt 1)', createdAt: new Date(now - 172790000) });
    this.audits.push({ id: `evt_${now}_18`, caseId: 'case_neha_stopped', eventType: 'ACTION_FAILED', description: 'Retry failed.', createdAt: new Date(now - 172780000) });
    this.audits.push({ id: `evt_${now}_19`, caseId: 'case_neha_stopped', eventType: 'ACTION_EXECUTED', description: 'Executed: Create Recovery Payment (Attempt 2)', createdAt: new Date(now - 172000000) });
    this.audits.push({ id: `evt_${now}_20`, caseId: 'case_neha_stopped', eventType: 'ACTION_FAILED', description: 'Retry failed.', createdAt: new Date(now - 171990000) });
    this.audits.push({ id: `evt_${now}_21`, caseId: 'case_neha_stopped', eventType: 'RECOVERY_STOPPED', description: 'Automation stopped. Max attempts reached.', createdAt: new Date(now - 171980000) });
    this.actions.push({ id: `act_${now}_2`, caseId: 'case_neha_stopped', type: 'create_recovery_payment', attempt: 1, status: 'failed', amountRecovered: 0, createdAt: new Date(now - 172790000) });
    this.actions.push({ id: `act_${now}_3`, caseId: 'case_neha_stopped', type: 'create_recovery_payment', attempt: 2, status: 'failed', amountRecovered: 0, createdAt: new Date(now - 172000000) });

    // Audits for Checkout Dropoff (Riya)
    this.audits.push({ id: `evt_${now}_22`, caseId: 'case_riya_checkout', eventType: 'RECOVERY_DETECTED', description: 'Checkout drop-off detected for ₹8,500', createdAt: new Date(now - 1800000) });
    this.audits.push({ id: `evt_${now}_23`, caseId: 'case_riya_checkout', eventType: 'DIAGNOSIS_COMPLETED', description: 'Diagnosis: Checkout Drop-off', createdAt: new Date(now - 1790000) });
    this.audits.push({ id: `evt_${now}_24`, caseId: 'case_riya_checkout', eventType: 'INTERVENTION_RECOMMENDED', description: 'Recommended Intervention: Send Checkout Recovery', createdAt: new Date(now - 1780000) });

    // Audits and Actions for Subscription (Amit)
    this.audits.push({ id: `evt_${now}_25`, caseId: 'case_amit_sub', eventType: 'RECOVERY_DETECTED', description: 'Subscription failure detected', createdAt: new Date(now - 259200000) });
    this.audits.push({ id: `evt_${now}_26`, caseId: 'case_amit_sub', eventType: 'ACTION_EXECUTED', description: 'Executed: Retry Subscription', createdAt: new Date(now - 250000000) });
    this.audits.push({ id: `evt_${now}_27`, caseId: 'case_amit_sub', eventType: 'PAYMENT_RECOVERED', description: 'Automated retry successful', createdAt: new Date(now - 249000000) });
    this.actions.push({ id: `act_${now}_4`, caseId: 'case_amit_sub', type: 'retry_subscription', attempt: 1, status: 'succeeded', amountRecovered: 1999, createdAt: new Date(now - 250000000) });

    // Audits and Actions for B2B Receivable (Acme)
    this.audits.push({ id: `evt_${now}_28`, caseId: 'case_acme_b2b', eventType: 'RECOVERY_DETECTED', description: 'Invoice overdue by 18 days', createdAt: new Date(now - 1555200000) });
    this.audits.push({ id: `evt_${now}_29`, caseId: 'case_acme_b2b', eventType: 'INTERVENTION_RECOMMENDED', description: 'Recommended Intervention: Start Promise to Pay', createdAt: new Date(now - 86450000) });
    this.audits.push({ id: `evt_${now}_30`, caseId: 'case_acme_b2b', eventType: 'ACTION_EXECUTED', description: 'Executed: Start Promise to Pay', createdAt: new Date(now - 86400000) });
    this.audits.push({ id: `evt_${now}_31`, caseId: 'case_acme_b2b', eventType: 'PROMISE_TO_PAY_CREATED', description: 'Customer promise to pay recorded.', createdAt: new Date(now - 86390000) });
    this.actions.push({ id: `act_${now}_5`, caseId: 'case_acme_b2b', type: 'start_promise_to_pay', attempt: 1, status: 'succeeded', amountRecovered: 0, createdAt: new Date(now - 86400000) });
  }

  async getCaseContext(caseId: string): Promise<FullCaseContext | null> {
    return this.cases[caseId] || null;
  }

  async saveCaseState(caseId: string, status: CaseStatus, updates: Partial<FullCaseContext>): Promise<void> {
    const c = this.cases[caseId];
    if (c) {
      c.status = status;
      Object.assign(c, updates);
      if (status === 'recovering' || status === 'recovered') {
        c.lastActionAt = new Date();
      }
    }
  }

  async createAction(caseId: string, type: ActionType, attempt: number, policyId?: string): Promise<{ id: string; existing: boolean; }> {
    const existing = this.actions.find(a => a.caseId === caseId && a.type === type && a.attempt === attempt);
    if (existing) {
      return { id: existing.id, existing: true };
    }
    const id = `act_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.actions.push({
      id,
      caseId,
      type,
      attempt,
      policyId,
      status: 'pending',
      amountRecovered: 0,
      createdAt: new Date(),
    });
    return { id, existing: false };
  }

  async saveAudit(caseId: string, eventType: string, description: string, actionId?: string): Promise<void> {
    this.audits.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      caseId,
      eventType,
      description,
      actionId,
      createdAt: new Date(),
    });
  }

  async updateActionOutcome(actionId: string, status: ActionStatus, resultDetails: string, amountRecovered: number): Promise<void> {
    const action = this.actions.find(a => a.id === actionId);
    if (action) {
      action.status = status;
      action.resultDetails = resultDetails;
      action.amountRecovered = amountRecovered;
    }
  }

  // Helper getters for UI
  getActionsForCase(caseId: string) {
    return this.actions.filter(a => a.caseId === caseId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getAuditsForCase(caseId: string) {
    return this.audits.filter(a => a.caseId === caseId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Webhook / Razorpay Idempotency & Helpers
  async hasProcessedEvent(eventId: string): Promise<boolean> {
    return this.processedEventIds.has(eventId);
  }

  async markEventProcessed(eventId: string): Promise<void> {
    this.processedEventIds.add(eventId);
  }

  async upsertPayment(paymentId: string, payload: unknown): Promise<void> {
    this.payments[paymentId] = payload;
  }

  async getCaseByPaymentId(paymentId: string): Promise<FullCaseContext | null> {
    const found = Object.values(this.cases).find(c => c.metadata?.paymentId === paymentId);
    return found || null;
  }

  async createCaseFromPayment(paymentId: string, amountAtRisk: number, failureReason: string, method: string, customerName?: string): Promise<string> {
    const caseId = `case_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.cases[caseId] = {
      id: caseId,
      status: 'detected',
      type: 'payment_failure',
      amountAtRisk,
      attemptCount: 0,
      createdAt: new Date(),
      metadata: { paymentId, customerName: customerName || 'Razorpay Customer' },
      policy: { ...(this.currentPolicy || defaultPolicy) },
      paymentDetails: {
        failureReason,
        method,
      },
      customerHistory: {
        previousSuccesses: 0, // In a real system, look up customer history
        previousFailures: 0,
      },
    };
    return caseId;
  }

  async markRecoveryActionSuccessful(caseId: string, amount: number): Promise<void> {
    // Find the action that initiated this recovery (e.g. create_recovery_payment or retry_payment)
    const action = this.actions.reverse().find(a => a.caseId === caseId && (a.type === 'create_recovery_payment' || (a.type as string) === 'retry_payment' || (a.type as string) === 'Retry Payment'));
    if (action) {
      action.amountRecovered = amount;
      action.status = 'succeeded';
    }
  }
}

// Global Singleton pattern to prevent Next.js from destroying state on HMR or API routes
const globalForDemoRepo = globalThis as unknown as {
  demoRepo: DemoRepository | undefined;
};

export const demoRepo = globalForDemoRepo.demoRepo ?? new DemoRepository();

if (process.env.NODE_ENV !== 'production') {
  globalForDemoRepo.demoRepo = demoRepo;
}
