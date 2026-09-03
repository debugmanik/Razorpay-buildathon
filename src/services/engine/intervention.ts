import { ActionType, CaseType, RecoveryDecision } from '@/types/domain';

export type InterventionContext = {
  caseType: CaseType;
  recoveryProbability: number;
  expectedRecovery: number;
  diagnosisCategory: string;
  hasPromiseToPay?: boolean;
  amountAtRisk?: number;
  expectedIncrementalRecoveryValue?: number;
  customInterventionCost?: number;
};

export type InterventionResult = {
  action: ActionType;
  reason: string;
  expectedRecovery: number;
  estimatedInterventionCost: number;
  expectedNetRecoveryValue: number;
  decision: RecoveryDecision;
  decisionReason: string;
};

// Deterministic estimated intervention costs (Demo Configuration Assumptions)
export const ESTIMATED_INTERVENTION_COSTS: Record<ActionType | string, number> = {
  create_recovery_payment: 10,
  send_checkout_recovery: 20,
  retry_subscription: 0,
  retry_mandate: 0,
  send_payment_reminder: 5,
  hinglish_recovery_message: 10,
  start_promise_to_pay: 0,
  manual_review: 50,
  stop_recovery: 0,
};

export function selectIntervention(context: InterventionContext): InterventionResult {
  let action: ActionType = 'manual_review';
  let reason = 'Default fallback to manual review due to uncertain context';

  if (context.hasPromiseToPay) {
    action = 'start_promise_to_pay';
    reason = 'Customer has promised to pay; pausing automated reminders';
  } else if (context.recoveryProbability < 0.25 && context.expectedRecovery > 25000) {
    // Low probability with high exposure always gets manual review
    action = 'manual_review';
    reason = 'Low recovery probability combined with high financial exposure requires merchant review.';
  } else if (context.caseType === 'payment_failure') {
    if (context.diagnosisCategory === 'Temporary Payment Failure') {
      if (context.recoveryProbability >= 0.7) {
        action = 'create_recovery_payment';
        reason = 'Temporary failure with high recovery probability. Recovery payment is the highest-value permitted intervention.';
      } else if (context.recoveryProbability >= 0.4) {
        action = 'create_recovery_payment';
        reason = 'Medium probability of recovery; recommending standard retry.';
      } else {
        action = 'send_payment_reminder';
        reason = 'Low probability of recovery on current method; sending payment reminder.';
      }
    } else if (context.diagnosisCategory === 'Hard Payment Failure') {
      if (context.recoveryProbability >= 0.5) {
        action = 'send_payment_reminder';
        reason = 'Hard failure detected but customer is recoverable; recommending alternate payment reminder.';
      } else {
        action = 'manual_review';
        reason = 'Hard failure with low recovery probability; recommending manual review.';
      }
    } else {
      action = 'create_recovery_payment';
      reason = 'Generic failure; attempting standard recovery payment creation.';
    }
  } else if (context.caseType === 'subscription_failure') {
    action = 'retry_subscription';
    reason = 'Subscription payment failed; recommending automated retry.';
  } else if (context.caseType === 'checkout_dropoff') {
    action = 'send_checkout_recovery';
    reason = 'Checkout abandoned; recommending recovery link.';
  } else if (context.caseType === 'receivable') {
    if (context.recoveryProbability >= 0.7) {
      action = 'send_payment_reminder';
      reason = 'Invoice is overdue with high probability; sending reminder.';
    } else if (context.recoveryProbability >= 0.4) {
      action = 'start_promise_to_pay';
      reason = 'Moderate probability on overdue invoice; initiating promise to pay.';
    } else {
      action = 'manual_review';
      reason = 'Low probability on overdue invoice; recommending manual review.';
    }
  } else if (context.caseType === 'mandate_failure') {
    action = 'retry_mandate';
    reason = 'Mandate execution failed; scheduling mandate retry sequence.';
  }

  // Cost and Net Recovery Calculation
  const estimatedInterventionCost = context.customInterventionCost ?? (ESTIMATED_INTERVENTION_COSTS[action] ?? 0);
  const incrementalValue = context.expectedIncrementalRecoveryValue !== undefined 
    ? context.expectedIncrementalRecoveryValue 
    : context.expectedRecovery;
  
  const expectedNetRecoveryValue = Math.round((incrementalValue - estimatedInterventionCost) * 100) / 100;

  let decision: RecoveryDecision = 'ACT';
  let decisionReason = 'Estimated incremental recovery value exceeds intervention cost and remains within merchant policy.';

  if (action === 'manual_review') {
    decision = 'ESCALATE';
    decisionReason = reason;
  } else if (expectedNetRecoveryValue <= 0) {
    decision = 'ABSTAIN';
    decisionReason = 'The estimated incremental recovery value does not justify the intervention cost.';
  }

  return {
    action,
    reason,
    expectedRecovery: context.expectedRecovery,
    estimatedInterventionCost,
    expectedNetRecoveryValue,
    decision,
    decisionReason,
  };
}
