import { demoRepo } from '@/services/data/demoRepository';
import { calculateRecoveryScore } from '@/services/engine/scoring';
import { diagnoseCase } from '@/services/engine/diagnosis';
import { selectIntervention } from '@/services/engine/intervention';
import { CaseStatus } from '@/types/domain';

export type QueueCaseItem = {
  id: string;
  customerName: string;
  problem: string;
  caseType: string;
  amountAtRisk: number;
  probability: number;
  expectedRecovery: number;
  priority: 'High' | 'Medium' | 'Low';
  provider: 'RAZORPAY TEST MODE' | 'SIMULATION';
  status: CaseStatus;
  recommendedAction: string;
  lastActivity: string;
  createdAt: Date;
};

export type QueueMetrics = {
  activeCases: number;
  revenueAtRisk: number;
  expectedRecovery: number;
  recoveredRevenue: number;
};

export async function getQueueData(): Promise<{ cases: QueueCaseItem[], metrics: QueueMetrics }> {
  const cases: QueueCaseItem[] = [];
  let activeCases = 0;
  let revenueAtRisk = 0;
  let expectedRecovery = 0;
  let recoveredRevenue = 0;

  for (const c of Object.values(demoRepo.cases)) {
    let probability = c.recoveryProbability;
    let expected = c.expectedRecovery;
    let action = c.recommendedAction;
    let problem = c.diagnosis;

    // Fallback compute if missing
    if (probability === undefined || expected === undefined || !action || !problem) {
      const diag = diagnoseCase({
        caseType: c.type,
        failureReason: c.paymentDetails?.failureReason,
        previousSuccesses: c.customerHistory.previousSuccesses,
        previousFailures: c.customerHistory.previousFailures,
      });
      
      const score = calculateRecoveryScore({
        previousSuccesses: c.customerHistory.previousSuccesses,
        previousFailures: c.customerHistory.previousFailures,
        amountAtRisk: c.amountAtRisk,
        isTemporaryFailureSignal: diag.category === 'Temporary Payment Failure',
        isHighRiskSignal: diag.category === 'Hard Payment Failure',
      });

      const intervention = selectIntervention({
        caseType: c.type,
        recoveryProbability: score.recoveryProbability,
        expectedRecovery: score.expectedRecovery,
        diagnosisCategory: diag.category,
        hasPromiseToPay: c.hasPromiseToPay
      });

      probability = score.recoveryProbability;
      expected = score.expectedRecovery;
      action = intervention.action;
      problem = diag.category;
    }

    let priority: 'High' | 'Medium' | 'Low' = 'Low';
    if (expected >= 5000) {
      priority = 'High';
    } else if (expected >= 1000) {
      priority = 'Medium';
    }

    const provider = c.metadata?.paymentId ? 'RAZORPAY TEST MODE' : 'SIMULATION';

    const item: QueueCaseItem = {
      id: c.id,
      customerName: (c.metadata?.customerName as string) || 'Unknown',
      problem,
      caseType: c.type,
      amountAtRisk: c.amountAtRisk,
      probability,
      expectedRecovery: expected,
      priority,
      provider,
      status: c.status,
      recommendedAction: action,
      lastActivity: c.lastActionAt?.toISOString() || c.createdAt.toISOString(),
      createdAt: c.createdAt,
    };

    cases.push(item);

    if (c.status === 'ready' || c.status === 'recovering') {
      activeCases++;
      revenueAtRisk += c.amountAtRisk;
      expectedRecovery += expected;
    }
  }

  // Calculate recovered revenue from actions
  const actions = demoRepo.actions.filter(a => a.status === 'succeeded' && a.amountRecovered > 0);
  actions.forEach(a => {
    recoveredRevenue += a.amountRecovered;
  });

  // Pre-sort by Expected Recovery DESC
  cases.sort((a, b) => b.expectedRecovery - a.expectedRecovery);

  return {
    cases,
    metrics: {
      activeCases,
      revenueAtRisk,
      expectedRecovery,
      recoveredRevenue,
    }
  };
}
