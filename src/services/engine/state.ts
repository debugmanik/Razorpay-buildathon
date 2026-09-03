import { CaseStatus } from '@/types/domain';

const VALID_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  detected: ['analyzing', 'stopped', 'escalated'],
  analyzing: ['ready', 'stopped', 'escalated'],
  ready: ['recovering', 'stopped', 'escalated'],
  recovering: ['recovered', 'failed', 'stopped', 'escalated', 'ready'], // back to ready for next bounded step if eligible
  recovered: [], // Terminal state
  failed: ['ready', 'stopped', 'escalated'], // if it failed, it might go back to ready for retry, or terminal
  stopped: [], // Terminal state
  escalated: [], // Terminal state
};

export class StateTransitionError extends Error {
  constructor(public from: CaseStatus, public to: CaseStatus) {
    super(`Invalid state transition from '${from}' to '${to}'`);
    this.name = 'StateTransitionError';
  }
}

export function validateTransition(currentStatus: CaseStatus, targetStatus: CaseStatus): boolean {
  if (currentStatus === targetStatus) {
    return true; // No-op transition is safely allowed
  }

  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new StateTransitionError(currentStatus, targetStatus);
  }

  return true;
}

export function isTerminalState(status: CaseStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
