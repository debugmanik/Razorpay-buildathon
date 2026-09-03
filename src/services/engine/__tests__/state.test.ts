import { validateTransition, StateTransitionError, isTerminalState } from '../state';

describe('State Machine', () => {
  it('allows valid transitions', () => {
    expect(validateTransition('detected', 'analyzing')).toBe(true);
    expect(validateTransition('analyzing', 'ready')).toBe(true);
    expect(validateTransition('ready', 'recovering')).toBe(true);
    expect(validateTransition('recovering', 'recovered')).toBe(true);
    expect(validateTransition('recovering', 'failed')).toBe(true);
    expect(validateTransition('failed', 'ready')).toBe(true);
  });

  it('allows transition to self (no-op)', () => {
    expect(validateTransition('ready', 'ready')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(() => validateTransition('recovered', 'recovering')).toThrow(StateTransitionError);
    expect(() => validateTransition('stopped', 'ready')).toThrow(StateTransitionError);
    expect(() => validateTransition('ready', 'detected')).toThrow(StateTransitionError);
  });

  it('correctly identifies terminal states', () => {
    expect(isTerminalState('recovered')).toBe(true);
    expect(isTerminalState('stopped')).toBe(true);
    expect(isTerminalState('escalated')).toBe(true);
    expect(isTerminalState('ready')).toBe(false);
    expect(isTerminalState('recovering')).toBe(false);
  });
});
