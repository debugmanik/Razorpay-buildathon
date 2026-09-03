import { getQueueData } from "@/services/data/queue";
import { RecoveryQueueTable } from "@/components/recovery/RecoveryQueueTable";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { getProviderConfig } from "@/services/providers/config";

export const dynamic = "force-dynamic";

export default async function RecoveryQueuePage() {
  const { cases, metrics } = await getQueueData();
  const providerConfig = getProviderConfig();

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Revenue Recovery Queue</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Prioritize revenue-risk opportunities by expected recoverable value.
          </p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Revenue at Risk</p>
            <p className="text-lg font-semibold text-slate-900">{formatINR(metrics.revenueAtRisk, true)}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active</p>
            <p className="text-lg font-semibold text-slate-900">{metrics.activeCases}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Expected</p>
            <p className="text-lg font-bold text-emerald-600">{formatINR(metrics.expectedRecovery, true)}</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recovered</p>
            <p className="text-lg font-semibold text-slate-900">{formatINR(metrics.recoveredRevenue || 0, true)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500 max-w-3xl">
          Opportunities are prioritized by expected recoverable value.
        </p>
        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 shrink-0">
          {providerConfig.label}
        </Badge>
      </div>

      <RecoveryQueueTable initialCases={cases} />
    </div>
  );
}
