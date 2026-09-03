"use server";

import { RecoveryEngine } from '@/services/engine/core';
import { demoRepo } from '@/services/data/demoRepository';
import { getProvider } from '@/services/providers/factory';
import { revalidatePath } from 'next/cache';

export async function executeRecoveryAction(caseId: string) {
  try {
    // Validate case exists
    const caseCtx = await demoRepo.getCaseContext(caseId);
    if (!caseCtx) {
      return { success: false, error: `Case ${caseId} not found.` };
    }

    // Resolve engine
    const actionProvider = getProvider();
    const engine = new RecoveryEngine(demoRepo, actionProvider);

    // Execute exact bounded step
    await engine.processNextBoundedAction(caseId);

    // Revalidate paths to update UI
    revalidatePath(`/recovery/${caseId}`);
    revalidatePath('/'); // Refresh dashboard metrics

    return { success: true };
  } catch (error: unknown) {
    // Return structured error instead of exposing raw stack traces
    const msg = error instanceof Error ? error.message : 'An unexpected error occurred during execution.';
    return { success: false, error: msg };
  }
}

export async function simulateCustomerIntentAction(caseId: string, intent: string) {
  try {
    const caseCtx = await demoRepo.getCaseContext(caseId);
    if (!caseCtx) {
      return { success: false, error: `Case ${caseId} not found.` };
    }

    // DUPLICATE INTENT PROTECTION:
    // If the same customer intent is selected repeatedly without any state change:
    // - do NOT create duplicate audit events
    // - do NOT create repeated ACTION_PENDING_CUSTOMER events
    const lastIntent = caseCtx.metadata?.lastCustomerIntent as string | undefined;
    if (lastIntent === intent) {
      return { success: true, message: 'Intent already recorded' };
    }

    const intentLabelMap: Record<string, string> = {
      'ALREADY_PAID': 'Already Paid',
      'REMIND_LATER': 'Remind Me Later',
      'PAY_NOW': 'Pay Now'
    };
    const intentLabel = intentLabelMap[intent] || intent;

    // Record the customer intent once
    await demoRepo.saveAudit(caseId, 'CUSTOMER_INTENT_RECEIVED', `Customer responded: ${intentLabel}`);

    if (intent === 'PAY_NOW') {
      let recoveryOrderId = `order_${Date.now()}_sim`;
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        try {
          const { RazorpayClient } = await import('@/services/providers/razorpay/client');
          const client = new RazorpayClient();
          const amountInPaise = Math.round(caseCtx.amountAtRisk * 100);
          const order = await client.createOrder(amountInPaise, 'INR');
          if (order && order.id) {
            recoveryOrderId = order.id;
          }
        } catch (err) {
          console.error('Failed to create Razorpay order for PAY_NOW intent:', err);
        }
      }
      await demoRepo.saveCaseState(caseId, 'recovering', {
        metadata: { 
          ...caseCtx.metadata, 
          recoveryOrderId,
          lastCustomerIntent: intent,
          intentStatus: 'recovery_payment_ready'
        }
      });
      await demoRepo.saveAudit(caseId, 'RECOVERY_PAYMENT_CREATED', 'Generated recovery payment link based on customer intent.');
    } else if (intent === 'ALREADY_PAID') {
      // Transition UI to a clear verification state:
      // Title: "Payment Verification Required"
      // Message: "Customer says the payment was already made. Waiting for payment confirmation."
      // Do NOT continue showing "Action Pending Customer".
      // Financial integrity: NEVER marks the case as recovered, does not increase recovered revenue.
      const updatedMetadata = { ...caseCtx.metadata };
      delete updatedMetadata.recoveryOrderId;
      updatedMetadata.lastCustomerIntent = intent;
      updatedMetadata.intentStatus = 'payment_verification_required';

      await demoRepo.saveCaseState(caseId, 'recovering', {
        metadata: updatedMetadata
      });
      await demoRepo.saveAudit(caseId, 'PAYMENT_VERIFICATION_REQUIRED', 'Customer says the payment was already made. Waiting for payment confirmation.');
    } else if (intent === 'REMIND_LATER') {
      const updatedMetadata = { ...caseCtx.metadata };
      delete updatedMetadata.recoveryOrderId;
      updatedMetadata.lastCustomerIntent = intent;
      updatedMetadata.intentStatus = 'remind_later';

      await demoRepo.saveCaseState(caseId, 'recovering', {
        metadata: updatedMetadata
      });
      await demoRepo.saveAudit(caseId, 'ACTION_PENDING_CUSTOMER', 'Customer requested payment reminder. Follow-up scheduled.');
    } else {
      const updatedMetadata = { ...caseCtx.metadata };
      updatedMetadata.lastCustomerIntent = intent;
      updatedMetadata.intentStatus = intent.toLowerCase();

      await demoRepo.saveCaseState(caseId, 'recovering', {
        metadata: updatedMetadata
      });
      await demoRepo.saveAudit(caseId, 'ACTION_PENDING_CUSTOMER', 'Awaiting further action or manual review.');
    }

    revalidatePath(`/recovery/${caseId}`);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process intent';
    return { success: false, error: msg };
  }
}

export async function completeRecoveryPaymentAction(caseId: string, amount: number, paymentId?: string) {
  try {
    const caseCtx = await demoRepo.getCaseContext(caseId);
    if (!caseCtx) {
      return { success: false, error: `Case ${caseId} not found.` };
    }

    const effectivePaymentId = paymentId || `pay_${Date.now()}_sim`;
    await demoRepo.saveCaseState(caseId, 'recovered', { 
      expectedRecovery: caseCtx.expectedRecovery,
      lastActionAt: new Date(),
      metadata: {
        ...caseCtx.metadata,
        paymentId: effectivePaymentId,
        recoveredAt: new Date().toISOString(),
      }
    });
    await demoRepo.markRecoveryActionSuccessful(caseId, amount);
    await demoRepo.saveAudit(caseId, 'RAZORPAY_PAYMENT_CAPTURED', `Recovery payment captured for ₹${amount.toLocaleString('en-IN')} (Ref: ${effectivePaymentId})`);
    await demoRepo.saveAudit(caseId, 'RECOVERY_COMPLETED', `Successfully recovered ₹${amount.toLocaleString('en-IN')}`);

    revalidatePath(`/recovery/${caseId}`);
    revalidatePath('/recovery');
    revalidatePath('/analytics');
    revalidatePath('/');
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to confirm payment' };
  }
}

