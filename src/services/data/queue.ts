import { demoRepo } from '@/services/data/demoRepository';
import { calculateRecoveryScore } from '@/services/engine/scoring';
import { diagnoseCase } from '@/services/engine/diagnosis';
import { selectIntervention, ESTIMATED_INTERVENTION_COSTS } from '@/services/engine/intervention';
import { getRecoveryImpactMetrics } from '@/services/data/analytics';
import { CaseStatus, RecoveryDecision } from '@/types/domain';

export type QueueCaseItem = {
  id: string;
  customerName: string;
  problem: string;
  caseType: string;
  amountAtRisk: number;
  probability: number; // Estimated Recovery Probability with Intervention
  baselineProbability: number; // Estimated Natural Recovery Probability
  incrementalLift: number; // Estimated Incremental Lift
  expectedRecovery: number; // Gross Expected Recovery Value
  expectedIncrementalRecovery: number; // Expected Incremental Recovery Value
  estimatedCost: number; // Estimated Intervention Cost
  expectedNetRecovery: number; // Expected Net Recovery Value
  decision: RecoveryDecision; // ACT | ABSTAIN | ESCALATE
  decisionReason: string;
  policySummary: string;
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
  expectedIncrementalRecovery: number;
  expectedNetRecovery: number;
  recoveredRevenue: number;
  decisionMix: {
    act: number;
    abstain: number;
    escalate: number;
  };
};

export async function getQueueData(): Promise<{ cases: QueueCaseItem[], metrics: QueueMetrics }> {
  const cases: QueueCaseItem[] = [];
  let activeCases = 0;
  let revenueAtRisk = 0;
  let expectedRecovery = 0;
  let expectedIncrementalRecovery = 0;
  let expectedNetRecovery = 0;
  let recoveredRevenue = 0;
  const decisionMix = { act: 0, abstain: 0, escalate: 0 };

  for (const c of Object.values(demoRepo.cases)) {
    let probability = c.recoveryProbability;
    let baselineProb = c.estimatedBaselineRecoveryProbability ?? c.baselineRecoveryProbability;
    let lift = c.incrementalLift;
    let expected = c.expectedRecovery;
    let expIncRecovery = c.expectedIncrementalRecoveryValue;
    let estCost = c.estimatedInterventionCost;
    let netRecovery = c.expectedNetRecoveryValue;
    let decision = c.decision;
    let decisionReason = c.decisionReason;
    let action = c.recommendedAction;
    let problem = c.diagnosis;

    // Fallback compute if missing
    if (probability === undefined || expected === undefined || !action || !problem || baselineProb === undefined) {
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
        hasPromiseToPay: c.hasPromiseToPay,
        amountAtRisk: c.amountAtRisk,
        expectedIncrementalRecoveryValue: score.expectedIncrementalRecoveryValue,
      });

      probability = score.recoveryProbability;
      baselineProb = score.estimatedBaselineRecoveryProbability;
      lift = score.incrementalLift;
      expected = score.expectedRecovery;
      expIncRecovery = score.expectedIncrementalRecoveryValue;
      estCost = intervention.estimatedInterventionCost;
      netRecovery = intervention.expectedNetRecoveryValue;
      decision = intervention.decision;
      decisionReason = intervention.decisionReason;
      action = intervention.action;
      problem = diag.category;
    }

    if (baselineProb === undefined) baselineProb = Math.max(0.05, (probability || 0.5) - 0.3);
    if (lift === undefined) lift = Math.round(((probability || 0) - baselineProb) * 100) / 100;
    if (expIncRecovery === undefined) expIncRecovery = Math.round(c.amountAtRisk * lift);
    if (estCost === undefined) estCost = ESTIMATED_INTERVENTION_COSTS[action || 'create_recovery_payment'] ?? 0;
    if (netRecovery === undefined) netRecovery = Math.round(expIncRecovery - estCost);
    if (!decision) {
      if (c.status === 'escalated' || action === 'manual_review') decision = 'ESCALATE';
      else if (netRecovery <= 0) decision = 'ABSTAIN';
      else decision = 'ACT';
    }
    if (!decisionReason) {
      if (decision === 'ESCALATE') decisionReason = 'Policy escalation threshold reached.';
      else if (decision === 'ABSTAIN') decisionReason = 'The estimated incremental recovery value does not justify the intervention cost.';
      else decisionReason = 'Estimated incremental recovery value exceeds intervention cost and remains within merchant policy.';
    }

    let priority: 'High' | 'Medium' | 'Low' = 'Low';
    if ((expected || 0) >= 5000) {
      priority = 'High';
    } else if ((expected || 0) >= 1000) {
      priority = 'Medium';
    }

    const provider = c.metadata?.paymentId ? 'RAZORPAY TEST MODE' : 'SIMULATION';

    const item: QueueCaseItem = {
      id: c.id,
      customerName: (c.metadata?.customerName as string) || 'Unknown',
      problem,
      caseType: c.type,
      amountAtRisk: c.amountAtRisk,
      probability: probability || 0,
      baselineProbability: baselineProb,
      incrementalLift: lift,
      expectedRecovery: expected || 0,
      expectedIncrementalRecovery: expIncRecovery,
      estimatedCost: estCost,
      expectedNetRecovery: netRecovery,
      decision,
      decisionReason,
      policySummary: c.policy ? `Max ${c.policy.maxAttempts} retries · ₹${(c.policy.escalationThreshold / 1000).toFixed(0)}k cap` : 'Standard Guardrails',
      priority,
      provider,
      status: c.status,
      recommendedAction: action || 'create_recovery_payment',
      lastActivity: c.lastActionAt?.toISOString() || c.createdAt.toISOString(),
      createdAt: c.createdAt,
    };

    cases.push(item);

    if (decision === 'ACT') decisionMix.act++;
    else if (decision === 'ABSTAIN') decisionMix.abstain++;
    else if (decision === 'ESCALATE') decisionMix.escalate++;

    if (c.status === 'ready' || c.status === 'recovering') {
      activeCases++;
      revenueAtRisk += c.amountAtRisk;
      expectedRecovery += (expected || 0);
      expectedIncrementalRecovery += expIncRecovery;
      expectedNetRecovery += netRecovery;
    }
  }

  // Reconciled financial source of truth
  const impact = getRecoveryImpactMetrics('all');
  recoveredRevenue = impact.recoveredRevenue;

  // Pre-sort by Expected Net Recovery DESC (Best Recovery Opportunity)
  cases.sort((a, b) => b.expectedNetRecovery - a.expectedNetRecovery);

  return {
    cases,
    metrics: {
      activeCases,
      revenueAtRisk,
      expectedRecovery,
      expectedIncrementalRecovery,
      expectedNetRecovery,
      recoveredRevenue,
      decisionMix,
    }
  };
}
