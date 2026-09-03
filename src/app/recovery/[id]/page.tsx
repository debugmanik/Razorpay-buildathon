import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  formatINR, 
  formatActionName, 
  formatCaseType, 
  formatAuditDescription, 
  formatAuditEventType 
} from "@/lib/format";
import { demoRepo } from "@/services/data/demoRepository";
import { RecoveryControls } from "@/components/recovery/RecoveryControls";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RecoveryCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const caseCtx = await demoRepo.getCaseContext(id);
  if (!caseCtx) {
    notFound();
  }

  const audits = demoRepo.getAuditsForCase(id);
  const actions = demoRepo.getActionsForCase(id);

  // Calculate actual recovered from actions
  const actualRecovered = actions.reduce((sum, a) => sum + (a.amountRecovered || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link 
            href="/recovery" 
            className="p-1.5 -ml-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Back to Recovery Queue"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recovery Decision</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                caseCtx.status === 'recovered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                caseCtx.status === 'stopped' || caseCtx.status === 'escalated' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                caseCtx.status === 'recovering' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {caseCtx.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm">
              <span className="text-slate-500 font-mono text-xs uppercase tracking-wider">{id}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700 font-medium">{(caseCtx.metadata?.customerName as string) || 'Unknown Customer'}</span>
              {caseCtx.type && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 text-xs">{formatCaseType(caseCtx.type)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center shrink-0">
          <Badge variant="outline" className={`font-mono text-xs ${caseCtx.metadata?.paymentId ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
            {caseCtx.metadata?.paymentId ? 'RAZORPAY TEST MODE' : 'SIMULATION'}
          </Badge>
        </div>
      </div>

      {/* Recovery Workflow Progress Pipeline */}
      <Card className="bg-slate-50/60 border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5 overflow-x-auto">
          <div className="min-w-[680px] flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {['Payment Failed', 'Detected', 'Diagnosed', 'Scored', 'Policy Checked', 'Recovery Payment', 'Customer Payment', 'Recovered'].map((step, idx, arr) => {
              let isComplete = false;
              let isCurrent = false;
              
              if (idx === 0) isComplete = true;
              if (idx === 1) isComplete = true; // Detected
              if (idx === 2) isComplete = caseCtx.diagnosis !== undefined || caseCtx.status !== 'analyzing';
              if (idx === 3) isComplete = caseCtx.recoveryProbability !== undefined || caseCtx.status !== 'analyzing';
              if (idx === 4) isComplete = actions.length > 0 || caseCtx.status === 'stopped' || caseCtx.status === 'escalated';
              if (idx === 5) {
                isComplete = !!caseCtx.metadata?.recoveryOrderId || caseCtx.status === 'recovered';
                if (caseCtx.status === 'recovering' && !caseCtx.metadata?.recoveryOrderId) isCurrent = true;
              }
              if (idx === 6) {
                isComplete = caseCtx.status === 'recovered';
                if (caseCtx.status === 'recovering' && caseCtx.metadata?.recoveryOrderId) isCurrent = true;
              }
              if (idx === 7) isComplete = caseCtx.status === 'recovered';

              if (!isComplete && !isCurrent && idx > 0) {
                const prevComplete = idx === 1 ? true : (
                  idx === 2 ? true :
                  idx === 3 ? (caseCtx.diagnosis !== undefined || caseCtx.status !== 'analyzing') :
                  idx === 4 ? (caseCtx.recoveryProbability !== undefined || caseCtx.status !== 'analyzing') :
                  idx === 5 ? (actions.length > 0 || caseCtx.status === 'stopped' || caseCtx.status === 'escalated') :
                  idx === 6 ? !!caseCtx.metadata?.recoveryOrderId :
                  idx === 7 ? (caseCtx.status === 'recovered') : false
                );
                if (prevComplete && caseCtx.status !== 'stopped' && caseCtx.status !== 'escalated') isCurrent = true;
              }

              return (
                <div key={step} className="flex flex-col items-center flex-1 relative">
                  <div className={`w-3 h-3 rounded-full z-10 mb-1.5 border-2 ${
                    isComplete ? 'bg-indigo-600 border-indigo-600' : 
                    isCurrent ? 'bg-white border-indigo-600 ring-2 ring-indigo-100' : 
                    'bg-slate-200 border-slate-200'
                  }`} />
                  <span className={`text-center text-[10px] sm:text-[11px] font-semibold ${isComplete || isCurrent ? 'text-indigo-950' : 'text-slate-400'}`}>
                    {step}
                  </span>
                  {idx < arr.length - 1 && (
                    <div className={`absolute top-1.5 left-1/2 w-full h-0.5 -z-0 ${isComplete ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two-Column Operational Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
             {/* LEFT / MAIN COLUMN: Case Details, Decision Context & Action Controls */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
          
          {/* 1. HERO KPI SUMMARY */}
          {(() => {
            const baselineProb = caseCtx.estimatedBaselineRecoveryProbability ?? caseCtx.baselineRecoveryProbability ?? 0.20;
            const interventionProb = caseCtx.recoveryProbability ?? 0.50;
            const incrementalLift = caseCtx.incrementalLift ?? Math.round((interventionProb - baselineProb) * 100) / 100;
            const expectedRecoveryValue = caseCtx.expectedRecovery ?? Math.round(caseCtx.amountAtRisk * interventionProb);
            const expectedIncrementalRecoveryValue = caseCtx.expectedIncrementalRecoveryValue ?? Math.round(caseCtx.amountAtRisk * incrementalLift);
            const estimatedCost = caseCtx.estimatedInterventionCost ?? 10;
            const expectedNetRecoveryValue = caseCtx.expectedNetRecoveryValue ?? (expectedIncrementalRecoveryValue - estimatedCost);
            const decision = caseCtx.decision ?? (caseCtx.status === 'escalated' ? 'ESCALATE' : expectedNetRecoveryValue <= 0 ? 'ABSTAIN' : 'ACT');
            const decisionReason = caseCtx.decisionReason ?? (
              decision === 'ACT' 
                ? 'Estimated incremental recovery value exceeds intervention cost and remains within merchant policy.' 
                : decision === 'ABSTAIN' 
                ? 'The estimated incremental recovery value does not justify the intervention cost.' 
                : 'Policy escalation threshold reached.'
            );

            return (
              <>
                <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-lg">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Amount at Risk</p>
                      <div className="text-xl font-bold text-slate-900">{formatINR(caseCtx.amountAtRisk)}</div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estimated Lift</p>
                      <div className="text-base font-bold text-slate-900">
                        {Math.round(baselineProb * 100)}% → {Math.round(interventionProb * 100)}%
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700">+{Math.round(incrementalLift * 100)}pp est. lift</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Expected Net Value</p>
                      <div className="text-xl font-bold text-indigo-600">
                        {formatINR(expectedNetRecoveryValue)}
                      </div>
                      <span className="text-[10px] text-slate-400">Cost: ₹{estimatedCost}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Decision</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                          decision === 'ACT' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          decision === 'ABSTAIN' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                          'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {decision}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 capitalize font-medium mt-0.5 block">{caseCtx.status}</span>
                    </div>
                  </div>
                </div>

                {/* 2. EXECUTE RECOVERY / PAYMENT SECTION (Immediate Visibility) */}
                {caseCtx.status === 'recovered' ? (
                  /* PAYMENT RECOVERED STATE */
                  <Card className="border-emerald-200 bg-emerald-50/60 overflow-hidden shadow-sm">
                    <div className="bg-emerald-600 p-5 text-white text-center">
                      <h3 className="font-bold tracking-wider uppercase text-xs mb-1 opacity-90">Payment Recovered</h3>
                      <div className="text-3xl sm:text-4xl font-extrabold">{formatINR(actualRecovered || caseCtx.amountAtRisk)}</div>
                      <p className="text-xs sm:text-sm mt-1 opacity-90">Recovery payment completed successfully. Funds captured.</p>
                    </div>
                    <CardContent className="p-5 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-800 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Customer payment completed
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-800 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Razorpay payment captured
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-800 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Recovery confirmed by webhook
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-800 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Revenue recorded in ledger
                        </div>
                      </div>

                      <div className="bg-white rounded-md border border-emerald-100 p-4 shadow-2xs">
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between border-b border-emerald-50 pb-1.5">
                            <dt className="text-slate-500 text-xs">Original payment</dt>
                            <dd className="font-medium text-rose-600 text-xs">Failed</dd>
                          </div>
                          <div className="flex justify-between border-b border-emerald-50 pb-1.5">
                            <dt className="text-slate-500 text-xs">Recovery payment</dt>
                            <dd className="font-medium text-emerald-600 text-xs">Captured</dd>
                          </div>
                          <div className="flex justify-between pt-1">
                            <dt className="text-slate-700 font-medium text-xs">Revenue recovered</dt>
                            <dd className="font-bold text-emerald-700 text-sm">{formatINR(actualRecovered || caseCtx.amountAtRisk)}</dd>
                          </div>
                        </dl>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                      <CardTitle className="text-base font-bold text-slate-900">Execute Recovery</CardTitle>
                      <CardDescription className="text-xs">
                        Policy-approved automated intervention workflow.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5">
                      <RecoveryControls 
                        caseId={id} 
                        status={caseCtx.status} 
                        recommendedAction={caseCtx.recommendedAction || 'None'} 
                        metadata={caseCtx.metadata}
                        actualRecovered={actualRecovered}
                        amountAtRisk={caseCtx.amountAtRisk}
                        keyId={process.env.RAZORPAY_KEY_ID || ''}
                        isPolicyExhausted={caseCtx.policy ? caseCtx.attemptCount >= caseCtx.policy.maxAttempts : false}
                        decision={decision}
                        decisionReason={decisionReason}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* 3. RECOVERY RATIONALE & DIAGNOSIS */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
                  <h3 className="text-base font-semibold text-slate-900 mb-3">Recovery Rationale</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    The original revenue opportunity was {formatINR(caseCtx.amountAtRisk)}. Natural recovery probability is estimated at {Math.round(baselineProb * 100)}%. RecoverX estimates an intervention recovery probability of {Math.round(interventionProb * 100)}% (+{Math.round(incrementalLift * 100)}pp estimated lift), yielding an Expected Incremental Recovery Value of <strong className="text-slate-900">{formatINR(expectedIncrementalRecoveryValue)}</strong> and Expected Net Recovery Value of <strong className="text-emerald-700">{formatINR(expectedNetRecoveryValue)}</strong> after ₹{estimatedCost} estimated intervention cost.
                  </p>
                  <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Root Cause Diagnosis</span>
                      <p className="text-sm font-medium text-slate-900">{caseCtx.diagnosis || 'Automated assessment pending'}</p>
                    </div>
                    {caseCtx.paymentDetails?.failureReason && (
                      <div className="sm:text-right">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Failure Signal</span>
                        <p className="text-xs italic text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                          &quot;{caseCtx.paymentDetails.failureReason}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. OPERATIONAL DECISION TRACE */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Operational Decision Trace</h3>
                      <p className="text-xs text-slate-500">Rigorous financial evaluation before automated execution.</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${
                      decision === 'ACT' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                      decision === 'ABSTAIN' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                      'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      Decision: {decision}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Amount at Risk</dt>
                      <dd className="font-semibold text-slate-900 text-xs">{formatINR(caseCtx.amountAtRisk)}</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Estimated Natural Recovery Probability</dt>
                      <dd className="font-semibold text-slate-700 text-xs">{Math.round(baselineProb * 100)}%</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Estimated Recovery Probability with Intervention</dt>
                      <dd className="font-semibold text-slate-900 text-xs">{Math.round(interventionProb * 100)}%</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Estimated Incremental Lift</dt>
                      <dd className="font-bold text-emerald-700 text-xs">+{Math.round(incrementalLift * 100)}pp</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Expected Recovery Value</dt>
                      <dd className="font-semibold text-slate-700 text-xs">{formatINR(expectedRecoveryValue)}</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Expected Incremental Recovery Value</dt>
                      <dd className="font-bold text-slate-900 text-xs">{formatINR(expectedIncrementalRecoveryValue)}</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Estimated Intervention Cost</dt>
                      <dd className="font-medium text-slate-600 text-xs">₹{estimatedCost}</dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs font-semibold">Expected Net Recovery Value</dt>
                      <dd className={`font-bold text-xs ${expectedNetRecoveryValue > 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {formatINR(expectedNetRecoveryValue)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Recommended Intervention</dt>
                      <dd className="font-semibold text-slate-900 text-xs">
                        {caseCtx.recommendedAction ? formatActionName(caseCtx.recommendedAction) : 'None'}
                      </dd>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <dt className="text-slate-500 text-xs">Policy Engine Check</dt>
                      <dd className="text-xs font-semibold">
                        {caseCtx.status === 'stopped' || caseCtx.status === 'escalated' ? (
                          <span className="text-rose-600">Blocked / Escalated</span>
                        ) : (
                          <span className="text-emerald-600">Approved</span>
                        )}
                      </dd>
                    </div>
                    <div className="sm:col-span-2 pt-2 bg-slate-50 p-3 rounded border border-slate-200">
                      <dt className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Decision Rationale</dt>
                      <dd className="text-xs font-medium text-slate-800 leading-relaxed">
                        {decisionReason}
                      </dd>
                    </div>
                  </dl>
                </div>
              </>
            );
          })()}
        </div>

        {/* RIGHT / SECONDARY COLUMN: Compact Operational Audit Trail */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 min-w-0">
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden sticky top-6">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Audit Trail</CardTitle>
                <CardDescription className="text-[11px] text-slate-500">Traceable decision history</CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-[10px] bg-slate-200/70 text-slate-700">
                {audits.length} Events
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {audits.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No audit records for this case.</p>
              ) : (
                <div className="max-h-[640px] overflow-y-auto pr-1 space-y-3 relative before:absolute before:inset-0 before:left-2 before:h-full before:w-0.5 before:bg-slate-200">
                  {audits.map((audit) => (
                    <div key={audit.id} className="relative flex items-start group pl-6">
                      <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full border-2 border-white bg-slate-400 shrink-0 z-10" />
                      <div className="w-full p-2.5 rounded-md border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-slate-900 leading-tight">
                            {formatAuditEventType(audit.eventType)}
                          </span>
                          <time className="text-[10px] font-mono text-slate-400 shrink-0">
                            {audit.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </time>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">
                          {formatAuditDescription(audit.description)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
