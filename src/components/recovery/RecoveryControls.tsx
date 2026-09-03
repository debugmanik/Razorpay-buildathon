"use client";

import { useTransition, useState } from "react";
import { executeRecoveryAction } from "@/app/actions/recovery";
import { Button } from "@/components/ui/button";
import { CaseStatus } from "@/types/domain";
import { formatActionName } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { RazorpayRecoveryCheckout } from "@/components/payments/RazorpayRecoveryCheckout";

type Props = {
  caseId: string;
  status: CaseStatus;
  recommendedAction: string;
  metadata?: Record<string, unknown>;
  actualRecovered?: number;
  amountAtRisk: number;
  keyId: string;
  isPolicyExhausted?: boolean;
  decision?: 'ACT' | 'ABSTAIN' | 'ESCALATE';
  decisionReason?: string;
  baselineProb?: number;
  interventionProb?: number;
  expectedNetRecoveryValue?: number;
  policyThreshold?: number;
};

export function RecoveryControls({ 
  caseId, 
  status, 
  recommendedAction, 
  metadata, 
  actualRecovered, 
  amountAtRisk, 
  keyId, 
  isPolicyExhausted,
  decision,
  decisionReason,
  baselineProb,
  interventionProb,
  expectedNetRecoveryValue,
  policyThreshold
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExecute = () => {
    setError(null);
    startTransition(async () => {
      const result = await executeRecoveryAction(caseId);
      if (!result.success && result.error) {
        setError(result.error);
      }
    });
  };

  const isExecuting = isPending;
  const isRecovering = status === 'recovering';
  const hasRecoveryOrder = !!metadata?.recoveryOrderId;

  if (status === 'recovered') {
    return (
      <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200">
        <p className="text-sm font-medium text-emerald-800">Payment Recovered</p>
        <p className="text-sm text-emerald-600 mt-1">Confirmed payment state. Recovered {actualRecovered ? `₹${actualRecovered.toLocaleString('en-IN')}` : 'full amount'}.</p>
      </div>
    );
  }

  if (decision === 'ABSTAIN') {
    return (
      <div className="rounded-md bg-slate-50 p-5 border border-slate-200">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          No Intervention
        </div>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
          {decisionReason || 'The estimated incremental value does not justify intervention cost or customer friction.'}
        </p>
        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-medium">Natural Recovery</span>
            <span className="font-semibold text-slate-800">{Math.round((baselineProb ?? 0.7) * 100)}%</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-medium">With Intervention</span>
            <span className="font-semibold text-slate-800">{Math.round((interventionProb ?? 0.72) * 100)}%</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase font-medium">Expected Net Value</span>
            <span className="font-semibold text-slate-800">₹{(expectedNetRecoveryValue ?? 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'stopped' || isPolicyExhausted) {
    return (
      <div className="rounded-md bg-rose-50 p-5 border border-rose-200">
        <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Recovery Stopped
        </div>
        <p className="text-xs text-rose-600 mt-2 leading-relaxed font-medium">
          Policy guardrails halted further automation. Maximum retry attempts reached.
        </p>
      </div>
    );
  }

  if (decision === 'ESCALATE' || status === 'escalated') {
    return (
      <div className="rounded-md bg-amber-50 p-5 border border-amber-200">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Manual Review Required
        </div>
        <p className="text-xs text-amber-700 mt-2 leading-relaxed font-medium">
          {decisionReason || 'Automation is outside merchant policy for this opportunity.'}
        </p>
        <div className="mt-4 pt-3 border-t border-amber-200 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-amber-700/80 text-[10px] block uppercase font-medium">Amount at Risk</span>
            <span className="font-semibold text-amber-900">₹{amountAtRisk.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-amber-700/80 text-[10px] block uppercase font-medium">Policy Threshold</span>
            <span className="font-semibold text-amber-900">₹{(policyThreshold ?? 50000).toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-amber-700/80 text-[10px] block uppercase font-medium">Decision</span>
            <span className="font-semibold text-amber-900">ESCALATE</span>
          </div>
        </div>
      </div>
    );
  }

  const normalizedAction = recommendedAction;

  const handleIntent = (intent: string) => {
    setError(null);
    startTransition(async () => {
      // Need to import simulateCustomerIntentAction, I'll do it via a separate replace_file_content if missing
      // Actually let's assume it's imported or I will import it in the next step
      const { simulateCustomerIntentAction } = await import('@/app/actions/recovery');
      const result = await simulateCustomerIntentAction(caseId, intent);
      if (!result.success && result.error) {
        setError(result.error);
      }
    });
  };

  if (isRecovering && !hasRecoveryOrder) {
    const lastIntent = metadata?.lastCustomerIntent as string | undefined;
    const isAlreadyPaid = lastIntent === 'ALREADY_PAID';
    const isRemindLater = lastIntent === 'REMIND_LATER';

    let title = normalizedAction === 'hinglish_recovery_message' ? 'Hinglish Recovery' : 'Action Pending Customer';
    let message = normalizedAction === 'hinglish_recovery_message' 
      ? `Namaste ${metadata?.customerName?.toString().split(' ')[0] || 'Customer'}, aapka ₹${amountAtRisk.toLocaleString('en-IN')} ka payment complete nahi ho paya tha. Aap payment abhi complete kar sakte hain.`
      : 'Message/Reminder sent. Awaiting customer response. (Simulation below)';
    let cardClasses = 'bg-indigo-50 border-indigo-200';
    let titleClasses = 'text-indigo-800';
    let messageClasses = 'text-indigo-600';

    if (isAlreadyPaid) {
      title = 'Payment Verification Required';
      message = 'Customer says the payment was already made. Waiting for payment confirmation.';
      cardClasses = 'bg-amber-50/70 border-amber-200';
      titleClasses = 'text-amber-900';
      messageClasses = 'text-amber-800';
    } else if (isRemindLater) {
      title = 'Payment Reminder Scheduled';
      message = 'Customer requested to be reminded later. Follow-up reminder scheduled.';
      cardClasses = 'bg-blue-50/70 border-blue-200';
      titleClasses = 'text-blue-900';
      messageClasses = 'text-blue-800';
    }

    return (
      <div className="space-y-4">
        <div className={`rounded-md p-4 border ${cardClasses}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm font-semibold ${titleClasses}`}>
              {title}
            </p>
            {isAlreadyPaid && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                Verification Pending
              </span>
            )}
          </div>
          <p className={`text-sm ${messageClasses} mb-4`}>
            {message}
          </p>
          <div className="pt-3 border-t border-slate-200/60">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
              Customer Intent:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button 
                onClick={() => handleIntent('PAY_NOW')} 
                variant="default" 
                size="sm" 
                disabled={isPending}
                className="font-medium"
              >
                Pay Now
              </Button>
              <Button 
                onClick={() => handleIntent('REMIND_LATER')} 
                variant={isRemindLater ? "secondary" : "outline"} 
                size="sm" 
                disabled={isPending}
                className="font-medium"
              >
                {isRemindLater ? '✓ Remind Me Later' : 'Remind Me Later'}
              </Button>
              <Button 
                onClick={() => handleIntent('ALREADY_PAID')} 
                variant={isAlreadyPaid ? "secondary" : "outline"} 
                size="sm" 
                disabled={isPending}
                className="font-medium"
              >
                {isAlreadyPaid ? '✓ Already Paid' : 'Already Paid'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isRecovering && hasRecoveryOrder) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-indigo-50 p-4 border border-indigo-200">
          <p className="text-sm font-medium text-indigo-800">Recovery Payment Ready</p>
          <p className="text-sm text-indigo-600 mt-1 mb-3">Customer payment is required to recover ₹{amountAtRisk.toLocaleString('en-IN')}.</p>
          <RazorpayRecoveryCheckout
            orderId={metadata.recoveryOrderId as string}
            amount={amountAtRisk}
            currency="INR"
            keyId={keyId}
            caseId={caseId}
            buttonText={`Pay ₹${amountAtRisk.toLocaleString('en-IN')}`}
            buttonClassName="w-full font-semibold h-11 text-sm sm:text-base bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            containerClassName="w-full"
          />
        </div>
        <p className="text-xs text-center text-slate-500 mt-2">Secure payment powered by Razorpay Test Mode.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-rose-50 p-4 border border-rose-200">
          <p className="text-sm font-medium text-rose-800">Automation Stopped</p>
          <p className="text-sm text-rose-600 mt-1">{error}</p>
        </div>
      )}
      
      <div className="rounded-md bg-emerald-50/70 border border-emerald-200 p-4 mb-2">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Recovery Action Ready
        </div>
        <p className="text-sm font-semibold text-slate-900 mt-1">
          Recommended: {formatActionName(normalizedAction)}
        </p>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          {normalizedAction === 'create_recovery_payment'
            ? `RecoverX will create a Razorpay recovery order for ₹${amountAtRisk.toLocaleString('en-IN')}. The customer completes the payment to recover the full amount.`
            : `RecoverX will execute the policy-approved intervention: ${formatActionName(normalizedAction)}.`}
        </p>
      </div>

      <Button 
        onClick={handleExecute} 
        disabled={isExecuting || isRecovering}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 text-sm sm:text-base shadow-sm"
        size="lg"
      >
        {isExecuting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating payment...
          </>
        ) : isRecovering ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Awaiting action...
          </>
        ) : (
          normalizedAction === 'create_recovery_payment' ? 'Create Recovery Payment' : `Execute: ${formatActionName(normalizedAction)}`
        )}
      </Button>
    </div>
  );
}
