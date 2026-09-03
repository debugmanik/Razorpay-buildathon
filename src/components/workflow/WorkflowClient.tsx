'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatActionName } from "@/lib/format";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, XCircle, AlertCircle, Clock } from "lucide-react";

type CaseWithDetails = {
  id: string;
  type: string;
  status: string;
  amountAtRisk: number;
  metadata?: {
    customerName?: string;
    recoveryOrderId?: string;
  };
  diagnosis?: string;
  expectedRecovery?: number;
  recoveryProbability?: number;
  recommendedAction?: string;
  actions: Array<{ type: string }>;
  audits: Array<{ eventType: string; createdAt: Date | string; description: string }>;
  actualRecovered: number;
};

export function WorkflowClient({ cases, providerLabel }: { cases: CaseWithDetails[], providerLabel: string }) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || '');

  const selectedCase = cases.find(c => c.id === selectedCaseId) || cases[0];

  if (!selectedCase) {
    return <div className="p-8 text-center text-slate-500">No active recovery cases.</div>;
  }

  // Determine node states
  // Nodes: Payment Failed, Detected, Diagnosed, Scored, Policy Checked, Recovery Payment Created, Customer Payment, Recovered
  const workflowNodes = [
    { id: 'failed', label: 'Payment Failed', description: 'Original transaction failed' },
    { id: 'detected', label: 'Detected', description: 'Signal intercepted' },
    { id: 'diagnosed', label: 'Diagnosed', description: 'Root cause identified' },
    { id: 'scored', label: 'Scored', description: 'Recovery probability set' },
    { id: 'policy', label: 'Policy Checked', description: 'Guardrails verified' },
    { id: 'payment_created', label: 'Recovery Payment Created', description: 'Action executed' },
    { id: 'customer_payment', label: 'Customer Payment', description: 'Customer action pending' },
    { id: 'recovered', label: 'Recovered', description: 'Funds captured' }
  ];

  const c = selectedCase;
  
  const getState = (nodeId: string) => {
    const states: Record<string, { isComplete: boolean, isCurrent: boolean, isError: boolean }> = {};
    let stopped = false;
    
    for (const node of workflowNodes) {
      let isComplete = false;
      let isCurrent = false;
      let isError = false;

      if (stopped) {
        states[node.id] = { isComplete: false, isCurrent: false, isError: false };
        continue;
      }

      const hasDetected = c.audits.some(a => a.eventType === 'RECOVERY_DETECTED') || !!c.id;
      const hasDiagnosed = c.audits.some(a => a.eventType === 'DIAGNOSIS_COMPLETED') || c.diagnosis !== undefined;
      const hasScored = c.audits.some(a => a.eventType === 'RECOVERY_SCORED') || c.expectedRecovery !== undefined;
      const hasPolicyChecked = c.audits.some(a => a.eventType === 'POLICY_CHECKED');
      const policyRejected = c.audits.some(a => a.eventType === 'ACTION_BLOCKED');
      const hasOrder = !!c.metadata?.recoveryOrderId;

      if (node.id === 'failed') {
        isComplete = true;
      }
      else if (node.id === 'detected') {
        if (hasDetected) isComplete = true;
        else { isCurrent = true; stopped = true; }
      }
      else if (node.id === 'diagnosed') {
        if (hasDiagnosed) isComplete = true;
        else { isCurrent = true; stopped = true; }
      }
      else if (node.id === 'scored') {
        if (hasScored) isComplete = true;
        else { isCurrent = true; stopped = true; }
      }
      else if (node.id === 'policy') {
        if (hasPolicyChecked) {
          if (policyRejected) { isError = true; stopped = true; }
          else isComplete = true;
        }
        else { isCurrent = true; stopped = true; }
      }
      else if (node.id === 'payment_created') {
        if (hasOrder || c.audits.some(a => a.eventType === 'RECOVERY_PAYMENT_CREATED')) {
          isComplete = true;
        } else {
          isCurrent = true; 
          stopped = true; 
        }
      }
      else if (node.id === 'customer_payment') {
        if (c.status === 'recovered') {
          isComplete = true;
        } else if (hasOrder && c.status === 'recovering') {
          isCurrent = true; 
          stopped = true;
        } else if (c.status === 'failed') {
          isError = true; 
          stopped = true;
        } else {
          stopped = true; // Not reached yet
        }
      }
      else if (node.id === 'recovered') {
        if (c.status === 'recovered') {
          isComplete = true;
        }
      }

      states[node.id] = { isComplete, isCurrent, isError };
    }

    return states[nodeId] || { isComplete: false, isCurrent: false, isError: false };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Workflow Visualization */}
        <Card className="lg:col-span-3 bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Workflow State</CardTitle>
              <CardDescription>Live execution path for {c.id}</CardDescription>
            </div>
            {c.status === 'escalated' && <Badge variant="destructive">Automation Stopped</Badge>}
            {c.status === 'recovered' && <Badge className="bg-emerald-500 hover:bg-emerald-600">Recovered</Badge>}
            {c.status === 'recovering' && <Badge className="bg-amber-500 hover:bg-amber-600">Recovering</Badge>}
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <div className="flex items-start min-w-[800px] justify-between text-center relative px-4">
              {/* Connection lines */}
              <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-100 -z-10" />
              
              {workflowNodes.map((node) => {
                const state = getState(node.id);
                let Icon = Circle;
                let colorClass = "text-slate-300";
                let bgClass = "bg-white";
                
                if (state.isComplete) {
                  Icon = CheckCircle2;
                  colorClass = "text-indigo-600";
                  bgClass = "bg-white";
                } else if (state.isCurrent) {
                  Icon = Clock;
                  colorClass = "text-amber-500";
                } else if (state.isError) {
                  Icon = XCircle;
                  colorClass = "text-rose-500";
                }

                return (
                  <div key={node.id} className="flex flex-col items-center w-28 gap-2 bg-white relative">
                    <div className={`${bgClass} rounded-full`}>
                      <Icon className={`w-10 h-10 ${colorClass}`} strokeWidth={state.isCurrent || state.isError ? 2 : 1.5} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold leading-tight ${state.isComplete || state.isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                        {node.label}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight px-1">
                        {node.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Financial Journey */}
        <Card className="bg-slate-900 text-white shadow-sm border-slate-800">
          <CardHeader className="pb-4 border-b border-slate-800">
            <CardTitle className="text-xl text-white">Financial Impact</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Amount at Risk</p>
              <p className="text-2xl font-bold text-white mt-1">{formatINR(c.amountAtRisk)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Expected Recovery</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-white">{c.expectedRecovery !== undefined ? formatINR(c.expectedRecovery) : '--'}</p>
                <Badge variant="outline" className="text-indigo-300 border-indigo-700 bg-indigo-900/30">
                  {c.recoveryProbability !== undefined ? `${Math.round(c.recoveryProbability * 100)}%` : '--'} PROB
                </Badge>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider">Recovered Revenue</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{formatINR(c.actualRecovered)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision Panel */}
        <Card className="bg-white shadow-sm border-slate-200 lg:col-span-2">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Decision Context</CardTitle>
            <CardDescription>Why RecoverX took this action</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 uppercase">Diagnosis</h4>
                  <p className="text-sm text-slate-600 mt-1">{c.diagnosis || 'Pending...'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 uppercase">Recommended Action</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    {c.recommendedAction 
                      ? formatActionName(c.recommendedAction)
                      : 'Pending...'}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 uppercase">Policy Decision</h4>
                  <p className="text-sm mt-1">
                    {c.audits.some(a => a.eventType === 'ACTION_APPROVED') ? (
                      <span className="text-emerald-700 font-medium">Approved: {c.audits.find(a => a.eventType === 'POLICY_CHECKED')?.description.replace('Action approved by policy: ', '') || 'Passed guardrails'}</span>
                    ) : c.audits.some(a => a.eventType === 'ACTION_BLOCKED') ? (
                      <span className="text-rose-600 font-medium">Rejected: {c.audits.find(a => a.eventType === 'POLICY_CHECKED')?.description}</span>
                    ) : (
                      <span className="text-slate-500 font-medium italic">Pending policy check...</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 flex flex-col justify-center space-y-4">
                {c.status === 'recovering' && c.metadata?.recoveryOrderId ? (
                  <>
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="w-5 h-5" />
                      <h4 className="font-semibold uppercase tracking-wider text-sm">Customer Action Required</h4>
                    </div>
                    <p className="text-sm text-slate-600">Recovery payment has been created. The customer must complete the payment.</p>
                    <Link href={`/recovery/${c.id}/pay`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2 mt-2 w-fit">
                      Open Customer Checkout
                    </Link>
                  </>
                ) : c.status === 'recovered' ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <h4 className="font-semibold uppercase tracking-wider text-sm">Recovery Complete</h4>
                    </div>
                    <p className="text-sm text-slate-600">Automation has successfully captured the funds and stopped further actions.</p>
                  </>
                ) : c.status === 'escalated' ? (
                  <>
                    <div className="flex items-center gap-2 text-rose-600">
                      <XCircle className="w-5 h-5" />
                      <h4 className="font-semibold uppercase tracking-wider text-sm">Escalated</h4>
                    </div>
                    <p className="text-sm text-slate-600">Automation stopped by policy guardrails. Requires manual review.</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 italic">Processing recovery workflow...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Execution History */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle>Execution History</CardTitle>
            <Link href="/audit" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View full Audit Log</Link>
          </CardHeader>
          <CardContent className="pt-6 p-0">
            <div className="px-6 pb-6 max-h-[300px] overflow-y-auto">
              {c.audits.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No events recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {[...c.audits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((audit, idx) => (
                    <div key={idx} className="flex gap-4 text-sm relative">
                      {idx !== c.audits.length - 1 && <div className="absolute left-[7px] top-6 bottom-[-16px] w-[2px] bg-slate-100" />}
                      <div className="w-4 h-4 rounded-full bg-slate-200 border-4 border-white shrink-0 relative z-10 mt-1" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {audit.eventType.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">{new Date(audit.createdAt).toLocaleString()}</p>
                        <p className="text-slate-600 mt-1 leading-relaxed">
                          {audit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Case Explorer */}
      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Recovery Cases</CardTitle>
            <CardDescription>Select a case to view its live recovery workflow</CardDescription>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 uppercase">
            {providerLabel}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Case ID</th>
                <th className="px-6 py-4 font-semibold text-right">Amount at Risk</th>
                <th className="px-6 py-4 font-semibold text-right">Expected</th>
                <th className="px-6 py-4 font-semibold text-center">Probability</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {cases.map((caseItem) => {
                const isSelected = caseItem.id === selectedCaseId;
                return (
                  <tr 
                    key={caseItem.id} 
                    onClick={() => setSelectedCaseId(caseItem.id)}
                    className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{caseItem.metadata?.customerName || 'Unknown'}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{caseItem.id}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium text-right">{formatINR(caseItem.amountAtRisk)}</td>
                    <td className="px-6 py-4 text-slate-900 text-right">{caseItem.expectedRecovery !== undefined ? formatINR(caseItem.expectedRecovery) : '--'}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="font-mono bg-white">
                        {caseItem.recoveryProbability !== undefined ? `${Math.round(caseItem.recoveryProbability * 100)}%` : '--'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {caseItem.status === 'recovered' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none shadow-none uppercase text-[10px] font-bold">RECOVERED</Badge>
                      ) : caseItem.status === 'recovering' ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-none shadow-none uppercase text-[10px] font-bold">RECOVERING</Badge>
                      ) : caseItem.status === 'escalated' ? (
                        <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none shadow-none uppercase text-[10px] font-bold">ESCALATED</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-none shadow-none uppercase text-[10px] font-bold">{caseItem.status}</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/recovery/${caseItem.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center text-sm font-medium transition-colors text-indigo-600 hover:text-indigo-800"
                      >
                        View Details <ArrowRight className="ml-1 w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
