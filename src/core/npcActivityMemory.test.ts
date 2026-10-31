import { describe, expect, it } from 'vitest';
import { gameReducer } from './reducer';
import { createEmptyNpcActivityMemory } from './npcActivityMemory';
import { createInitialState } from './state';
import { cafeScenarioFor } from './systems/cafeShift';
import type { GameState } from './types';

describe('NPC activity memory', () => {
  it('creates isolated histories for every NPC', () => {
    const memory = createEmptyNpcActivityMemory();
    memory.sujie.recentTraces.push({
      activityId: 'SUJIE_CAFE_SHIFT', choiceKeys: [], outcomeCode: null, cashDelta: 0, score: 0,
    });

    expect(memory.jiuge.recentTraces).toEqual([]);
  });

  it('remembers a completed cafe shift across the next day without changing its payout', () => {
    const day = 8;
    let state: GameState = { ...createInitialState(91), day, phase: 'DAYTIME', energy: 120, energyMax: 120 };
    const startingCash = state.cash;
    const expectedChoices: string[] = [];
    state = gameReducer(state, { type: 'START_CAFE_SHIFT' });

    for (const step of [0, 1, 2] as const) {
      const run = state.activeActivity;
      if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Cafe shift did not start.');
      const scenario = cafeScenarioFor(day, step, 3, run.scenarioSeed ?? 4, run.returnContext ?? null);
      expectedChoices.push(scenario.correctChoice);
      state = gameReducer(state, { type: 'SERVE_CAFE_ORDER', choice: scenario.correctChoice });
      expect(state.npcActivityMemory.sujie.completedRuns).toBe(step === 2 ? 1 : 0);
    }

    expect(state.cash - startingCash).toBe(state.dailyWorkIncome);
    expect(state.npcActivityMemory.sujie.lastCompletedDay).toBe(day);
    expect(state.npcActivityMemory.sujie.lastTrace).toMatchObject({
      day,
      activityId: 'SUJIE_CAFE_SHIFT',
      choiceKeys: expectedChoices,
      cashDelta: state.dailyWorkIncome,
      score: 3,
    });
    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    state = { ...state, day: day + 1, phase: 'DAYTIME', workedToday: false, energy: 120 };
    state = gameReducer(state, { type: 'START_CAFE_SHIFT' });

    expect(state.npcActivityMemory.sujie.lastTrace?.activityId).toBe('SUJIE_CAFE_SHIFT');
  });

  it('does not count an abandoned shift as a completed interaction', () => {
    let state: GameState = { ...createInitialState(), phase: 'DAYTIME', energy: 120, energyMax: 120 };
    state = gameReducer(state, { type: 'START_CAFE_SHIFT' });
    const run = state.activeActivity;
    if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Cafe shift did not start.');
    const scenario = cafeScenarioFor(state.day, 0, 3, run.scenarioSeed ?? 4, run.returnContext ?? null);
    state = gameReducer(state, { type: 'SERVE_CAFE_ORDER', choice: scenario.correctChoice });
    state = gameReducer(state, { type: 'ABANDON_CAFE_SHIFT' });

    expect(state.npcActivityMemory.sujie).toEqual({ completedRuns: 0, lastCompletedDay: null, lastTrace: null, recentTraces: [] });
  });

  it('keeps the eight most recent completed encounters and the latest trace in sync', () => {
    let state: GameState = { ...createInitialState(41), phase: 'DAYTIME', energy: 120, energyMax: 120 };
    for (let day = 1; day <= 10; day += 1) {
      state = { ...state, day, phase: 'DAYTIME', workedToday: false, energy: 120, activeActivity: null };
      state = gameReducer(state, { type: 'START_CAFE_SHIFT' });
      for (const step of [0, 1, 2] as const) {
        const run = state.activeActivity;
        if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Cafe shift did not start.');
        const scenario = cafeScenarioFor(day, step, 3, run.scenarioSeed ?? 4, run.returnContext ?? null);
        state = gameReducer(state, { type: 'SERVE_CAFE_ORDER', choice: scenario.correctChoice });
      }
      state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    }

    const memory = state.npcActivityMemory.sujie;
    expect(memory.completedRuns).toBe(10);
    expect(memory.recentTraces).toHaveLength(8);
    expect(memory.recentTraces.map((trace) => trace.day)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(memory.recentTraces[0]?.activityId).toBe('SUJIE_CAFE_SHIFT');
    expect(memory.lastTrace).toEqual(memory.recentTraces.at(-1));
    expect(memory.lastCompletedDay).toBe(10);
  });
});
