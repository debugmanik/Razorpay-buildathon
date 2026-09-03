import { demoRepo } from '@/services/data/demoRepository';
import { AuditTable, AuditLogItem } from '@/components/audit/AuditTable';

export const dynamic = 'force-dynamic';

export default function AuditLogPage() {
  const audits = [...demoRepo.audits].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const mappedAudits: AuditLogItem[] = audits.map((audit) => {
    const caseCtx = demoRepo.cases[audit.caseId];
    return {
      id: audit.id,
      caseId: audit.caseId,
      eventType: audit.eventType,
      description: audit.description,
      createdAt: audit.createdAt,
      customerName: (caseCtx?.metadata?.customerName as string) || 'Unknown',
      amountAtRisk: caseCtx?.amountAtRisk || 0,
      provider: caseCtx?.metadata?.paymentId ? 'RAZORPAY TEST MODE' : 'SIMULATION',
    };
  });

  return (
    <div className="flex flex-col gap-6 p-8 max-w-[1400px] mx-auto w-full">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Every recovery decision is recorded. Traceable record of all automated decisions and recovery actions.
        </p>
      </div>

      
      <AuditTable initialAudits={mappedAudits} />
    </div>
  );
}
