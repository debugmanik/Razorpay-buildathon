import { CaseStatus, CaseType, ActionType, ActionStatus, RecoveryPolicy, PromiseStatus, RecoveryDecision } from '@/types/domain';
import { validateTransition } from './state';
import { diagnoseCase } from './diagnosis';
import { calculateRecoveryScore } from './scoring';
import { selectIntervention } from './intervention';
import { evaluatePolicy } from '../policy/engine';
import { ActionContext, ActionResult } from '../providers/SimulationActionProvider';

export type FullCaseContext = {
  id: string;
  status: CaseStatus;
  type: CaseType;
  amountAtRisk: number;
  attemptCount: number;
  createdAt: Date;
  hasPromiseToPay?: boolean;
  promiseStatus?: PromiseStatus;
  metadata?: Record<string, unknown>;
  actualRecovered?: number;
  paymentDetails?: {
    failureReason?: string | null;
    method?: string | null;
    paymentId?: string | null;
    invoiceId?: string | null;
    subscriptionId?: string | null;
    mandateId?: string | null;
  };
  customerHistory: {
    previousSuccesses: number;
    previousFailures: number;
  };
  policy?: RecoveryPolicy | null;
  lastActionAt?: Date | null;
  
  // Computed & Economic decisioning fields (persisted authoritatively on the case)
  recoveryProbability?: number; // Estimated Recovery Probability with Intervention
  estimatedBaselineRecoveryProbability?: number; // Estimated Natural Recovery Probability
  baselineRecoveryProbability?: number; // Alias for convenience
  incrementalLift?: number; // Estimated Incremental Lift (decimal, e.g. 0.54 for +54pp)
  expectedRecovery?: number; // Gross: amountAtRisk * recoveryProbability
  expectedIncrementalRecoveryValue?: number; // amountAtRisk * incrementalLift
  estimatedInterventionCost?: number; // Configured estimated cost
  expectedNetRecoveryValue?: number; // expectedIncrementalRecoveryValue - estimatedInterventionCost
  decision?: RecoveryDecision; // 'ACT' | 'ABSTAIN' | 'ESCALATE'
  decisionReason?: string;
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendedAction?: string;
  diagnosis?: string;
};

export interface RecoveryRepository {
  getCaseContext(caseId: string): Promise<FullCaseContext | null>;
  saveCaseState(caseId: string, status: CaseStatus, updates: Partial<FullCaseContext>): Promise<void>;
  createAction(caseId: string, type: ActionType, attempt: number, policyId?: string): Promise<{ id: string, existing: boolean }>;
  saveAudit(caseId: string, eventType: string, description: string, actionId?: string): Promise<void>;
  updateActionOutcome(actionId: string, status: ActionStatus, resultDetails: string, amountRecovered: number): Promise<void>;
}

export class RecoveryEngine {
  constructor(
    private repo: RecoveryRepository,
    private actionProvider: { execute(context: ActionContext): Promise<ActionResult> }
  ) {}

  async processNextBoundedAction(caseId: string): Promise<void> {
    const ctx = await this.repo.getCaseContext(caseId);
    if (!ctx) {
      throw new Error(`Case ${caseId} not found`);
    }

    if (ctx.status === 'recovered' || ctx.status === 'stopped' || ctx.status === 'escalated') {
      // Nothing to do for terminal states
      return;
    }

    // Idempotency / Cooldown Guard
    // If the case is in a non-terminal state but still under cooldown, we must return
    // silently to prevent spamming audit logs on repeated engine invocations.
    if (ctx.lastActionAt && ctx.policy) {
      const msSinceLastAction = Date.now() - new Date(ctx.lastActionAt).getTime();
      const cooldownMs = (ctx.policy.cooldownMinutes || 0) * 60 * 1000;
      if (msSinceLastAction < cooldownMs) {
        return; // Silently ignore to prevent infinite loop of blocked actions
      }
    }

    // 1. Detection -> Transition to Analyzing
    if (ctx.status === 'detected') {
      validateTransition(ctx.status, 'analyzing');
      await this.repo.saveCaseState(caseId, 'analyzing', {});
      await this.repo.saveAudit(caseId, 'RECOVERY_DETECTED', `Recovery opportunity detected for ₹${ctx.amountAtRisk}`);
      ctx.status = 'analyzing';
    }

    // 2-4. Diagnosis, Scoring, and Intervention Selection
    if (ctx.status === 'analyzing') {
      const diagnosis = diagnoseCase({
        caseType: ctx.type,
        failureReason: ctx.paymentDetails?.failureReason,
        previousSuccesses: ctx.customerHistory.previousSuccesses,
        previousFailures: ctx.customerHistory.previousFailures,
        paymentMethod: ctx.paymentDetails?.method,
      });
      
      await this.repo.saveAudit(caseId, 'DIAGNOSIS_COMPLETED', `Diagnosis: ${diagnosis.category}. Confidence: ${diagnosis.confidence}`);

      const isTempFailure = diagnosis.category === 'Temporary Payment Failure';
      const isHardFailure = diagnosis.category === 'Hard Payment Failure';
      
      const score = calculateRecoveryScore({
        previousSuccesses: ctx.customerHistory.previousSuccesses,
        previousFailures: ctx.customerHistory.previousFailures,
        amountAtRisk: ctx.amountAtRisk,
        isTemporaryFailureSignal: isTempFailure,
        isHighRiskSignal: isHardFailure,
      });

      await this.repo.saveAudit(caseId, 'BASELINE_SCORED', `Estimated Natural Recovery Probability: ${Math.round(score.estimatedBaselineRecoveryProbability * 100)}%`);
      await this.repo.saveAudit(caseId, 'INTERVENTION_SCORED', `Estimated Recovery Probability with Intervention: ${Math.round(score.recoveryProbability * 100)}%`);
      await this.repo.saveAudit(caseId, 'INCREMENTAL_VALUE_CALCULATED', `Estimated Incremental Lift: +${Math.round(score.incrementalLift * 100)}pp | Expected Incremental Recovery Value: ₹${score.expectedIncrementalRecoveryValue.toLocaleString('en-IN')}`);
      await this.repo.saveAudit(caseId, 'RECOVERY_SCORED', `Probability: ${score.recoveryProbability} | Expected Recovery Value: ₹${score.expectedRecovery.toLocaleString('en-IN')}`);

      const intervention = selectIntervention({
        caseType: ctx.type,
        recoveryProbability: score.recoveryProbability,
        expectedRecovery: score.expectedRecovery,
        diagnosisCategory: diagnosis.category,
        hasPromiseToPay: ctx.hasPromiseToPay,
        amountAtRisk: ctx.amountAtRisk,
        expectedIncrementalRecoveryValue: score.expectedIncrementalRecoveryValue,
      });

      await this.repo.saveAudit(caseId, 'INTERVENTION_RECOMMENDED', `Recommended ${intervention.action}: ${intervention.reason}`);
      await this.repo.saveAudit(caseId, 'INTERVENTION_COST_EVALUATED', `Estimated Intervention Cost: ₹${intervention.estimatedInterventionCost}`);

      validateTransition(ctx.status, 'ready');
      await this.repo.saveCaseState(caseId, 'ready', {
        recoveryProbability: score.recoveryProbability,
        estimatedBaselineRecoveryProbability: score.estimatedBaselineRecoveryProbability,
        baselineRecoveryProbability: score.baselineRecoveryProbability,
        incrementalLift: score.incrementalLift,
        expectedRecovery: score.expectedRecovery,
        expectedIncrementalRecoveryValue: score.expectedIncrementalRecoveryValue,
        estimatedInterventionCost: intervention.estimatedInterventionCost,
        expectedNetRecoveryValue: intervention.expectedNetRecoveryValue,
        decision: intervention.decision,
        decisionReason: intervention.decisionReason,
        recommendedAction: intervention.action,
        diagnosis: diagnosis.category,
      });
      ctx.status = 'ready';
      ctx.recoveryProbability = score.recoveryProbability;
      ctx.estimatedBaselineRecoveryProbability = score.estimatedBaselineRecoveryProbability;
      ctx.baselineRecoveryProbability = score.baselineRecoveryProbability;
      ctx.incrementalLift = score.incrementalLift;
      ctx.expectedRecovery = score.expectedRecovery;
      ctx.expectedIncrementalRecoveryValue = score.expectedIncrementalRecoveryValue;
      ctx.estimatedInterventionCost = intervention.estimatedInterventionCost;
      ctx.expectedNetRecoveryValue = intervention.expectedNetRecoveryValue;
      ctx.decision = intervention.decision;
      ctx.decisionReason = intervention.decisionReason;
      ctx.recommendedAction = intervention.action;
      ctx.diagnosis = diagnosis.category;
    }

    // 5. Policy Engine Check
    if (!ctx.recommendedAction) {
      throw new Error(`Case ${caseId} is missing recommendedAction for policy evaluation`);
    }

    // Legacy mapping: Convert historical 'retry_payment' or 'Retry Payment' to canonical 'create_recovery_payment'
    if (ctx.recommendedAction === 'retry_payment' || ctx.recommendedAction === 'Retry Payment') {
      ctx.recommendedAction = 'create_recovery_payment';
      await this.repo.saveCaseState(caseId, ctx.status, { recommendedAction: 'create_recovery_payment' });
    }

    const policyDecision = evaluatePolicy({
      policy: ctx.policy,
      currentAttemptCount: ctx.attemptCount,
      caseStatus: ctx.status,
      lastActionAt: ctx.lastActionAt,
      caseCreatedAt: ctx.createdAt,
      amountAtRisk: ctx.amountAtRisk,
      action: ctx.recommendedAction as ActionType,
      hasPromiseToPay: ctx.hasPromiseToPay,
    });

    if (!policyDecision.allowed) {
      const finalDecision: RecoveryDecision = policyDecision.escalate ? 'ESCALATE' : 'ABSTAIN';
      ctx.decision = finalDecision;
      ctx.decisionReason = policyDecision.reason;

      await this.repo.saveAudit(caseId, finalDecision === 'ESCALATE' ? 'DECISION_ESCALATE' : 'DECISION_ABSTAIN', policyDecision.reason);
      await this.repo.saveAudit(caseId, 'POLICY_CHECKED', `Action blocked by policy: ${policyDecision.reason}`);
      await this.repo.saveAudit(caseId, 'ACTION_BLOCKED', `Blocked action: ${ctx.recommendedAction}`);
      
      if (policyDecision.stop) {
        const nextStatus = policyDecision.escalate ? 'escalated' : 'stopped';
        validateTransition(ctx.status, nextStatus);
        await this.repo.saveCaseState(caseId, nextStatus, {
          decision: finalDecision,
          decisionReason: policyDecision.reason
        });
        await this.repo.saveAudit(caseId, nextStatus === 'escalated' ? 'RECOVERY_ESCALATED' : 'RECOVERY_STOPPED', policyDecision.reason);
      }
      return;
    }

    // Policy allowed. Now evaluate economic net value (Primary ABSTAIN condition: expectedNetRecoveryValue <= 0)
    if (ctx.expectedNetRecoveryValue !== undefined && ctx.expectedNetRecoveryValue <= 0) {
      const abstainReason = 'The estimated incremental recovery value does not justify the intervention cost.';
      ctx.decision = 'ABSTAIN';
      ctx.decisionReason = abstainReason;

      await this.repo.saveAudit(caseId, 'DECISION_ABSTAIN', abstainReason);
      await this.repo.saveCaseState(caseId, ctx.status, {
        decision: 'ABSTAIN',
        decisionReason: abstainReason,
      });
      // Stopped from taking further costly automation
      return;
    }

    // Both economics and policy approve -> ACT!
    ctx.decision = 'ACT';
    ctx.decisionReason = 'Estimated incremental recovery value exceeds intervention cost and remains within merchant policy.';
    await this.repo.saveAudit(caseId, 'DECISION_ACT', `Expected Net Recovery Value: ₹${(ctx.expectedNetRecoveryValue || 0).toLocaleString('en-IN')}`);
    await this.repo.saveAudit(caseId, 'POLICY_CHECKED', 'Action approved by policy');
    await this.repo.saveAudit(caseId, 'ACTION_APPROVED', `Approved action: ${ctx.recommendedAction}`);

    // 6. Idempotency & Action Creation
    const targetAttempt = ctx.attemptCount + 1;
    const actionRecord = await this.repo.createAction(caseId, ctx.recommendedAction as ActionType, targetAttempt, ctx.policy?.id);
    
    if (actionRecord.existing) {
      // Idempotency guard: Action already exists/completed, skip execution
      return;
    }

    // Wait until action succeeds before transitioning to 'recovering'
    // Note: attemptCount is strictly updated in the case state *after* successful action evaluation, 
    // but the action record itself immediately reflects the attempt to prevent duplicate identical execution.

    // 7. Execution
    try {
      const result = await this.actionProvider.execute({
        caseId,
        actionType: ctx.recommendedAction as ActionType,
        attemptNumber: targetAttempt,
        amount: ctx.amountAtRisk,
        metadata: ctx.metadata,
      });

      await this.repo.saveAudit(caseId, 'ACTION_EXECUTED', `Executed ${ctx.recommendedAction}. Result: ${result.status}`, actionRecord.id);
      await this.repo.updateActionOutcome(actionRecord.id, result.status, result.resultDetails, result.amountRecovered);

      // 8. Outcome Verification & State Transition
      if (result.status === 'succeeded' && ctx.recommendedAction !== 'escalate' && ctx.recommendedAction !== 'manual_review' && ctx.recommendedAction !== 'stop_recovery') {
        
        const requiresCustomerAction = 
          result.requiresCustomerAction ?? (
            ctx.recommendedAction === 'create_recovery_payment' || 
            ctx.recommendedAction === 'send_checkout_recovery' ||
            ctx.recommendedAction === 'send_payment_reminder' || 
            ctx.recommendedAction === 'start_promise_to_pay' || 
            ctx.recommendedAction === 'hinglish_recovery_message'
          );

        if (requiresCustomerAction) {
          // Transition to recovering and store context.
          validateTransition(ctx.status, 'recovering');
          const updates: Partial<FullCaseContext> = { attemptCount: targetAttempt };
          
          if (ctx.recommendedAction === 'start_promise_to_pay') {
            updates.promiseStatus = 'promised';
          }
          if (result.resultDetails) {
            updates.metadata = { ...ctx.metadata, recoveryOrderId: result.resultDetails };
          }
          
          await this.repo.saveCaseState(caseId, 'recovering', updates);
          ctx.status = 'recovering';
          ctx.attemptCount = targetAttempt;
          
          if (ctx.recommendedAction === 'start_promise_to_pay') {
            await this.repo.saveAudit(caseId, 'PROMISE_TO_PAY_CREATED', 'Customer promise to pay recorded. Awaiting payment.');
          } else {
            await this.repo.saveAudit(caseId, 'ACTION_PENDING_CUSTOMER', `Action requires customer completion. Awaiting response/payment.`);
          }
        } else {
          // Immediate automated recovery success (e.g. automated retry_subscription, retry_mandate)
          validateTransition(ctx.status, 'recovering'); 
          ctx.status = 'recovering';
          validateTransition(ctx.status, 'recovered');
          await this.repo.saveCaseState(caseId, 'recovered', { attemptCount: targetAttempt });
          ctx.status = 'recovered';
          ctx.attemptCount = targetAttempt;
          await this.repo.saveAudit(caseId, 'PAYMENT_RECOVERED', `Successfully recovered ₹${result.amountRecovered}`);
        }
      } else {
        // The action failed or was an escalate action
        validateTransition(ctx.status, 'recovering');
        ctx.status = 'recovering';
        validateTransition(ctx.status, 'failed');
        await this.repo.saveCaseState(caseId, 'failed', { attemptCount: targetAttempt }); 
        
        if (ctx.recommendedAction !== 'escalate' && ctx.recommendedAction !== 'manual_review') {
          validateTransition('failed', 'ready');
          await this.repo.saveCaseState(caseId, 'ready', {});
        } else {
          // If the action was manual_review or escalate, it stops the automated loop
          const endState = ctx.recommendedAction === 'manual_review' ? 'stopped' : 'escalated';
          validateTransition('failed', endState);
          await this.repo.saveCaseState(caseId, endState, {});
        }
      }
    } catch {
      // Graceful error handling - move back to ready via recovering -> failed, update attempt
      await this.repo.updateActionOutcome(actionRecord.id, 'failed', 'Unexpected provider error', 0);
      validateTransition(ctx.status, 'recovering');
      ctx.status = 'recovering';
      validateTransition(ctx.status, 'failed');
      await this.repo.saveCaseState(caseId, 'failed', { attemptCount: targetAttempt });
      validateTransition('failed', 'ready');
      await this.repo.saveCaseState(caseId, 'ready', {});
    }
  }
}
