import { ActionType, CaseType } from '@/types/domain';

export type InterventionContext = {
  caseType: CaseType;
  recoveryProbability: number;
  expectedRecovery: number;
  diagnosisCategory: string;
  hasPromiseToPay?: boolean;
};

export type InterventionResult = {
  action: ActionType;
  reason: string;
  expectedRecovery: number;
};

export function selectIntervention(context: InterventionContext): InterventionResult {
  let action: ActionType = 'manual_review';
  let reason = 'Default fallback to manual review due to uncertain context';

  if (context.hasPromiseToPay) {
    action = 'start_promise_to_pay';
    reason = 'Customer has promised to pay; pausing automated reminders';
    return { action, reason, expectedRecovery: context.expectedRecovery };
  }

  // Low probability with high exposure always gets manual review
  if (context.recoveryProbability < 0.25 && context.expectedRecovery > 25000) {
    action = 'manual_review';
    reason = 'Low recovery probability combined with high financial exposure requires merchant review.';
    return { action, reason, expectedRecovery: context.expectedRecovery };
  }

  if (context.caseType === 'payment_failure') {
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

  return {
    action,
    reason,
    expectedRecovery: context.expectedRecovery,
  };
}
