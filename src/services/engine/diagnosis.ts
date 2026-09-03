import { CaseType } from '@/types/domain';

export type DiagnosisContext = {
  caseType: CaseType;
  failureReason?: string | null;
  previousSuccesses: number;
  previousFailures: number;
  paymentMethod?: string | null;
};

export type DiagnosisResult = {
  category: string;
  confidence: number;
  evidence: string[];
};

export function diagnoseCase(context: DiagnosisContext): DiagnosisResult {
  const evidence: string[] = [];
  let category = 'Unknown Issue';
  let confidence = 0.5;

  if (context.caseType === 'payment_failure' || context.caseType === 'subscription_failure') {
    const isTempFailure = 
      context.failureReason?.toLowerCase().includes('network') || 
      context.failureReason?.toLowerCase().includes('timeout') ||
      context.failureReason?.toLowerCase().includes('temporary');

    const isHardFailure = 
      context.failureReason?.toLowerCase().includes('insufficient_funds') ||
      context.failureReason?.toLowerCase().includes('do_not_honor');

    if (context.previousSuccesses > 0) {
      evidence.push(`Customer has ${context.previousSuccesses} previous successful payments`);
    }

    if (context.previousFailures > 0) {
      evidence.push(`Customer has ${context.previousFailures} recent failure(s)`);
    }

    if (isTempFailure) {
      category = 'Temporary Payment Failure';
      evidence.push(`Failure reason resembles a temporary network/bank issue: '${context.failureReason}'`);
      confidence = context.previousFailures === 0 ? 0.85 : 0.65;
    } else if (isHardFailure) {
      category = 'Hard Payment Failure';
      evidence.push(`Failure reason indicates a hard rejection: '${context.failureReason}'`);
      confidence = 0.90;
    } else {
      category = context.caseType === 'subscription_failure' ? 'Subscription Payment Failure' : 'Generic Payment Failure';
      if (context.failureReason) {
        evidence.push(`Failure reason: '${context.failureReason}'`);
      }
      confidence = 0.70;
    }
  } else if (context.caseType === 'checkout_dropoff') {
    category = 'Checkout Drop-off';
    evidence.push('Customer started a checkout session but did not complete it');
    confidence = 0.95;
  } else if (context.caseType === 'receivable') {
    category = 'Overdue Receivable';
    evidence.push('Invoice payment is overdue');
    confidence = 0.95;
  } else if (context.caseType === 'mandate_failure') {
    category = 'Mandate Failure';
    evidence.push(`Mandate execution failed: '${context.failureReason || 'Unknown error'}'`);
    confidence = 0.90;
  }

  return {
    category,
    confidence,
    evidence
  };
}
