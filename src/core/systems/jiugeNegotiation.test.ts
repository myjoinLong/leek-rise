import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState, JiugeNegotiationChoice } from '../types';
import { getJiugeNegotiationScenario, getJiugeNegotiationScenarioIndex, jiugeNegotiationScenarioCount } from '../jiugeNegotiationScenarios';
import { jiugeNegotiationSchema } from '../../save/jiugeNegotiationSchema';

function crisisState(): GameState {
  return { ...createInitialState(), day: 30, phase: 'DAYTIME', debtCrisisStarted: true };
}

function finishNegotiation(state: GameState, choices: readonly JiugeNegotiationChoice[]): GameState {
  let next = gameReducer(state, { type: 'START_JIUGE_NEGOTIATION' });
  for (const choice of choices) next = gameReducer(next, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice });
  return next;
}

describe('Jiuge debt negotiation activity', () => {
  it('replays a seed-stable crisis scene and gives each first-chapter day a distinct context', () => {
    const days = Array.from({ length: jiugeNegotiationScenarioCount }, (_, index) => 30 + index);
    const sequence = days.map((day) => getJiugeNegotiationScenarioIndex(day, 47));
    const otherSeed = days.map((day) => getJiugeNegotiationScenarioIndex(day, 48));

    expect(new Set(sequence).size).toBe(jiugeNegotiationScenarioCount);
    expect(days.map((day) => getJiugeNegotiationScenarioIndex(day, 47))).toEqual(sequence);
    expect(otherSeed).not.toEqual(sequence);
    expect(sequence.every((index) => getJiugeNegotiationScenario(index) !== null)).toBe(true);
  });

  it('stores the selected scene in the activity snapshot without changing negotiation terms', () => {
    const initial = { ...crisisState(), scenarioSeed: 47, cash: 3300, dailyWorkIncome: 100 };
    const opened = gameReducer(initial, { type: 'START_JIUGE_NEGOTIATION' });
    expect(opened.activeActivity).toMatchObject({
      id: 'JIUGE_NEGOTIATION', scenarioVersion: 2, scenarioSeed: 47,
      scenarioIndex: getJiugeNegotiationScenarioIndex(initial.day, 47),
    });
    expect(jiugeNegotiationSchema.safeParse(opened.activeActivity).success).toBe(true);
    const legacyRun = {
      id: 'JIUGE_NEGOTIATION' as const, day: opened.day, status: 'ACTIVE' as const, step: 0 as const, decisions: [],
    };
    expect(jiugeNegotiationSchema.safeParse(legacyRun).success).toBe(true);

    const result = gameReducer(opened, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });
    const advanced = gameReducer(result, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' });
    const settled = gameReducer(advanced, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'ASK_INTEREST_GRACE' });
    expect(settled.activeActivity).toMatchObject({
      status: 'RESULT', outcome: 'INTEREST_GRACE', scenarioVersion: 2, scenarioSeed: 47,
      scenarioIndex: getJiugeNegotiationScenarioIndex(initial.day, 47),
    });
    expect(jiugeNegotiationSchema.safeParse(settled.activeActivity).success).toBe(true);
    expect(settled.cash).toBe(initial.cash);
    expect(settled.debt).toBe(initial.debt);
    expect(settled.debtInterestGraceWeeksRemaining).toBe(1);
  });

  it('remembers the optional personal question without changing cash, debt, or negotiation choices', () => {
    const initial = { ...crisisState(), cash: 3300, dailyWorkIncome: 100 };
    const opened = gameReducer(initial, { type: 'START_JIUGE_NEGOTIATION' });
    const asked = gameReducer(opened, { type: 'ASK_JIUGE_HISTORY' });

    expect(asked.activeActivity).toMatchObject({ id: 'JIUGE_NEGOTIATION', status: 'ACTIVE', step: 0, askedAboutHistory: true });
    expect(asked.cash).toBe(initial.cash);
    expect(asked.debt).toBe(initial.debt);
    expect(jiugeNegotiationSchema.safeParse(asked.activeActivity).success).toBe(true);
    expect(gameReducer(asked, { type: 'ASK_JIUGE_HISTORY' })).toBe(asked);

    const result = gameReducer(asked, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });
    expect(result.activeActivity).toMatchObject({ step: 1, askedAboutHistory: true });
    expect(gameReducer(result, { type: 'ASK_JIUGE_HISTORY' })).toBe(result);

    const withIncome = { ...result, dailyWorkIncome: 100 };
    const proved = gameReducer(withIncome, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' });
    const completed = gameReducer(proved, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SIGN_STANDARD' });
    expect(jiugeNegotiationSchema.safeParse(completed.activeActivity).success).toBe(true);
    expect(completed.npcActivityMemory.jiuge.lastTrace?.choiceKeys).toContain('ASK_JIUGE_HISTORY');
  });

  it('earns one disclosed interest grace from ledger and income proof', () => {
    const state = { ...crisisState(), cash: 3300, dailyWorkIncome: 100 };
    const result = finishNegotiation(state, ['SHOW_LEDGER', 'PROVE_INCOME', 'ASK_INTEREST_GRACE']);
    expect(result.activeActivity).toMatchObject({ id: 'JIUGE_NEGOTIATION', status: 'RESULT', outcome: 'INTEREST_GRACE' });
    expect(result.debtNegotiationCompleted).toBe(true);
    expect(result.debtInterestGraceWeeksRemaining).toBe(1);
    expect(result.cash).toBe(state.cash);
    expect(result.debt).toBe(state.debt);

    const due = gameReducer({ ...result, activeActivity: null, day: 35, phase: 'TRADING' }, { type: 'ADVANCE_PHASE' });
    expect(due.periodicCostLedger.interestGraceApplied).toBe(true);
    expect(due.periodicCostLedger.interest).toBe(0);
    expect(due.debtInterestGraceWeeksRemaining).toBe(0);
    expect(due.debt).toBe(18000);
  });

  it('charges the disclosed fee for an eight-week lower-rate agreement', () => {
    const state = { ...crisisState(), cash: 3300, dailyWorkIncome: 100 };
    const result = finishNegotiation(state, ['SHOW_LEDGER', 'PROVE_INCOME', 'SIGN_RATE_RESTRUCTURE']);
    expect(result.activeActivity).toMatchObject({ id: 'JIUGE_NEGOTIATION', status: 'RESULT', outcome: 'RATE_RESTRUCTURE' });
    expect(result.cash).toBe(3100);
    expect(result.dailyContractFees).toBe(200);
    expect(result.dailyFees).toBe(state.dailyFees);
    expect(result.debt).toBe(state.debt);
    expect(result.debtRatePlanWeeksRemaining).toBe(8);

    const due = gameReducer({ ...result, activeActivity: null, day: 35, phase: 'TRADING' }, { type: 'ADVANCE_PHASE' });
    expect(due.periodicCostLedger.interest).toBe(45);
    expect(due.periodicCostLedger.rateRestructureApplied).toBe(true);
    expect(due.debtRatePlanWeeksRemaining).toBe(7);
  });

  it('does not sign the rate plan when the player lacks the cash to cover its fee', () => {
    let state = { ...crisisState(), cash: 199, dailyWorkIncome: 100 };
    state = gameReducer(state, { type: 'START_JIUGE_NEGOTIATION' });
    state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });
    state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' });
    const rejected = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SIGN_RATE_RESTRUCTURE' });
    expect(rejected).toBe(state);
    expect(rejected.cash).toBe(199);
    expect(rejected.dailyContractFees).toBe(0);
    expect(rejected.activeActivity).toMatchObject({ id: 'JIUGE_NEGOTIATION', status: 'ACTIVE', step: 2 });
  });

  it('does not grant grace without evidence and permits only one completed negotiation', () => {
    let result = finishNegotiation(crisisState(), ['BLUFF_CASHFLOW', 'PROMISE_FULL', 'ASK_INTEREST_GRACE']);
    expect(result.activeActivity).toMatchObject({ id: 'JIUGE_NEGOTIATION', status: 'RESULT', outcome: 'STANDARD_TERMS' });
    expect(result.debtNegotiationCompleted).toBe(true);
    expect(result.debtInterestGraceWeeksRemaining).toBe(0);
    result = gameReducer(result, { type: 'RETURN_FROM_ACTIVITY' });
    expect(gameReducer(result, { type: 'START_JIUGE_NEGOTIATION' })).toBe(result);
  });

  it('requires an active day-time debt crisis before opening the activity', () => {
    const state = { ...createInitialState(), phase: 'DAYTIME' as const };
    expect(gameReducer(state, { type: 'START_JIUGE_NEGOTIATION' })).toBe(state);
  });

  it('requires actual income before accepting the income-proof choice', () => {
    let state = gameReducer(crisisState(), { type: 'START_JIUGE_NEGOTIATION' });
    state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });
    const rejected = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' });
    expect(rejected).toBe(state);
    expect(rejected.activeActivity).toMatchObject({ id: 'JIUGE_NEGOTIATION', step: 1 });
  });
});
