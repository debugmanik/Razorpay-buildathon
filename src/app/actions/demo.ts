'use server';

import { demoRepo } from '@/services/data/demoRepository';
import { RecoveryEngine } from '@/services/engine/core';
import { getProvider } from '@/services/providers/factory';
import { revalidatePath } from 'next/cache';

export async function resetDemoData() {
  
  // Allow resetting local demo data even when Razorpay test mode is active
  // so the user can repeatedly test the end-to-end Razorpay flow.

  try {
    demoRepo.reset();
    
    // Revalidate all major routes to reflect fresh state
    revalidatePath('/', 'page');
    revalidatePath('/recovery', 'page');
    revalidatePath('/analytics', 'page');
    revalidatePath('/audit', 'page');
    // Also revalidate layout to clear all child routes including dynamic ones
    revalidatePath('/', 'layout');
    
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to reset demo data' };
  }
}

export async function simulateFailedPaymentAction(amount: number) {
  return simulateRevenueEventAction({ type: 'payment_failure', amount });
}

export async function simulateRevenueEventAction(params: { type: string, amount: number }) {
  try {
    const paymentId = `evt_${Date.now()}_sim`;
    let failureReason = 'Insufficient funds (Simulated)';
    const method = 'card';
    let customerName = 'Demo Customer';
    
    if (params.type === 'checkout_dropoff') {
      failureReason = 'Session expired';
      customerName = 'Checkout Shopper';
    } else if (params.type === 'subscription_failure') {
      failureReason = 'Network timeout';
      customerName = 'Subscribed Member';
    } else if (params.type === 'receivable') {
      failureReason = 'Invoice Overdue';
      customerName = 'B2B Client';
    } else if (params.type === 'mandate_failure') {
      failureReason = 'Mandate limit exceeded';
      customerName = 'Recurring Payer';
    }
    
    const caseId = `case_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    demoRepo.cases[caseId] = {
      id: caseId,
      status: 'detected',
      type: params.type as import('@/types/domain').CaseType,
      amountAtRisk: params.amount,
      attemptCount: 0,
      createdAt: new Date(),
      metadata: { paymentId, customerName, scenario: 'SIMULATED_EVENT' },
      policy: { ...(demoRepo.currentPolicy || demoRepo.currentPolicy) },
      paymentDetails: {
        failureReason,
        method,
      },
      customerHistory: {
        previousSuccesses: 1,
        previousFailures: 0,
      },
    };
    
    const engine = new RecoveryEngine(demoRepo, getProvider());
    await engine.processNextBoundedAction(caseId);
    
    revalidatePath('/', 'page');
    revalidatePath('/recovery', 'page');
    
    return { success: true, caseId };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to simulate event' };
  }
}

import { RecoveryPolicy } from '@/types/domain';

export async function updateMerchantPolicyAction(updates: Partial<RecoveryPolicy>) {
  try {
    demoRepo.updatePolicy(updates);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update policy' };
  }
}
