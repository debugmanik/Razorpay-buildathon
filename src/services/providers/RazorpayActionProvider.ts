import { ActionContext, ActionResult } from './SimulationActionProvider';
import { RazorpayClient } from './razorpay/client';

export class RazorpayActionProvider {
  private client: RazorpayClient;

  constructor() {
    this.client = new RazorpayClient();
  }

  async execute(context: ActionContext): Promise<ActionResult> {
    if (context.actionType === 'manual_review') {
      return {
        status: 'succeeded',
        resultDetails: 'Escalation ticket created successfully. Awaiting merchant intervention.',
        amountRecovered: 0,
        requiresCustomerAction: false,
      };
    }

    if (context.actionType === 'create_recovery_payment') {
      try {
        // Create a new Razorpay order for the customer to pay against.
        // RecoverX amount is currently stored in INR; Razorpay requires Paise.
        const amountInPaise = Math.round(context.amount * 100);
        
        const orderResponse = await this.client.createOrder(amountInPaise, 'INR');
        
        // Return succeeded (meaning the ORDER was created successfully), but requiresCustomerAction is true
        // so the Engine leaves the case in recovering rather than marking it as recovered.
        return {
          status: 'succeeded',
          resultDetails: orderResponse.id,
          amountRecovered: 0,
          requiresCustomerAction: true,
        };
      } catch (error) {
        return {
          status: 'failed',
          resultDetails: `Failed to create Razorpay recovery order: ${error instanceof Error ? error.message : String(error)}`,
          amountRecovered: 0,
        };
      }
    }

    // Return unsupported for programmatic retries, forcing the system to rely on webhooks for recovery.
    return {
      status: 'failed',
      resultDetails: `Unsupported automated action for Razorpay Provider: ${context.actionType}. Recovery relies on customer-initiated checkout/retry workflows tracked via Webhooks.`,
      amountRecovered: 0,
    };
  }
}
