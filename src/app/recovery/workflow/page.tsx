import { demoRepo } from "@/services/data/demoRepository";
import { getProviderConfig } from "@/services/providers/config";
import { WorkflowClient } from "@/components/workflow/WorkflowClient";


export const dynamic = "force-dynamic";

export default async function RecoveryWorkflowPage() {
  const providerConfig = getProviderConfig();
  
  // Get all cases, sort by created descending
  const allCases = Object.values(demoRepo.cases).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Pass raw case data with actions and audits. The UI will render what is actually persisted.
  const casesWithDetails = allCases.map(c => {
    const actions = demoRepo.getActionsForCase(c.id);
    const audits = demoRepo.getAuditsForCase(c.id);
    const actualRecovered = actions.reduce((sum, a) => sum + (a.amountRecovered || 0), 0);

    return {
      ...c,
      actions,
      audits,
      actualRecovered
    };
  });

  return (
    <div className="flex-1 p-8 pt-6 max-w-[1400px] mx-auto w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Recovery Workflow</h2>
          <p className="text-slate-500 mt-1">
            See how RecoverX moves a failed payment from detection to confirmed recovery.
          </p>
        </div>
      </div>
      
      <WorkflowClient cases={casesWithDetails} providerLabel={providerConfig.label} />
    </div>
  );
}
