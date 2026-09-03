import { demoRepo } from '@/services/data/demoRepository';
import { getRecoveryImpactMetrics, getRecoveryTrend as getAnalyticsTrend, getInterventionPerformance, getRecoveryFunnel } from './analytics';

export type TrendDataPoint = {
  date: string;
  revenueAtRisk: number;
  expectedRecovery: number;
  recovered: number;
};

export async function getDashboardMetrics() {
  const metrics = getRecoveryImpactMetrics('all');
  
  let activeCases = 0;
  for (const c of Object.values(demoRepo.cases)) {
    if (c.status === 'ready' || c.status === 'recovering') {
      activeCases++;
    }
  }

  return {
    ...metrics,
    activeCases
  };
}

export async function getRecoveryTrend() {
  return getAnalyticsTrend(7).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    revenueAtRisk: d.atRisk,
    expectedRecovery: d.expected,
    recovered: d.recovered
  }));
}

export async function getRecoveryByIntervention() {
  return getInterventionPerformance('all').map(p => ({
    action: p.intervention,
    recovered: p.recovered
  }));
}

export async function getPriorityCases() {
  return Object.values(demoRepo.cases)
    .sort((a, b) => (b.expectedNetRecoveryValue || b.expectedRecovery || 0) - (a.expectedNetRecoveryValue || a.expectedRecovery || 0))
    .map(c => {
      const baseline = c.estimatedBaselineRecoveryProbability ?? c.baselineRecoveryProbability ?? 0.20;
      const intervention = c.recoveryProbability || 0;
      const lift = c.incrementalLift ?? Math.max(0, intervention - baseline);
      const net = c.expectedNetRecoveryValue ?? Math.round((c.expectedIncrementalRecoveryValue || (c.amountAtRisk * lift)) - (c.estimatedInterventionCost || 10));
      const decision = c.decision ?? (c.status === 'escalated' ? 'ESCALATE' : net <= 0 ? 'ABSTAIN' : 'ACT');

      return {
        id: c.id,
        customerName: (c.metadata?.customerName as string) || 'Unknown',
        issue: c.diagnosis || c.paymentDetails?.failureReason || 'Unknown issue',
        amount: c.amountAtRisk,
        probability: intervention,
        baselineProbability: baseline,
        incrementalLift: lift,
        expectedRecovery: c.expectedRecovery || 0,
        expectedNetRecovery: net,
        decision,
        status: c.status,
        recommendedAction: c.recommendedAction || 'None'
      };
    });
}

export async function getRecentRecoveryActivity() {
  return demoRepo.audits
    .slice()
    .reverse()
    .slice(0, 5)
    .map(a => ({
      id: a.id,
      time: a.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      description: a.eventType,
      subtext: a.description,
      caseId: a.caseId
    }));
}

export async function getFunnelData() {
  return getRecoveryFunnel('all');
}
