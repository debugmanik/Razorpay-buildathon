import { RecoveryPolicy, CaseStatus, ActionType } from '@/types/domain';

export type PolicyContext = {
  policy?: RecoveryPolicy | null;
  currentAttemptCount: number;
  caseStatus: CaseStatus;
  lastActionAt?: Date | null;
  caseCreatedAt: Date;
  amountAtRisk: number;
  action: ActionType;
  hasPromiseToPay?: boolean;
};

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
  stop: boolean;
  escalate: boolean;
};

export function evaluatePolicy(context: PolicyContext): PolicyDecision {
  // Guard against completed states
  if (context.caseStatus === 'recovered') {
    return {
      allowed: false,
      reason: 'Case is already recovered. No further action permitted.',
      stop: true,
      escalate: false,
    };
  }

  if (context.caseStatus === 'stopped' || context.caseStatus === 'escalated') {
    return {
      allowed: false,
      reason: `Case is currently ${context.caseStatus}. No further automated action permitted.`,
      stop: true,
      escalate: false,
    };
  }

  if (context.hasPromiseToPay) {
    if (context.action !== 'start_promise_to_pay') {
      return {
        allowed: false,
        reason: 'Customer has an active promise-to-pay. Automated actions paused.',
        stop: true,
        escalate: false,
      };
    }
  }

  if (!context.policy) {
    return {
      allowed: false,
      reason: 'No applicable policy found for this case. Automation blocked.',
      stop: true,
      escalate: true,
    };
  }

  const { policy } = context;

  if (!policy.enabled) {
    return {
      allowed: false,
      reason: 'Policy is disabled.',
      stop: true,
      escalate: true, // Typically escalate if a policy is manually disabled but a case needs attention
    };
  }

  // Attempt Limits
  if (context.currentAttemptCount >= policy.maxAttempts) {
    return {
      allowed: false,
      reason: `Maximum attempts (${policy.maxAttempts}) reached.`,
      stop: true,
      escalate: true,
    };
  }

  // Recovery Window
  const now = new Date();
  const windowEnd = new Date(context.caseCreatedAt.getTime() + policy.recoveryWindowHours * 60 * 60 * 1000);
  if (now > windowEnd) {
    return {
      allowed: false,
      reason: `Recovery window of ${policy.recoveryWindowHours} hours has expired.`,
      stop: true,
      escalate: true,
    };
  }

  // Cooldown Period
  if (context.lastActionAt) {
    const cooldownEnd = new Date(context.lastActionAt.getTime() + policy.cooldownMinutes * 60 * 1000);
    if (now < cooldownEnd) {
      return {
        allowed: false,
        reason: `Cooldown period of ${policy.cooldownMinutes} minutes has not elapsed.`,
        stop: false, // Don't stop, just blocked for now
        escalate: false,
      };
    }
  }

  // Escalation Threshold
  if (context.amountAtRisk >= policy.escalationThreshold) {
    return {
      allowed: false,
      reason: `Amount at risk (₹${context.amountAtRisk}) exceeds automated escalation threshold (₹${policy.escalationThreshold}).`,
      stop: true,
      escalate: true,
    };
  }

  return {
    allowed: true,
    reason: 'Policy allows this action.',
    stop: false,
    escalate: false,
  };
}
