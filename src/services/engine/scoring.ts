export type ScoringContext = {
  previousSuccesses: number;
  previousFailures: number;
  amountAtRisk: number;
  isTemporaryFailureSignal: boolean;
  isHighRiskSignal: boolean;
};

export type ScoringResult = {
  recoveryProbability: number;
  expectedRecovery: number;
};

export function calculateRecoveryScore(context: ScoringContext): ScoringResult {
  let probability = 0.40; // Base probability

  // Deterministic adjustments
  probability += context.previousSuccesses * 0.10;
  probability -= context.previousFailures * 0.15;
  
  if (context.isTemporaryFailureSignal) {
    probability += 0.20;
  }
  
  if (context.isHighRiskSignal) {
    probability -= 0.30;
  }

  // Clamp between 0.05 and 0.95
  probability = Math.max(0.05, Math.min(0.95, probability));
  
  // Format to 2 decimal places to avoid floating point precision issues
  probability = Math.round(probability * 100) / 100;

  const expectedRecovery = Math.round(context.amountAtRisk * probability * 100) / 100;

  return {
    recoveryProbability: probability,
    expectedRecovery: expectedRecovery,
  };
}
