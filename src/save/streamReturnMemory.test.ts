import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../core/reducer';
import { createInitialState } from '../core/state';
import type { GameState, StreamChoice } from '../core/types';
import { streamReturnContextFor } from '../core/streamRunMemory';
import { streamScenarioFor } from '../core/streamScenarios';
import { getStreamOptionEffect, streamIncomeRange } from '../core/systems/streamRun';
import { loadSavedGame, saveGame } from './storage';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

const honest: readonly StreamChoice[] = ['HONEST_REVIEW', 'ANSWER_QUESTIONS', 'TRANSPARENT_DEAL'];
const overclaim: readonly StreamChoice[] = ['HYPE_CLAIM', 'REPEAT_CTA', 'FAKE_SCARCITY'];

function initial(): GameState {
  return { ...createInitialState(17), phase: 'DAYTIME', gender: 'MALE', fame: 15, energy: 120, energyMax: 120 };
}

function complete(state: GameState, choices: readonly StreamChoice[]): GameState {
  state = gameReducer(state, { type: 'START_STREAM_RUN' });
  for (const choice of choices) state = gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice });
  return state;
}

function advance(state: GameState, count: number): GameState {
  for (let index = 0; index < count; index += 1) state = gameReducer(state, { type: 'ADVANCE_PHASE' });
  return state;
}

async function restore(state: GameState): Promise<GameState> {
  await saveGame(state);
  const loaded = await loadSavedGame();
  expect(loaded).toEqual(state);
  if (!loaded) throw new Error('Expected saved state.');
  return loaded;
}

describe('Xiao Lian remembers a previous misleading stream', () => {
  async function nextDayAfter(choiceSet: readonly StreamChoice[]): Promise<GameState> {
    const result = complete(initial(), choiceSet);
    return advance(gameReducer(result, { type: 'RETURN_FROM_ACTIVITY' }), 4);
  }

  it('restores the returning viewer context and exposes the changed first choice effects', async () => {
    const nextDay = await restore(await nextDayAfter(overclaim));
    const context = streamReturnContextFor(nextDay);
    expect(context).toMatchObject({ previousDay: 1, kind: 'OVERCLAIM' });
    expect(context?.previousProduct).toBe(streamScenarioFor(1, 3, 17).title);

    const started = await restore(gameReducer(nextDay, { type: 'START_STREAM_RUN' }));
    expect(started.activeActivity).toMatchObject({ returnContext: context });
    const scenario = streamScenarioFor(started.day, 3, started.scenarioSeed);
    const truthful = getStreamOptionEffect(0, 'HONEST_REVIEW', scenario, context ?? undefined);
    const hype = getStreamOptionEffect(0, 'HYPE_CLAIM', scenario, context ?? undefined);
    const ordinaryTruthful = getStreamOptionEffect(0, 'HONEST_REVIEW', scenario);
    expect(truthful?.trustDelta).toBe((ordinaryTruthful?.trustDelta ?? 0) + 8);
    expect(hype?.trustDelta).toBeLessThan(ordinaryTruthful?.trustDelta ?? 0);
  });

  it('keeps the advertised income range aligned with all eight routes after the return branch', async () => {
    const state = await nextDayAfter(overclaim);
    const context = streamReturnContextFor(state);
    const expected = streamIncomeRange(state.fame, state.gender, state.day, state.scenarioSeed, 3, context ?? undefined);
    const incomes: number[] = [];
    for (const first of ['HONEST_REVIEW', 'HYPE_CLAIM'] as const) {
      for (const second of ['ANSWER_QUESTIONS', 'REPEAT_CTA'] as const) {
        for (const third of ['TRANSPARENT_DEAL', 'FAKE_SCARCITY'] as const) {
          const result = complete(state, [first, second, third]).activeActivity;
          if (result?.id !== 'XIAOLIAN_STREAM' || result.status !== 'RESULT') throw new Error('Expected completed stream.');
          incomes.push(result.income);
        }
      }
    }
    expect(expected).toEqual({ minimum: Math.min(...incomes), maximum: Math.max(...incomes) });
  });

  it('does not return after an honest stream or when the seven-day memory window has expired', async () => {
    const honestState = await nextDayAfter(honest);
    expect(streamReturnContextFor(honestState)).toBeNull();

    const oldState = { ...await nextDayAfter(overclaim), day: 9 };
    expect(streamReturnContextFor(oldState)).toBeNull();
  });
});
