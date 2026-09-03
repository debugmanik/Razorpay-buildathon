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
    .sort((a, b) => (b.expectedRecovery || 0) - (a.expectedRecovery || 0))
    .map(c => ({
      id: c.id,
      customerName: (c.metadata?.customerName as string) || 'Unknown',
      issue: c.diagnosis || c.paymentDetails?.failureReason || 'Unknown issue',
      amount: c.amountAtRisk,
      probability: c.recoveryProbability || 0,
      expectedRecovery: c.expectedRecovery || 0,
      status: c.status,
      recommendedAction: c.recommendedAction || 'None'
    }));
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
