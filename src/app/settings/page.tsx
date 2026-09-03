import { Badge } from '@/components/ui/badge';
import { defaultPolicy, demoRepo } from '@/services/data/demoRepository';
import { Card, CardContent } from '@/components/ui/card';
import { Server, Webhook, Key, Database, PlayCircle, ShieldCheck } from 'lucide-react';
import { getProviderConfig } from '@/services/providers/config';
import { getDashboardMetrics } from '@/services/data/dashboard';
import { DemoControls } from '@/components/settings/DemoControls';
import { PolicyEditor } from '@/components/settings/PolicyEditor';

export default async function SettingsPage() {
  const policy = demoRepo.currentPolicy || defaultPolicy;
  const config = getProviderConfig();
  const metrics = await getDashboardMetrics();
  
  const totalCases = Object.keys(demoRepo.cases).length;
  
  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl mx-auto w-full">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Merchant Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Control center for revenue recovery, policies, and demo configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Policies & Previews (Takes up more space) */}
        <div className="lg:col-span-2 space-y-6">
          
          <PolicyEditor initialPolicy={policy} />
          
          <section>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Recovery Strategy</h3>
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-0">
                <div className="divide-y">
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">Primary Recovery Action</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">Create Recovery Payment</span>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">Automated</Badge>
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">Fallback</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">Manual Review</span>
                    </div>
                    <Badge variant="secondary" className="font-medium">Policy controlled</Badge>
                  </div>
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-200 p-4 text-sm text-slate-600">
                RecoverX selects the safest available recovery action based on merchant policy and payment context.
              </div>
            </Card>
          </section>

        </div>

        {/* RIGHT COLUMN: Environment & Demo Controls */}
        <div className="space-y-6">
          
          <section>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Environment</h3>
            <Card className="shadow-sm border-amber-200 bg-amber-50/30">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-amber-700 font-medium">
                  <Key className="w-5 h-5" />
                  {config.isSimulation ? 'SIMULATION MODE' : 'RAZORPAY TEST MODE'}
                </div>
                <p className="text-sm text-slate-700">
                  {config.isSimulation 
                    ? 'Payments are entirely simulated. No external requests are made.'
                    : 'Payments use Razorpay test credentials. No real money is charged.'
                  }
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Current System Status</h3>
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-0">
                <div className="divide-y text-sm">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Server className="w-4 h-4 text-emerald-600" />
                      Recovery Engine
                    </div>
                    <span className="font-medium text-emerald-700">Operational</span>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Webhook className="w-4 h-4 text-emerald-600" />
                      Webhook Processing
                    </div>
                    <span className="font-medium text-emerald-700">Operational</span>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Idempotency Protection
                    </div>
                    <span className="font-medium text-emerald-700">Enabled</span>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Database className="w-4 h-4 text-indigo-600" />
                      Demo Data
                    </div>
                    <span className="font-medium text-indigo-700">{metrics.activeCases} Active / {totalCases} Total Cases</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <h3 className="text-lg font-semibold mb-4 mt-6 text-slate-900">Demo Controls</h3>
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <PlayCircle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600">
                    Resetting will clear all accumulated data and restore the initial seeded state. Useful for restarting the hackathon demo.
                  </p>
                </div>
                <DemoControls />
              </CardContent>
            </Card>
          </section>



        </div>
      </div>
    </div>
  );
}
