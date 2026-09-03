export type ScoringContext = {
  previousSuccesses: number;
  previousFailures: number;
  amountAtRisk: number;
  isTemporaryFailureSignal: boolean;
  isHighRiskSignal: boolean;
  customBaselineProbability?: number;
  customInterventionProbability?: number;
};

export type ScoringResult = {
  recoveryProbability: number; // Estimated Recovery Probability with Intervention
  estimatedBaselineRecoveryProbability: number; // Estimated Natural Recovery Probability
  baselineRecoveryProbability: number; // Alias
  incrementalLift: number; // Estimated Incremental Lift (decimal, e.g. 0.54 for +54pp)
  expectedRecovery: number; // Gross expected recovery
  expectedIncrementalRecoveryValue: number; // Decisioning estimate
};

export function calculateRecoveryScore(context: ScoringContext): ScoringResult {
  let interventionProb = context.customInterventionProbability ?? 0.40; // Base probability with intervention
  let baselineProb = context.customBaselineProbability ?? 0.20; // Base natural recovery probability without intervention

  if (context.customInterventionProbability === undefined) {
    // Deterministic adjustments for intervention probability
    interventionProb += context.previousSuccesses * 0.10;
    interventionProb -= context.previousFailures * 0.15;
    
    if (context.isTemporaryFailureSignal) {
      interventionProb += 0.20;
    }
    
    if (context.isHighRiskSignal) {
      interventionProb -= 0.30;
    }
  }

  if (context.customBaselineProbability === undefined) {
    // Deterministic estimate of natural recovery without intervention
    if (context.isTemporaryFailureSignal) {
      baselineProb = 0.15 + (context.previousSuccesses * 0.03) - (context.previousFailures * 0.03);
    } else if (context.isHighRiskSignal) {
      baselineProb = 0.08 + (context.previousSuccesses * 0.01) - (context.previousFailures * 0.02);
    } else {
      baselineProb = 0.18 + (context.previousSuccesses * 0.02) - (context.previousFailures * 0.03);
    }
  }

  // Clamp probabilities between 0.05 and 0.95
  interventionProb = Math.max(0.05, Math.min(0.95, interventionProb));
  baselineProb = Math.max(0.05, Math.min(0.90, baselineProb));

  // Natural baseline should never exceed intervention probability in scoring
  if (baselineProb > interventionProb) {
    baselineProb = Math.max(0.05, interventionProb - 0.02);
  }
  
  // Format to 2 decimal places
  interventionProb = Math.round(interventionProb * 100) / 100;
  baselineProb = Math.round(baselineProb * 100) / 100;

  const incrementalLift = Math.round((interventionProb - baselineProb) * 100) / 100;
  const expectedRecovery = Math.round(context.amountAtRisk * interventionProb * 100) / 100;
  const expectedIncrementalRecoveryValue = Math.round(context.amountAtRisk * incrementalLift * 100) / 100;

  return {
    recoveryProbability: interventionProb,
    estimatedBaselineRecoveryProbability: baselineProb,
    baselineRecoveryProbability: baselineProb,
    incrementalLift,
    expectedRecovery,
    expectedIncrementalRecoveryValue,
  };
}
