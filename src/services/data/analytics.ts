import { demoRepo } from "./demoRepository";
import { calculateRecoveryScore } from "@/services/engine/scoring";
import { FullCaseContext } from "@/services/engine/core";
import { formatCaseType } from "@/lib/format";

export type TimeFilter = 7 | 30 | 'all';

function getFilteredCases(days: TimeFilter) {
  const cases = Object.values(demoRepo.cases);
  if (days === 'all') return cases;
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cases.filter(c => new Date(c.createdAt) >= cutoff);
}

function getEconomicMetricsForCase(c: FullCaseContext) {
  let baselineProb = c.estimatedBaselineRecoveryProbability ?? c.baselineRecoveryProbability;
  let interventionProb = c.recoveryProbability;
  let expectedRecovery = c.expectedRecovery;
  let expectedIncremental = c.expectedIncrementalRecoveryValue;
  let estimatedCost = c.estimatedInterventionCost;
  let expectedNet = c.expectedNetRecoveryValue;
  let decision = c.decision;

  if (interventionProb === undefined || expectedRecovery === undefined || baselineProb === undefined) {
    const isTemp = c.paymentDetails?.failureReason === 'Temporary network timeout';
    const isHard = c.paymentDetails?.failureReason === 'Insufficient funds';
    const score = calculateRecoveryScore({
      previousSuccesses: c.customerHistory?.previousSuccesses || 0,
      previousFailures: c.customerHistory?.previousFailures || 0,
      amountAtRisk: c.amountAtRisk,
      isTemporaryFailureSignal: isTemp,
      isHighRiskSignal: isHard,
    });
    baselineProb = score.estimatedBaselineRecoveryProbability;
    interventionProb = score.recoveryProbability;
    expectedRecovery = score.expectedRecovery;
    expectedIncremental = score.expectedIncrementalRecoveryValue;
  }

  if (baselineProb === undefined) baselineProb = 0.20;
  if (interventionProb === undefined) interventionProb = 0.50;
  if (expectedRecovery === undefined) expectedRecovery = Math.round(c.amountAtRisk * interventionProb);
  if (expectedIncremental === undefined) {
    const lift = Math.max(0, interventionProb - baselineProb);
    expectedIncremental = Math.round(c.amountAtRisk * lift);
  }
  if (estimatedCost === undefined) estimatedCost = 10;
  if (expectedNet === undefined) expectedNet = Math.round(expectedIncremental - estimatedCost);
  if (!decision) {
    if (c.status === 'escalated') decision = 'ESCALATE';
    else if (expectedNet <= 0) decision = 'ABSTAIN';
    else decision = 'ACT';
  }

  return {
    baselineProb,
    interventionProb,
    expectedRecovery,
    expectedIncremental,
    estimatedCost,
    expectedNet,
    decision,
  };
}

export function getRecoveryImpactMetrics(days: TimeFilter) {
  const cases = getFilteredCases(days);
  
  let totalCohortAtRisk = 0;
  let totalCohortExpected = 0;
  let totalBaselineExpected = 0;
  let totalExpectedIncremental = 0;
  let totalEstimatedCost = 0;
  let totalExpectedNet = 0;
  let totalCohortRecovered = 0;
  const decisionMix = { act: 0, abstain: 0, escalate: 0 };

  cases.forEach(c => {
    totalCohortAtRisk += c.amountAtRisk;
    const econ = getEconomicMetricsForCase(c);
    
    totalCohortExpected += econ.expectedRecovery;
    totalBaselineExpected += Math.round(c.amountAtRisk * econ.baselineProb);
    totalExpectedIncremental += econ.expectedIncremental;
    totalEstimatedCost += econ.estimatedCost;
    totalExpectedNet += econ.expectedNet;

    if (econ.decision === 'ACT') decisionMix.act++;
    else if (econ.decision === 'ABSTAIN') decisionMix.abstain++;
    else if (econ.decision === 'ESCALATE') decisionMix.escalate++;

    if (c.status === 'recovered') {
      totalCohortRecovered += c.amountAtRisk;
    }
  });

  return {
    revenueAtRisk: totalCohortAtRisk - totalCohortRecovered, // Currently at risk
    historicalAtRisk: totalCohortAtRisk,
    expectedRecovery: totalCohortExpected, // Gross expected across cohort
    baselineExpectedRecovery: totalBaselineExpected, // Estimated natural recovery without action
    expectedIncrementalRecoveryValue: totalExpectedIncremental, // Incremental lift value
    estimatedInterventionCost: totalEstimatedCost, // Configured demo cost
    expectedNetRecoveryValue: totalExpectedNet, // Net economic value
    recoveredRevenue: totalCohortRecovered,
    recoveryRate: totalCohortExpected > 0 ? (totalCohortRecovered / totalCohortExpected) : 0,
    decisionMix,
  };
}

export function getOpportunityTypeEconomics(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const groups: Record<string, {
    type: string;
    typeName: string;
    count: number;
    amountAtRisk: number;
    baselineEstimate: number;
    withActionEstimate: number;
    incrementalRecovery: number;
    actualRecovered: number;
  }> = {};

  cases.forEach(c => {
    const type = c.type;
    if (!groups[type]) {
      groups[type] = {
        type,
        typeName: formatCaseType(type),
        count: 0,
        amountAtRisk: 0,
        baselineEstimate: 0,
        withActionEstimate: 0,
        incrementalRecovery: 0,
        actualRecovered: 0,
      };
    }

    const econ = getEconomicMetricsForCase(c);
    groups[type].count++;
    groups[type].amountAtRisk += c.amountAtRisk;
    groups[type].baselineEstimate += Math.round(c.amountAtRisk * econ.baselineProb);
    groups[type].withActionEstimate += econ.expectedRecovery;
    groups[type].incrementalRecovery += econ.expectedIncremental;

    if (c.status === 'recovered') {
      groups[type].actualRecovered += c.amountAtRisk;
    }
  });

  return Object.values(groups).sort((a, b) => b.amountAtRisk - a.amountAtRisk);
}

export function getRecoveryTrend(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const data: Record<string, { date: string, atRisk: number, expected: number, recovered: number }> = {};

  if (days !== 'all') {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      data[dateStr] = { date: dateStr, atRisk: 0, expected: 0, recovered: 0 };
    }
  }

  cases.forEach(c => {
    const dateStr = new Date(c.createdAt).toISOString().split('T')[0];
    if (!data[dateStr] && days === 'all') {
      data[dateStr] = { date: dateStr, atRisk: 0, expected: 0, recovered: 0 };
    }
    if (data[dateStr]) {
      const econ = getEconomicMetricsForCase(c);
      data[dateStr].atRisk += c.amountAtRisk;
      data[dateStr].expected += econ.expectedRecovery;
    }
  });

  const actions = demoRepo.actions.filter(a => a.status === 'succeeded' && a.amountRecovered > 0);
  actions.forEach(a => {
    const dateStr = new Date(a.createdAt).toISOString().split('T')[0];
    if (data[dateStr]) {
      data[dateStr].recovered += a.amountRecovered;
    }
  });

  return Object.values(data).sort((a, b) => a.date.localeCompare(b.date));
}

export function getInterventionPerformance(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const caseIds = new Set(cases.map(c => c.id));
  
  const actions = demoRepo.actions.filter(a => caseIds.has(a.caseId));
  const performance: Record<string, { type: string, attempts: number, successes: number, recovered: number }> = {};
  
  actions.forEach(a => {
    if (!performance[a.type]) {
      performance[a.type] = { type: a.type, attempts: 0, successes: 0, recovered: 0 };
    }
    performance[a.type].attempts++;
    if (a.status === 'succeeded') {
      performance[a.type].successes++;
      performance[a.type].recovered += a.amountRecovered || 0;
    }
  });

  return Object.values(performance)
    .sort((a, b) => b.recovered - a.recovered)
    .map(p => ({
      intervention: p.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      recovered: p.recovered,
      successRate: p.attempts > 0 ? p.successes / p.attempts : 0
    }));
}

export function getBatchOutcomeQuality(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const outcomes: Record<string, { status: string, count: number, amount: number, description: string }> = {
    recovered: { status: 'Successfully Recovered', count: 0, amount: 0, description: 'Verified funds captured via payment provider' },
    pending: { status: 'Customer Pending', count: 0, amount: 0, description: 'Awaiting customer interaction or payment' },
    abstained: { status: 'Abstained', count: 0, amount: 0, description: 'Intervention withheld due to low incremental return' },
    stopped: { status: 'Policy Stopped', count: 0, amount: 0, description: 'Halted by max retry limits or cooldown rules' },
    escalated: { status: 'Manually Escalated', count: 0, amount: 0, description: 'Routed to merchant ops for high financial exposure' },
    failed: { status: 'Failed', count: 0, amount: 0, description: 'Terminal failure after exhausted options' },
  };

  cases.forEach(c => {
    let key = 'pending';
    const econ = getEconomicMetricsForCase(c);

    if (c.status === 'recovered') key = 'recovered';
    else if (c.status === 'stopped') key = 'stopped';
    else if (c.status === 'escalated') key = 'escalated';
    else if (c.status === 'failed') key = 'failed';
    else if (econ.decision === 'ABSTAIN') key = 'abstained';
    else if (c.status === 'ready' || c.status === 'recovering') key = 'pending';

    outcomes[key].count++;
    outcomes[key].amount += c.amountAtRisk;
  });

  return Object.values(outcomes);
}

export function getRecoveryEfficiency(days: TimeFilter) {
  const cases = getFilteredCases(days);
  let totalRecoveredCases = 0;
  let totalTimeMs = 0;
  let totalAttempts = 0;

  cases.forEach(c => {
    if (c.status === 'recovered') {
      totalRecoveredCases++;
      totalAttempts += c.attemptCount;
      
      if (c.lastActionAt && c.createdAt) {
        totalTimeMs += (new Date(c.lastActionAt).getTime() - new Date(c.createdAt).getTime());
      }
    }
  });

  return {
    averageAttemptsToRecovery: totalRecoveredCases > 0 ? totalAttempts / totalRecoveredCases : 0,
    averageRecoveryTimeHours: totalRecoveredCases > 0 ? (totalTimeMs / totalRecoveredCases) / (1000 * 60 * 60) : 0,
  };
}

export function getRecoveryFunnel(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const failedPayments = cases.length;
  let opportunities = 0;
  let diagnosed = 0;
  let interventionSelected = 0;
  let policyApproved = 0;
  let executed = 0;
  let recovered = 0;

  cases.forEach(c => {
    if (c.id || demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'RECOVERY_DETECTED')) {
      opportunities++;
    }
    if (c.diagnosis || demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'DIAGNOSIS_COMPLETED')) {
      diagnosed++;
    }
    if (c.recommendedAction || demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'INTERVENTION_RECOMMENDED')) {
      interventionSelected++;
    }
    const caseActions = demoRepo.actions.filter(a => a.caseId === c.id);
    const hasApprovedAudit = demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'ACTION_APPROVED');
    if (caseActions.length > 0 || hasApprovedAudit) {
      policyApproved++;
    }
    if (caseActions.length > 0 || demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'ACTION_EXECUTED')) {
      executed++;
    }
    if (c.status === 'recovered') {
      recovered++;
    }
  });

  return {
    failedPayments,
    opportunities,
    diagnosed,
    interventionSelected,
    policyApproved,
    executed,
    paymentCreated: executed,
    recovered
  };
}

export function getBoundedAutonomyMetrics(days: TimeFilter) {
  const cases = getFilteredCases(days);
  let automatedRecoveries = 0;
  let stoppedByPolicy = 0;
  let escalations = 0;

  cases.forEach(c => {
    if (c.status === 'recovered') automatedRecoveries++;
    if (c.status === 'stopped') stoppedByPolicy++;
    if (c.status === 'escalated') escalations++;
  });

  return {
    automatedRecoveries,
    stoppedByPolicy,
    escalations
  };
}

export function getRecoveryOutcomes(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const outcomes: Record<string, { status: string, count: number, amount: number }> = {
    recovered: { status: 'Recovered', count: 0, amount: 0 },
    stopped: { status: 'Stopped', count: 0, amount: 0 },
    escalated: { status: 'Escalated', count: 0, amount: 0 },
    failed: { status: 'Failed', count: 0, amount: 0 },
    pending: { status: 'Pending', count: 0, amount: 0 },
  };

  cases.forEach(c => {
    let key = 'pending';
    if (c.status === 'recovered') key = 'recovered';
    else if (c.status === 'stopped') key = 'stopped';
    else if (c.status === 'escalated') key = 'escalated';
    else if (c.status === 'failed') key = 'failed';
    else if (c.status === 'ready' || c.status === 'recovering') key = 'pending';

    outcomes[key].count++;
    outcomes[key].amount += c.amountAtRisk;
  });

  return Object.values(outcomes);
}
