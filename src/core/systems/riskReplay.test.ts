import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { createEmptyNpcActivityMemory } from '../npcActivityMemory';
import { riskReplayCaseForRun, riskReplayScenarioAt, riskReplayScenarioCount, riskReplayScenarioIndex } from '../riskReplayScenarios';
import { riskReplayPolicy } from './riskReplay';
import { riskReplaySchema } from '../../save/riskReplaySchema';

const money = (value: number): number => Number(value.toFixed(2));

function start(overrides: Partial<GameState> = {}): GameState {
  return gameReducer({ ...createInitialState(), phase: 'DAYTIME', ...overrides }, { type: 'START_RISK_REPLAY' });
}

describe('sweeper position allocation replay', () => {
  it('starts without a payment, reserves the daily visit, and rejects unmet entry conditions', () => {
    const state = start({ energy: 12 });
    expect(state.activeActivity).toMatchObject({ status: 'ACTIVE', equity: 10000, step: 0, scenarioVersion: 2, scenarioSeed: 4 });
    expect(state.energy).toBe(12);
    expect(state.cash).toBe(3200);
    expect(state.riskReplayVisitedToday).toBe(true);
    for (const override of [{ energy: 11 }, { phase: 'TRADING' as const }, { riskReplayVisitedToday: true }]) {
      expect(start(override).activeActivity).toBeNull();
    }
  });

  it.each([NaN, Infinity, -1, 101, 0.5])('rejects invalid allocation %s without consuming energy', (allocation) => {
    const state = start();
    expect(gameReducer(state, { type: 'COMMIT_RISK_ALLOCATION', allocation })).toBe(state);
  });

  it('compounds virtual positions, discloses stress breaches, and leaves real economy untouched', () => {
    let state = start();
    const initialRun = state.activeActivity;
    if (initialRun?.id !== 'SWEEPER_RISK_REPLAY') throw new Error('Expected active replay.');
    const real = { cash: state.cash, debt: state.debt, stocks: state.stocks, marketIntel: state.marketIntel,
      dailyFees: state.dailyFees, workedToday: state.workedToday };
    const expected: Array<{ invested: number; stressLoss: number; withinBudget: boolean; pnl: number; fullPositionPnl: number }> = [];
    let equity: number = riskReplayPolicy.startingEquity;
    for (const [step, allocation] of [25, 100, 0].entries()) {
      const run = state.activeActivity;
      if (run?.id !== 'SWEEPER_RISK_REPLAY' || run.status !== 'ACTIVE') throw new Error('Expected active replay step.');
      const sample = riskReplayCaseForRun(initialRun, step as 0 | 1 | 2);
      const invested = money(equity * allocation / 100);
      const stressLoss = money(invested * sample.stressPercent / 100);
      const pnl = money(invested * sample.returnPercent / 100);
      expected.push({ invested, stressLoss, withinBudget: stressLoss <= riskReplayPolicy.lossBudget, pnl,
        fullPositionPnl: money(equity * sample.returnPercent / 100) });
      equity = money(equity + pnl);
      state = gameReducer(state, { type: 'COMMIT_RISK_ALLOCATION', allocation });
    }
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', step: 3, equity, energySpent: 12,
      respectedBudget: expected.filter((entry) => entry.withinBudget).length, decisions: expected });
    expect(state.energy).toBe(88);
    expect(state).toMatchObject(real);
    expect(gameReducer(state, { type: 'COMMIT_RISK_ALLOCATION', allocation: 100 })).toBe(state);
    expect(gameReducer(state, { type: 'ABANDON_RISK_REPLAY' })).toBe(state);
    const returned = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(returned.activeActivity).toBeNull();
    expect(gameReducer(returned, { type: 'START_RISK_REPLAY' })).toBe(returned);
  });

  it('supports cash as a valid position and treats risk discipline separately from profit', () => {
    let cash = start();
    let full = start();
    for (let round = 0; round < 3; round += 1) {
      cash = gameReducer(cash, { type: 'COMMIT_RISK_ALLOCATION', allocation: 0 });
      full = gameReducer(full, { type: 'COMMIT_RISK_ALLOCATION', allocation: 100 });
    }
    expect(cash.activeActivity).toMatchObject({ equity: 10000, respectedBudget: 3 });
    const fullRun = full.activeActivity;
    if (fullRun?.id !== 'SWEEPER_RISK_REPLAY') throw new Error('Expected full position replay.');
    let expectedEquity: number = riskReplayPolicy.startingEquity;
    for (const step of [0, 1, 2] as const) {
      expectedEquity = money(expectedEquity + money(expectedEquity * riskReplayCaseForRun(fullRun, step).returnPercent / 100));
    }
    expect(full.activeActivity).toMatchObject({ equity: expectedEquity });
    const one = gameReducer(start(), { type: 'COMMIT_RISK_ALLOCATION', allocation: 100 });
    const oneRun = one.activeActivity;
    if (oneRun?.id !== 'SWEEPER_RISK_REPLAY') throw new Error('Expected one-step replay.');
    const firstReturn = riskReplayCaseForRun(oneRun, 0).returnPercent;
    expect(one.activeActivity).toMatchObject({ equity: money(10000 + 10000 * firstReturn / 100),
      decisions: [{ withinBudget: false, pnl: money(10000 * firstReturn / 100) }] });
  });

  it('locks peripheral actions, retains spent energy on exit, and resets visits on a real new day', () => {
    const begun = start();
    const state = gameReducer(begun, { type: 'COMMIT_RISK_ALLOCATION', allocation: 20 });
    for (const action of [{ type: 'ADVANCE_PHASE' }, { type: 'ADVANCE_TICK' }, { type: 'START_DELIVERY_RUN' },
      { type: 'CHANGE_PHASE', phase: 'NIGHT' }, { type: 'RETURN_FROM_ACTIVITY' }] as const) {
      expect(gameReducer(state, action)).toBe(state);
    }
    const exited = gameReducer(state, { type: 'ABANDON_RISK_REPLAY' });
    expect(exited.energy).toBe(96);
    expect(exited.cash).toBe(3200);
    expect(gameReducer(exited, { type: 'START_RISK_REPLAY' })).toBe(exited);
    let next = exited;
    for (let phase = 0; phase < 4; phase += 1) next = gameReducer(next, { type: 'ADVANCE_PHASE' });
    expect(next.day).toBe(2);
    expect(next.phase).toBe('DAYTIME');
    expect(next.riskReplayVisitedToday).toBe(false);
    expect(gameReducer(next, { type: 'START_RISK_REPLAY' }).activeActivity).toMatchObject({ step: 0 });
  });

  it('schedules every daily scenario once per finite deck and repeats only after the deck ends', () => {
    const sequence = Array.from({ length: riskReplayScenarioCount }, (_, day) => riskReplayScenarioIndex(day + 1, 47));
    expect(new Set(sequence).size).toBe(riskReplayScenarioCount);
    expect(sequence).toEqual(Array.from({ length: riskReplayScenarioCount }, (_, day) => riskReplayScenarioIndex(day + 1, 47)));
    expect(riskReplayScenarioIndex(riskReplayScenarioCount + 1, 47)).toBe(sequence[0]);
    expect(riskReplayScenarioIndex(2, 48)).not.toBe(sequence[1]);
  });

  it('does not quote incomplete legacy score memory as a completed three-step review', () => {
    const memory = createEmptyNpcActivityMemory();
    memory.sweeper.lastTrace = { activityId: 'SWEEPER_RISK_REPLAY', choiceKeys: ['ALLOCATION_20'], outcomeCode: null,
      cashDelta: null, score: 2 };
    expect(start({ npcActivityMemory: memory }).activeActivity).toMatchObject({ priorBudgetScore: null });
  });

  it('requires day, seed, scenario, choices, and recorded score to reconcile before quoting a prior run', () => {
    const scenarioIndex = riskReplayScenarioIndex(1, 4);
    const completeTrace = {
      day: 1, scenarioVersion: 2, scenarioSeed: 4, scenarioIndex,
      activityId: 'SWEEPER_RISK_REPLAY' as const,
      choiceKeys: ['ALLOCATION_0', 'ALLOCATION_0', 'ALLOCATION_0'],
      outcomeCode: null, cashDelta: null, score: 3,
    };
    const invalidTraces = [
      { ...completeTrace, day: 2 },
      { ...completeTrace, day: 3 },
      { ...completeTrace, scenarioSeed: 5 },
      { ...completeTrace, scenarioIndex: (scenarioIndex + 1) % riskReplayScenarioCount },
      { ...completeTrace, score: 2 },
      { ...completeTrace, choiceKeys: ['ALLOCATION_0'] },
    ];
    for (const trace of invalidTraces) {
      const memory = createEmptyNpcActivityMemory();
      memory.sweeper.lastTrace = trace;
      const run = start({ day: 2, npcActivityMemory: memory }).activeActivity;
      expect(run).toMatchObject({ priorBudgetScore: null });
      expect(run).not.toHaveProperty('priorReview');
    }
  });

  it('replays the first prior over-budget stress in a new virtual case', () => {
    const memory = createEmptyNpcActivityMemory();
    const previousScenarioIndex = riskReplayScenarioIndex(1, 4);
    const previousScenario = riskReplayScenarioAt(previousScenarioIndex);
    memory.sweeper.lastTrace = {
      day: 1, scenarioVersion: 2, scenarioSeed: 4, scenarioIndex: previousScenarioIndex,
      activityId: 'SWEEPER_RISK_REPLAY', choiceKeys: ['ALLOCATION_0', 'ALLOCATION_100', 'ALLOCATION_0'],
      outcomeCode: null, cashDelta: null, score: 2,
    };
    const state = start({ day: 2, npcActivityMemory: memory });
    const run = state.activeActivity;
    if (run?.id !== 'SWEEPER_RISK_REPLAY' || run.status !== 'ACTIVE') throw new Error('Expected active replay.');
    expect(run.priorReview).toMatchObject({
      previousDay: 1, previousStep: 1, previousAllocation: 100,
      stressPercent: previousScenario.cases[1].stressPercent,
    });
    const repeatedCase = riskReplayCaseForRun(run, 0);
    expect(repeatedCase.stressPercent).toBe(previousScenario.cases[1].stressPercent);
    expect(repeatedCase.returnPercent).toBe(riskReplayScenarioAt(run.scenarioIndex ?? 0).cases[0].returnPercent);
    expect(riskReplaySchema.safeParse(run).success).toBe(true);
  });

  it('does not create a pressure replay from a fully budget-respecting trace', () => {
    const memory = createEmptyNpcActivityMemory();
    const scenarioIndex = riskReplayScenarioIndex(1, 4);
    memory.sweeper.lastTrace = {
      day: 1, scenarioVersion: 2, scenarioSeed: 4, scenarioIndex,
      activityId: 'SWEEPER_RISK_REPLAY', choiceKeys: ['ALLOCATION_0', 'ALLOCATION_0', 'ALLOCATION_0'],
      outcomeCode: null, cashDelta: null, score: 3,
    };
    expect(start({ day: 2, npcActivityMemory: memory }).activeActivity).toMatchObject({ priorBudgetScore: 3 });
    expect(start({ day: 2, npcActivityMemory: memory }).activeActivity).not.toHaveProperty('priorReview');
  });
});
