'use client';

import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/format';
import { RecoveryPolicy } from '@/types/domain';
import { updateMerchantPolicyAction } from '@/app/actions/demo';

type Props = {
  initialPolicy: RecoveryPolicy;
};

export function PolicyEditor({ initialPolicy }: Props) {
  const [policy, setPolicy] = useState<RecoveryPolicy>(initialPolicy);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = () => {
    setSaveStatus('saving');
    startTransition(async () => {
      try {
        const result = await updateMerchantPolicyAction(policy);
        if (result.success) {
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
          setSaveStatus('error');
          setErrorMessage(result.error || 'Failed to update policy');
        }
      } catch (err) {
        setSaveStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Policy Form */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recovery Policy</h3>
          <button
            onClick={handleSave}
            disabled={isPending || saveStatus === 'saving'}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Policy'}
          </button>
        </div>
        {saveStatus === 'error' && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {errorMessage}
          </div>
        )}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  {policy.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  Merchant policy constrains what RecoverX is allowed to automate.
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                {policy.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Maximum Attempts</label>
                  <select 
                    value={policy.maxAttempts}
                    onChange={(e) => setPolicy({ ...policy, maxAttempts: parseInt(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={1}>1 Attempt</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-2">
                    The engine will halt automation after <strong className="text-slate-700">{policy.maxAttempts}</strong> unsuccessful interventions.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Action Cooldown</label>
                  <select 
                    value={policy.cooldownMinutes}
                    onChange={(e) => setPolicy({ ...policy, cooldownMinutes: parseInt(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={0}>0 minutes (No cooldown)</option>
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-2">
                    A mandatory <strong className="text-slate-700">{policy.cooldownMinutes} minute</strong> waiting period between consecutive actions.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Recovery Window</label>
                  <select 
                    value={policy.recoveryWindowHours}
                    onChange={(e) => setPolicy({ ...policy, recoveryWindowHours: parseInt(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={6}>6 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-2">
                    Cases older than <strong className="text-slate-700">{policy.recoveryWindowHours} hours</strong> automatically expire.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Escalation Threshold</label>
                  <select 
                    value={policy.escalationThreshold}
                    onChange={(e) => setPolicy({ ...policy, escalationThreshold: parseInt(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={25000}>{formatINR(25000)}</option>
                    <option value={50000}>{formatINR(50000)}</option>
                    <option value={100000}>{formatINR(100000)}</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-2">
                    Any case with an amount at risk exceeding <strong className="text-amber-700">{formatINR(policy.escalationThreshold)}</strong> is immediately escalated for manual review.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Policy Safety Preview */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-slate-900">Policy Safety Preview</h3>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-slate-900">₹12,500 + 78% probability</p>
                </div>
                {12500 >= policy.escalationThreshold ? (
                   <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">Manual review</Badge>
                ) : (
                   <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">Recovery payment allowed</Badge>
                )}
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-slate-900">{formatINR(policy.escalationThreshold + 10000)} amount at risk</p>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">Manual review</Badge>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-slate-900">{policy.maxAttempts} unsuccessful attempts</p>
                </div>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium">Automation stopped</Badge>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-medium text-slate-900">Cooldown not elapsed</p>
                </div>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium">Action blocked</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
