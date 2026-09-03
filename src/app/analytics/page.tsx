import { 
  getRecoveryImpactMetrics, 
  getRecoveryTrend, 
  getInterventionPerformance, 
  getOpportunityTypeEconomics,
  getBatchOutcomeQuality,
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
import { ShieldAlert, TrendingUp, DollarSign, HelpCircle } from "lucide-react";

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
  const opportunityEconomics = getOpportunityTypeEconomics(days);
  const batchQuality = getBatchOutcomeQuality(days);
  const autonomy = getBoundedAutonomyMetrics(days);
  const outcomes = getRecoveryOutcomes(days);
  const funnel = getRecoveryFunnel(days);
  const providerConfig = getProviderConfig();

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Economic Decisioning & Recovery Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">
            Evaluate baseline natural recovery, expected incremental lift, intervention costs, and confirmed recovered revenue.
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
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Actual Recovered Revenue</h3>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-emerald-700">{formatINR(impact.recoveredRevenue)}</span>
            <span className="text-sm font-medium text-emerald-600">
              verified captured funds from {formatINR(impact.historicalAtRisk)} total revenue at risk
            </span>
          </div>
          <p className="text-xs text-emerald-700/80 mt-1.5">
            Strict financial accounting: only confirmed captured payments are recognized as recovered revenue.
          </p>
        </div>
        <div className="text-left md:text-right">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Decision Mix</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-white text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
              ACT: {impact.decisionMix.act}
            </span>
            <span className="text-xs bg-white text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-300">
              ABSTAIN: {impact.decisionMix.abstain}
            </span>
            <span className="text-xs bg-white text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">
              ESCALATE: {impact.decisionMix.escalate}
            </span>
          </div>
        </div>
      </div>

      {/* Core Economics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Revenue at Risk</p>
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{formatINR(impact.revenueAtRisk)}</p>
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed border-t border-slate-100 pt-2">
            Active unrecovered revenue opportunities across all cohorts.
          </p>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimated Natural Recovery</p>
              <HelpCircle className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-700 mt-2">{formatINR(impact.baselineExpectedRecovery)}</p>
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed border-t border-slate-100 pt-2">
            Control baseline: estimated revenue recovered without taking intervention.
          </p>
        </div>

        <div className="bg-white border border-indigo-200 shadow-sm rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Expected Incremental Lift</p>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-600 mt-2">{formatINR(impact.expectedIncrementalRecoveryValue)}</p>
          </div>
          <p className="text-xs text-indigo-700/70 mt-3 leading-relaxed border-t border-indigo-100 pt-2">
            Decisioning estimate: value generated above the natural recovery baseline.
          </p>
        </div>

        <div className="bg-white border border-emerald-200 shadow-sm rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Expected Net Recovery</p>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-2">{formatINR(impact.expectedNetRecoveryValue)}</p>
          </div>
          <p className="text-xs text-emerald-700/70 mt-3 leading-relaxed border-t border-emerald-100 pt-2">
            Incremental recovery minus ₹{impact.estimatedInterventionCost} estimated intervention costs.
          </p>
        </div>
      </div>

      {/* Control Baseline Explanation Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
          Economic Decisioning Logic — Control Baseline vs Intervention
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          RecoverX distinguishes between <strong>gross recovery</strong> and <strong>incremental recovery</strong>. Many customers naturally retry or resolve payments on their own without automated reminders. If RecoverX did nothing, estimated natural recovery would be <strong className="text-slate-900">{formatINR(impact.baselineExpectedRecovery)}</strong>. With policy-approved interventions, gross recovery is estimated at <strong className="text-slate-900">{formatINR(impact.expectedRecovery)}</strong>, providing <strong className="text-indigo-700">{formatINR(impact.expectedIncrementalRecoveryValue)}</strong> in Expected Incremental Recovery Value. When incremental lift does not justify intervention costs, RecoverX <strong>abstains</strong> to eliminate customer spam and gateway overhead.
        </p>
      </div>

      {/* Opportunity Type Economics Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Batch Performance by Opportunity Type</h3>
            <p className="text-xs text-slate-500">Economic breakdown across payment, subscription, drop-off, and receivable flows.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Cohort: {days === 'all' ? 'All Time' : `Last ${days} Days`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-5 py-3 font-semibold">Opportunity Type</th>
                <th className="px-5 py-3 font-semibold text-center">Cases</th>
                <th className="px-5 py-3 font-semibold text-right">Revenue at Risk</th>
                <th className="px-5 py-3 font-semibold text-right">Baseline Natural</th>
                <th className="px-5 py-3 font-semibold text-right">With Action</th>
                <th className="px-5 py-3 font-semibold text-right text-indigo-700">Expected Incremental</th>
                <th className="px-5 py-3 font-semibold text-right text-emerald-700">Actual Recovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {opportunityEconomics.map((row) => (
                <tr key={row.type} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{row.typeName}</td>
                  <td className="px-5 py-3.5 text-center text-slate-600">{row.count}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-900">{formatINR(row.amountAtRisk)}</td>
                  <td className="px-5 py-3.5 text-right text-slate-600">{formatINR(row.baselineEstimate)}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-800">{formatINR(row.withActionEstimate)}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-indigo-600">{formatINR(row.incrementalRecovery)}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-emerald-700">
                    {row.actualRecovered > 0 ? formatINR(row.actualRecovered) : '₹0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Outcome Quality & Action Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Batch Outcome Quality */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Batch Outcome Quality</h3>
            <p className="text-xs text-slate-500">Distribution of cases across operational states.</p>
          </div>
          <div className="p-5 space-y-3.5">
            {batchQuality.map((item) => (
              <div key={item.status} className="flex items-center justify-between p-3 rounded border border-slate-100 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.status}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                      {item.count} cases
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                </div>
                <span className="text-xs font-bold text-slate-900">{formatINR(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Intervention Performance */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Intervention Performance</h3>
            <p className="text-xs text-slate-500">Revenue recovered and execution efficiency by intervention type.</p>
          </div>
          <div className="flex-1 overflow-auto">
            {interventions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">Not enough recovery data yet.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="px-5 py-3 font-semibold">Intervention</th>
                    <th className="px-5 py-3 font-semibold text-right">Recovered</th>
                    <th className="px-5 py-3 font-semibold text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {interventions.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-medium text-slate-900">{inv.intervention}</td>
                      <td className="px-5 py-3 font-bold text-emerald-600 text-right">{formatINR(inv.recovered)}</td>
                      <td className="px-5 py-3 text-slate-600 text-right">{Math.round(inv.successRate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Recovery Funnel */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900">Recovery Pipeline Funnel</h3>
          <p className="text-xs text-slate-500">Step-by-step conversion of revenue risk into confirmed recovered revenue</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 justify-between items-center text-center">
          <div className="flex-1 w-full p-2">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Revenue Events</p>
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
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Executed</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{funnel.executed}</p>
          </div>
          <div className="text-slate-300 hidden md:block">→</div>
          <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-md p-4 w-full">
            <p className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">Recovered</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{funnel.recovered}</p>
          </div>
        </div>
      </div>

      {/* Trend & Outcomes Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Expected vs Actual Recovery</h3>
            <p className="text-xs text-slate-500">Comparing gross expected recovery against confirmed captured payments.</p>
          </div>
          <RecoveryTrendChart data={trend} />
        </div>

        <div className="col-span-1 bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Outcome Distribution</h3>
            <p className="text-xs text-slate-500">Cases grouped by current status</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            <OutcomeDistributionChart data={outcomes} />
          </div>
        </div>
      </div>

      {/* Bounded Autonomy Metrics */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">Bounded Autonomy & Policy Enforcement</h3>
          <p className="text-xs text-slate-500">Automated recovery strictly adheres to merchant policy thresholds and retry limits.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-100 rounded-md p-4 bg-slate-50">
            <p className="text-xs text-slate-500 font-medium">Automated Recoveries</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{autonomy.automatedRecoveries}</p>
          </div>
          <div className="border border-slate-100 rounded-md p-4 bg-slate-50">
            <p className="text-xs text-slate-500 font-medium">Stopped by Policy</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{autonomy.stoppedByPolicy}</p>
          </div>
          <div className="border border-slate-100 rounded-md p-4 bg-slate-50">
            <p className="text-xs text-slate-500 font-medium">Escalations</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{autonomy.escalations}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
