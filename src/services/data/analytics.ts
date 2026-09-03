import { demoRepo } from "./demoRepository";
import { calculateRecoveryScore } from "@/services/engine/scoring";
import { FullCaseContext } from "@/services/engine/core";

export type TimeFilter = 7 | 30 | 'all';

function getFilteredCases(days: TimeFilter) {
  const cases = Object.values(demoRepo.cases);
  if (days === 'all') return cases;
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cases.filter(c => new Date(c.createdAt) >= cutoff);
}

function getExpected(c: FullCaseContext) {
  if (c.expectedRecovery !== undefined) return c.expectedRecovery;
  const score = calculateRecoveryScore({
    previousSuccesses: c.customerHistory?.previousSuccesses || 0,
    previousFailures: c.customerHistory?.previousFailures || 0,
    amountAtRisk: c.amountAtRisk,
    isTemporaryFailureSignal: c.paymentDetails?.failureReason === 'Temporary network timeout',
    isHighRiskSignal: c.paymentDetails?.failureReason === 'Insufficient funds'
  });
  return score.expectedRecovery;
}

export function getRecoveryImpactMetrics(days: TimeFilter) {
  const cases = getFilteredCases(days);
  
  // Let's refine based on product definition:

  // Let's refine based on product definition: 
  // Expected Recovery = Total expected from all cases in the cohort.
  // Recovered Revenue = Total recovered.
  let totalCohortExpected = 0;
  let totalCohortAtRisk = 0;
  let totalCohortRecovered = 0;

  cases.forEach(c => {
    totalCohortAtRisk += c.amountAtRisk;
    totalCohortExpected += getExpected(c);
    if (c.status === 'recovered') {
      totalCohortRecovered += c.amountAtRisk;
    }
  });

  return {
    revenueAtRisk: totalCohortAtRisk - totalCohortRecovered, // Currently at risk
    historicalAtRisk: totalCohortAtRisk,
    expectedRecovery: totalCohortExpected, // Total expected across cohort
    recoveredRevenue: totalCohortRecovered,
    recoveryRate: totalCohortExpected > 0 ? (totalCohortRecovered / totalCohortExpected) : 0,
  };
}

export function getRecoveryTrend(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const data: Record<string, { date: string, atRisk: number, expected: number, recovered: number }> = {};

  // Initialize dates
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
      data[dateStr].atRisk += c.amountAtRisk;
      data[dateStr].expected += getExpected(c);
    }
  });

  // Now add recovered on the date of recovery
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

export function getFailureReasonPerformance(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const performance: Record<string, { category: string, cases: number, atRisk: number, expected: number, recovered: number }> = {};

  cases.forEach(c => {
    const category = c.type; // Stable category like 'payment_failure'
    
    if (!performance[category]) {
      performance[category] = { category, cases: 0, atRisk: 0, expected: 0, recovered: 0 };
    }
    
    performance[category].cases++;
    performance[category].atRisk += c.amountAtRisk;
    performance[category].expected += getExpected(c);
    
    if (c.status === 'recovered') {
      performance[category].recovered += c.amountAtRisk;
    }
  });

  return Object.values(performance).map(p => ({
    category: p.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    cases: p.cases,
    amountAtRisk: p.atRisk,
    expectedRecovery: p.expected,
    recoveredRevenue: p.recovered,
    recoveryRate: p.expected > 0 ? p.recovered / p.expected : 0
  })).sort((a, b) => b.expectedRecovery - a.expectedRecovery);
}

export function getPaymentMethodPerformance(days: TimeFilter) {
  const cases = getFilteredCases(days);
  const performance: Record<string, { method: string, cases: number, atRisk: number, expected: number, recovered: number }> = {};

  cases.forEach(c => {
    const method = c.paymentDetails?.method || 'Unknown';
    if (!performance[method]) {
      performance[method] = { method, cases: 0, atRisk: 0, expected: 0, recovered: 0 };
    }
    performance[method].cases++;
    performance[method].atRisk += c.amountAtRisk;
    performance[method].expected += getExpected(c);
    if (c.status === 'recovered') {
      performance[method].recovered += c.amountAtRisk;
    }
  });

  return Object.values(performance).map(p => ({
    ...p,
    recoveryRate: p.expected > 0 ? p.recovered / p.expected : 0
  })).sort((a, b) => b.atRisk - a.atRisk);
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
    // 1. Opportunities detected
    if (c.id || demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'RECOVERY_DETECTED')) {
      opportunities++;
    }
    
    // 2. Diagnosed
    if (c.diagnosis || demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'DIAGNOSIS_COMPLETED')) {
      diagnosed++;
    }

    // 3. Intervention selected
    if (c.recommendedAction || demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'INTERVENTION_RECOMMENDED')) {
      interventionSelected++;
    }

    // 4. Policy approved
    const caseActions = demoRepo.actions.filter(a => a.caseId === c.id);
    const hasApprovedAudit = demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'ACTION_APPROVED');
    if (caseActions.length > 0 || hasApprovedAudit) {
      policyApproved++;
    }
    
    // 5. Recovery executed
    if (caseActions.length > 0 || demoRepo.audits.some(a => a.caseId === c.id && a.eventType === 'ACTION_EXECUTED')) {
      executed++;
    }
    
    // 6. Recovered
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
