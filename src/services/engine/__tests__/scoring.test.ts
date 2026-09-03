import { calculateRecoveryScore } from '../scoring';

describe('Scoring Engine', () => {
  it('calculates expected recovery correctly and clamps probability bounds', () => {
    // 0.40 base + 0.10 (success) - 0.75 (failures) = -0.25 (should clamp to 0.05)
    const result = calculateRecoveryScore({
      previousSuccesses: 1,
      previousFailures: 5,
      amountAtRisk: 10000,
      isTemporaryFailureSignal: false,
      isHighRiskSignal: false,
    });
    expect(result.recoveryProbability).toBe(0.05);
    expect(result.expectedRecovery).toBe(500); // 10000 * 0.05
  });

  it('increases probability with temporary failure signal', () => {
    // 0.40 + 0.20 = 0.60
    const result = calculateRecoveryScore({
      previousSuccesses: 0,
      previousFailures: 0,
      amountAtRisk: 1000,
      isTemporaryFailureSignal: true,
      isHighRiskSignal: false,
    });
    expect(result.recoveryProbability).toBe(0.60);
    expect(result.expectedRecovery).toBe(600);
  });

  it('decreases probability on high risk signal', () => {
    // 0.40 - 0.30 = 0.10
    const result = calculateRecoveryScore({
      previousSuccesses: 0,
      previousFailures: 0,
      amountAtRisk: 5000,
      isTemporaryFailureSignal: false,
      isHighRiskSignal: true,
    });
    expect(result.recoveryProbability).toBe(0.10);
    expect(result.expectedRecovery).toBe(500);
  });

  it('clamps to max 0.95', () => {
    // 0.40 + 10 * 0.10 + 0.20 = 1.6 -> clamp to 0.95
    const result = calculateRecoveryScore({
      previousSuccesses: 10,
      previousFailures: 0,
      amountAtRisk: 1000,
      isTemporaryFailureSignal: true,
      isHighRiskSignal: false,
    });
    expect(result.recoveryProbability).toBe(0.95);
    expect(result.expectedRecovery).toBe(950);
  });
});
