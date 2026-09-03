import { ActionType, ActionStatus } from '@/types/domain';

export type ActionContext = {
  caseId: string;
  actionType: ActionType;
  attemptNumber: number;
  amount: number;
  metadata?: {
    scenario?: string;
    [key: string]: unknown;
  };
};

export type ActionResult = {
  status: ActionStatus;
  resultDetails: string;
  amountRecovered: number;
  requiresCustomerAction?: boolean;
};

export class SimulationActionProvider {
  async execute(context: ActionContext): Promise<ActionResult> {
    const scenario = context.metadata?.scenario || 'DEFAULT';

    if (scenario === 'HERO_PAYMENT_RECOVERY') {
      return {
        status: 'succeeded',
        resultDetails: 'Payment successfully captured via simulation.',
        amountRecovered: context.amount,
        requiresCustomerAction: false,
      };
    }

    if (scenario === 'BOUNDED_RETRY_FAILURE') {
      return {
        status: 'failed',
        resultDetails: 'Bank returned insufficient_funds or timeout during simulation.',
        amountRecovered: 0,
      };
    }

    // Default fallback simulation behavior
    if (context.actionType === 'manual_review') {
      return {
        status: 'succeeded',
        resultDetails: 'Escalation ticket created successfully.',
        amountRecovered: 0, // Escalate doesn't instantly recover
        requiresCustomerAction: false,
      };
    }

    // A generic predictable failure mechanism for tests
    if (context.attemptNumber >= 3) {
      return {
        status: 'failed',
        resultDetails: 'Simulated failure for attempt >= 3.',
        amountRecovered: 0,
      };
    }

    return {
      status: 'succeeded',
      resultDetails: 'Simulated generic success.',
      amountRecovered: context.amount,
      requiresCustomerAction: false,
    };
  }
}
