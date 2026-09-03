import { 
  getRecoveryImpactMetrics, 
  getRecoveryTrend, 
  getInterventionPerformance, 
  getFailureReasonPerformance,
  getBoundedAutonomyMetrics,
  getRecoveryOutcomes,
  getRecoveryFunnel,
  TimeFilter as TimeFilterType
} from "@/services/data/analytics";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { RecoveryTrendChart, OutcomeDistributionChart } from "@/components/analytics/Charts";
import { TimeFilter } from "@/components/analytics/TimeFilter";
import { getProviderConfig } from "@/services/providers/config";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function AnalyticsPage(props: Props) {
  const searchParams = await props.searchParams;
  let days: TimeFilterType = 'all';
  if (searchParams?.days === '7') days = 7;
  if (searchParams?.days === '30') days = 30;

  const impact = getRecoveryImpactMetrics(days);
  const trend = getRecoveryTrend(days);
  const interventions = getInterventionPerformance(days);
  const failures = getFailureReasonPerformance(days);
  const autonomy = getBoundedAutonomyMetrics(days);
  const outcomes = getRecoveryOutcomes(days);
  const funnel = getRecoveryFunnel(days);
  const providerConfig = getProviderConfig();

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Revenue Recovery</h2>
          <p className="text-sm text-slate-500 mt-1">
            Prove the financial impact and effectiveness of the recovery process.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className={`text-amber-600 border-amber-200 bg-amber-50 uppercase text-[10px]`}>
            {providerConfig.label}
          </Badge>
          <TimeFilter />
        </div>
      </div>

      {/* Hero Financial Statement */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wider mb-1">Total Recovered Revenue</h3>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-emerald-700">{formatINR(impact.recoveredRevenue)}</span>
            <span className="text-sm font-medium text-emerald-600">
              from {formatINR(impact.historicalAtRisk)} at risk
            </span>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Revenue at Risk</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(impact.revenueAtRisk)}</p>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            Total amount associated with failed recovery opportunities.
          </p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected Recovery</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(impact.expectedRecovery)}</p>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            Sum of expected recovery values based on each case&apos;s recovery probability.
          </p>
        </div>
        <div className="bg-white border border-emerald-200 shadow-sm rounded-lg p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Recovered Revenue</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(impact.recoveredRevenue)}</p>
          </div>
          <p className="text-xs text-emerald-700/70 mt-4 leading-relaxed">
            ONLY revenue from cases confirmed recovered through successful capture.
          </p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recovery Rate</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{Math.round(impact.recoveryRate * 100)}%</p>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            Recovered Revenue divided by Expected Recovery.
          </p>
        </div>
      </div>

      {/* Recovery Funnel */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Recovery Funnel</h3>
          <p className="text-sm text-slate-500">Step-by-step conversion of failed payments into recovered revenue</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 justify-between items-center text-center">
          <div className="flex-1 w-full p-2">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Failed Payments</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{funnel.failedPayments}</p>
          </div>
          <div className="text-slate-300 hidden md:block">→</div>
          <div className="flex-1 w-full p-2">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Opportunities</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{funnel.opportunities}</p>
          </div>
          <div className="text-slate-300 hidden md:block">→</div>
          <div className="flex-1 w-full p-2">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Policy Approved</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{funnel.policyApproved}</p>
          </div>
          <div className="text-slate-300 hidden md:block">→</div>
          <div className="flex-1 w-full p-2">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Payment Created</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{funnel.paymentCreated}</p>
          </div>
          <div className="text-slate-300 hidden md:block">→</div>
          <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-md p-4 w-full">
            <p className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">Recovered</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{funnel.recovered}</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Trend */}
        <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Expected vs Actual</h3>
            <p className="text-sm text-slate-500">Comparing RecoverX&apos;s expected recovery against actual recovered revenue</p>
          </div>
          <RecoveryTrendChart data={trend} />
        </div>

        {/* Outcomes */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Recovery Outcomes</h3>
            <p className="text-sm text-slate-500">Distribution of cases by state</p>
          </div>
          <div className="flex-1 min-h-[250px]">
             <OutcomeDistributionChart data={outcomes} />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Intervention Performance */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Action Performance</h3>
            <p className="text-sm text-slate-500">Which automated actions recover the most money</p>
          </div>
          <div className="flex-1 overflow-auto">
            {interventions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Not enough recovery data yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-3 font-semibold">Action</th>
                    <th className="px-6 py-3 font-semibold text-right">Recovered</th>
                    <th className="px-6 py-3 font-semibold text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {interventions.map((inv, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{inv.intervention}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600 text-right">{formatINR(inv.recovered)}</td>
                      <td className="px-6 py-4 text-slate-600 text-right">{Math.round(inv.successRate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Failure Reason Performance */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Diagnosis Performance</h3>
            <p className="text-sm text-slate-500">Where the biggest recovery opportunities exist</p>
          </div>
          <div className="flex-1 overflow-auto">
            {failures.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Not enough recovery data yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-3 font-semibold">Diagnosis</th>
                    <th className="px-6 py-3 font-semibold text-right">At Risk</th>
                    <th className="px-6 py-3 font-semibold text-right">Expected</th>
                    <th className="px-6 py-3 font-semibold text-right">Recovered</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {failures.map((f, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{f.category}</td>
                      <td className="px-6 py-4 text-slate-600 text-right">{formatINR(f.amountAtRisk)}</td>
                      <td className="px-6 py-4 font-medium text-slate-900 text-right">{formatINR(f.expectedRecovery)}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600 text-right">{formatINR(f.recoveredRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Bounded Autonomy Metrics */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">Bounded Autonomy & Safety</h3>
          <p className="text-sm text-slate-500">Automation enforces strict limits on customer intervention</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-100 rounded-md p-4 bg-slate-50">
            <p className="text-sm text-slate-500 font-medium">Automated Recoveries</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{autonomy.automatedRecoveries}</p>
          </div>
          <div className="border border-slate-100 rounded-md p-4 bg-slate-50">
            <p className="text-sm text-slate-500 font-medium">Stopped by Policy</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{autonomy.stoppedByPolicy}</p>
          </div>
          <div className="border border-slate-100 rounded-md p-4 bg-slate-50">
            <p className="text-sm text-slate-500 font-medium">Escalations</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{autonomy.escalations}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
