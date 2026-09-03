import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR } from "@/lib/format";
import { RecoveryTrendChart } from "@/components/charts/RecoveryTrendChart";
import { Button } from "@/components/ui/button";
import { SimulateEventDialog } from "@/components/payments/SimulateEventDialog";
import {
  getDashboardMetrics,
  getRecoveryTrend,
  getPriorityCases,
  getRecentRecoveryActivity,
  getFunnelData
} from "@/services/data/dashboard";
import { getProviderConfig } from "@/services/providers/config";
import Link from "next/link";
import { TrendingUp, ShieldAlert, Activity, CheckCircle2, AlertCircle, ArrowRight, ChevronRight, CheckCircle, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const trendData = await getRecoveryTrend();
  const priorityCases = await getPriorityCases();
  const recentActivity = await getRecentRecoveryActivity();
  const funnel = await getFunnelData();
  const providerConfig = getProviderConfig();

  // Find a case requiring action for Section 4
  const actionRequiredCase = priorityCases.find(c => 
    c.status === 'ready' || c.status === 'recovering' || c.status === 'escalated'
  );

  return (
    <div className="flex-1 space-y-8 p-8 pt-10 pb-24 max-w-7xl mx-auto w-full">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h2>
          <p className="text-slate-500 mt-1 max-w-2xl text-sm">Monitor revenue at risk and active recovery operations.</p>
        </div>
        <div className="flex items-center">
          <Badge variant="outline" className={`ml-auto ${providerConfig.provider === 'razorpay' ? 'text-indigo-600 border-indigo-200 bg-indigo-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
            {providerConfig.provider === 'razorpay' ? 'RAZORPAY TEST MODE' : 'SIMULATION'}
          </Badge>
        </div>
      </div>

      {/* SECTION 1 — FINANCIAL SUMMARY */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Revenue at Risk</CardTitle>
            <ShieldAlert className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {metrics.revenueAtRisk === 0 ? (
              <div className="text-2xl font-bold text-slate-900">₹0</div>
            ) : (
              <div className="text-2xl font-bold text-slate-900">{formatINR(metrics.revenueAtRisk, true)}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Expected Recovery Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {metrics.expectedRecovery === 0 ? (
              <div className="text-2xl font-bold text-slate-900">₹0</div>
            ) : (
              <div className="text-2xl font-bold text-slate-900">{formatINR(metrics.expectedRecovery, true)}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Recovered Revenue</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {metrics.recoveredRevenue === 0 ? (
              <div className="text-xl font-medium text-slate-900">₹0</div>
            ) : (
              <div className="text-2xl font-bold text-emerald-700">{formatINR(metrics.recoveredRevenue, true)}</div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Cases</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{metrics.activeCases}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="md:col-span-2 space-y-8">
          
          {/* SECTION 4 — CURRENT ACTION REQUIRED */}
          {actionRequiredCase && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-md border border-amber-200 bg-amber-50/50">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {actionRequiredCase.status === 'ready' ? `Recovery Action Ready · ${actionRequiredCase.customerName}` :
                     actionRequiredCase.status === 'recovering' ? `Customer Action Required · ${actionRequiredCase.customerName}` :
                     actionRequiredCase.status === 'stopped' ? `Recovery Stopped · ${actionRequiredCase.customerName}` :
                     `Manual Review Required · ${actionRequiredCase.customerName}`}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {actionRequiredCase.status === 'ready' ? `RecoverX has selected an approved recovery action for ${actionRequiredCase.customerName}.` :
                     actionRequiredCase.status === 'recovering' ? 'Recovery is waiting for the customer to complete payment.' :
                     actionRequiredCase.status === 'stopped' ? 'Automation was stopped by merchant policy.' :
                     `${actionRequiredCase.customerName} requires merchant review before recovery can continue.`}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <Link href={`/recovery/${actionRequiredCase.id}`}>
                  <Button size="sm" variant="outline" className="w-full md:w-auto bg-white">
                    Review Case →
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* SECTION 2 — LIVE RECOVERY STATUS (PIPELINE) */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recovery Pipeline</h3>
              <p className="text-sm text-slate-500">Real-time flow of revenue-risk opportunities.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              {[
                { label: 'Revenue Events', val: funnel.failedPayments },
                { label: 'Opportunities Detected', val: funnel.opportunities, link: '/recovery' },
                { label: 'Diagnosed', val: funnel.diagnosed },
                { label: 'Intervention Selected', val: funnel.interventionSelected },
                { label: 'Policy Approved', val: funnel.policyApproved },
                { label: 'Recovery Executed', val: funnel.executed, link: '/recovery' },
                { label: 'Recovered', val: funnel.recovered, link: '/recovery' }
              ].map((step, i, arr) => (
                <div key={step.label} className="flex flex-col items-center text-center p-3 relative group">
                  <p className="text-2xl font-semibold text-slate-900">{step.val}</p>
                  <p className="text-[10px] uppercase tracking-wider font-medium text-slate-500 mt-2">{step.label}</p>
                  {step.link && (
                    <Link href={step.link} className="absolute inset-0 z-10" aria-label={`View ${step.label}`}>
                      <span className="sr-only">View</span>
                    </Link>
                  )}
                  {i < arr.length - 1 && (
                    <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 absolute -right-3 top-1/2 -translate-y-1/2 z-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3 — PRIORITY RECOVERY OPPORTUNITIES */}
          <div className="space-y-4">
            <div className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Priority Recovery Opportunities</h3>
                <p className="text-sm text-slate-500">Actionable cases sorted by highest expected recovery value.</p>
              </div>
              <Link href="/recovery">
                <Button variant="outline" size="sm" className="bg-white">View All <ArrowRight className="ml-2 w-3 h-3" /></Button>
              </Link>
            </div>
            
            {priorityCases.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p>No recovery opportunities right now.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {priorityCases.slice(0, 5).map((c) => (
                  <Link href={`/recovery/${c.id}`} key={c.id} className="block group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between rounded-md border border-slate-200 bg-white p-4 group-hover:border-slate-300 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div className="flex flex-col justify-center">
                          <p className="text-sm font-semibold text-slate-900">{c.customerName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{c.issue}</p>
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 w-8">Risk:</span>
                            <span className="text-sm font-medium text-slate-900">{formatINR(c.amount)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium text-slate-500 w-8">Prob:</span>
                            <span className="text-xs font-medium text-slate-700">{Math.round(c.probability * 100)}%</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center md:items-end">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Expected</p>
                          <p className="text-sm font-semibold text-emerald-700 mb-2">{formatINR(c.expectedRecovery)}</p>
                          <div className="flex items-center gap-1.5">
                            {c.status === 'recovered' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Recovered</span>
                              </>
                            ) : (
                              <>
                                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'ready' ? 'bg-indigo-500' : c.status === 'recovering' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{c.status}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* SECTION 6 — RECOVERY PERFORMANCE */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Recovery Performance</CardTitle>
              <CardDescription>Risk vs Expected vs Recovered over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.every(d => d.revenueAtRisk === 0 && d.recovered === 0) ? (
                <div className="text-center py-10 text-slate-500">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p>Not enough recovery data yet.</p>
                </div>
              ) : (
                <div className="h-[250px]">
                  <RecoveryTrendChart data={trendData} />
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* SECTION 5 — RECENT RECOVERY ACTIVITY */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest system and merchant actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <p className="text-sm">No recovery activity yet.</p>
                </div>
              ) : (
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {recentActivity.map((evt) => (
                      <div key={evt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 -translate-x-1/2 z-10" />
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] ml-6 md:ml-0 p-3 rounded border border-slate-100 bg-white shadow-sm transition hover:border-slate-300">
                          <Link href={`/recovery/${evt.caseId}`} className="block">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold uppercase text-slate-400">{evt.time}</span>
                            </div>
                            <h4 className="text-xs font-semibold text-slate-900">{evt.description.replace(/_/g, ' ')}</h4>
                            {evt.subtext && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{evt.subtext}</p>}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* SECTION 8 — TEST & VERIFY (DEMO SUPPORT) */}
          <Card className="border-indigo-200 shadow-sm">
            <CardHeader className="bg-indigo-50/50 pb-4 border-b border-indigo-100">
              <CardTitle className="text-sm text-indigo-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-600" />
                Simulate Revenue Event
              </CardTitle>
              <CardDescription className="text-xs text-indigo-700/70 mt-1">
                Simulate a revenue-risk event and watch RecoverX detect, decide, and recover.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <SimulateEventDialog triggerText="Simulate Revenue Event →" />
            </CardContent>
          </Card>

          {/* SECTION 7 — WHERE RECOVERX FITS */}
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                Where RecoverX fits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Razorpay</h4>
                <p className="text-xs text-slate-600 mt-1">Processes and confirms payments.</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">RecoverX</h4>
                <p className="text-xs text-slate-600 mt-1">Identifies recovery opportunities, applies recovery policy, creates recovery payments, and tracks confirmed recovered revenue.</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
