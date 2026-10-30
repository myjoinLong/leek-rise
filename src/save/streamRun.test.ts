import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../core/reducer';
import { createInitialState } from '../core/state';
import type { GameState, PlayerGender, StreamChoice } from '../core/types';
import { loadSavedGame, saveGame } from './storage';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

const routes: {
  choices: readonly StreamChoice[];
  audience: number;
  trust: number;
  income: number;
  fameDelta: number;
}[] = [
  { choices: ['HONEST_REVIEW', 'ANSWER_QUESTIONS', 'TRANSPARENT_DEAL'], audience: 46, trust: 80, income: 90, fameDelta: 3 },
  { choices: ['HONEST_REVIEW', 'ANSWER_QUESTIONS', 'FAKE_SCARCITY'], audience: 53, trust: 58, income: 125, fameDelta: 1 },
  { choices: ['HONEST_REVIEW', 'REPEAT_CTA', 'TRANSPARENT_DEAL'], audience: 54, trust: 69, income: 115, fameDelta: 2 },
  { choices: ['HONEST_REVIEW', 'REPEAT_CTA', 'FAKE_SCARCITY'], audience: 61, trust: 47, income: 150, fameDelta: 0 },
  { choices: ['HYPE_CLAIM', 'ANSWER_QUESTIONS', 'TRANSPARENT_DEAL'], audience: 56, trust: 60, income: 115, fameDelta: 2 },
  { choices: ['HYPE_CLAIM', 'ANSWER_QUESTIONS', 'FAKE_SCARCITY'], audience: 63, trust: 38, income: 150, fameDelta: -1 },
  { choices: ['HYPE_CLAIM', 'REPEAT_CTA', 'TRANSPARENT_DEAL'], audience: 64, trust: 49, income: 140, fameDelta: 0 },
  { choices: ['HYPE_CLAIM', 'REPEAT_CTA', 'FAKE_SCARCITY'], audience: 71, trust: 27, income: 175, fameDelta: -2 },
];
const honest: readonly StreamChoice[] = ['HONEST_REVIEW', 'ANSWER_QUESTIONS', 'TRANSPARENT_DEAL'];
const hype: readonly StreamChoice[] = ['HYPE_CLAIM', 'REPEAT_CTA', 'FAKE_SCARCITY'];

function initial(gender: PlayerGender = 'MALE'): GameState {
  return { ...createInitialState(17), phase: 'DAYTIME', gender, fame: 15, energy: 120, energyMax: 120 };
}

async function restore(state: GameState): Promise<GameState> {
  await saveGame(state);
  const loaded = await loadSavedGame();
  expect(loaded).toEqual(state);
  if (!loaded) throw new Error('Expected stream save.');
  return loaded;
}

function complete(state: GameState, choices: readonly StreamChoice[]): GameState {
  return choices.reduce((current, choice) => gameReducer(current, { type: 'CHOOSE_STREAM_OPTION', choice }),
    gameReducer(state, { type: 'START_STREAM_RUN' }));
}

function advance(state: GameState, count: number): GameState {
  for (let index = 0; index < count; index += 1) state = gameReducer(state, { type: 'ADVANCE_PHASE' });
  return state;
}

describe.each(['MALE', 'FEMALE'] as const)('%s stream receipts across the save boundary', (gender) => {
  it.each(routes)('settles $choices once, preserving cash and reputation separately', async (route) => {
    const baseline = initial(gender);
    const income = route.income * (gender === 'FEMALE' ? 1.2 : 1);
    let state = await restore(gameReducer(baseline, { type: 'START_STREAM_RUN' }));
    for (const [index, choice] of route.choices.entries()) {
      state = await restore(gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice }));
      expect(state.energy).toBe(115 - index * 5);
      expect(state.dailyWorkIncome).toBe(0);
      expect(state.workedToday).toBe(false);
      expect(state.debt).toBe(18000);
      expect(state.stocks).toEqual(baseline.stocks);
      if (index < 2) {
        expect(state.cash).toBe(3200);
        expect(state.fame).toBe(15);
        expect(state.dailyStreamIncome).toBe(0);
        expect(state.weeklyStreamIncome).toBe(0);
      }
    }
    expect(state.activeActivity).toMatchObject({
      status: 'RESULT', income, audience: route.audience, trust: route.trust,
      fameDelta: route.fameDelta, energySpent: 15,
      decisions: route.choices.map((choice) => ({ choice })),
    });
    expect(state.cash).toBe(3200 + income);
    expect(state.dailyStreamIncome).toBe(income);
    expect(state.weeklyStreamIncome).toBe(income);
    expect(state.fame).toBe(15 + route.fameDelta);
    for (const choice of route.choices) {
      expect(gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice })).toBe(state);
    }
    expect(gameReducer(state, { type: 'ABANDON_STREAM_RUN' })).toBe(state);
    state = await restore(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }));
    expect(state.activeActivity).toBeNull();
    expect(state.phase).toBe('DAYTIME');
    expect(gameReducer(state, { type: 'START_STREAM_RUN' })).toBe(state);
    state = await restore(advance(state, 2));
    expect(state.phase).toBe('NIGHT');
    expect(state.cash).toBe(3200 + income);
    expect(state.dailyStreamIncome).toBe(income);
  });
});

describe('stream exit and weekly accounting', () => {
  it.each([0, 1, 2])('restores exit after %s segments without income, fame or energy refunds', async (count) => {
    let state = gameReducer(initial(), { type: 'START_STREAM_RUN' });
    for (const choice of honest.slice(0, count)) state = gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice });
    state = await restore(gameReducer(await restore(state), { type: 'ABANDON_STREAM_RUN' }));
    expect(state).toMatchObject({
      activeActivity: null, cash: 3200, debt: 18000, fame: 15, energy: 120 - count * 5,
      dailyStreamIncome: 0, weeklyStreamIncome: 0, streamedToday: true, workedToday: false,
    });
    expect(gameReducer(state, { type: 'START_STREAM_RUN' })).toBe(state);
    expect(gameReducer(state, { type: 'ABANDON_STREAM_RUN' })).toBe(state);
    expect(gameReducer(state, { type: 'START_CAFE_SHIFT' }).activeActivity?.id).toBe('SUJIE_CAFE_SHIFT');
    state = await restore(advance(state, 4));
    expect(state).toMatchObject({ day: 2, phase: 'DAYTIME', streamedToday: false, energy: 120 });
    expect(gameReducer(state, { type: 'START_STREAM_RUN' }).activeActivity?.status).toBe('ACTIVE');
  });

  it('carries two days of gross income into one platform charge and restores without recharging', async () => {
    let state = complete({ ...initial(), day: 6 }, honest);
    state = await restore(advance(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }), 4));
    expect(state).toMatchObject({ day: 7, dailyStreamIncome: 0, weeklyStreamIncome: 90, cash: 3290 });
    state = await restore(complete(state, hype));
    expect(state).toMatchObject({ cash: 3465, dailyStreamIncome: 175, weeklyStreamIncome: 265 });
    state = await restore(advance(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }), 2));
    expect(state).toMatchObject({
      phase: 'NIGHT', cash: 3121.75, debt: 18090, dailyStreamIncome: 175, weeklyStreamIncome: 0,
      lastPeriodicSettlementDay: 7,
      periodicCostLedger: { interest: 90, rent: 240, membership: 30, equipment: 60, platformShare: 13.25 },
    });
    expect(gameReducer(state, { type: 'CHANGE_PHASE', phase: 'NIGHT' })).toEqual(state);
    state = await restore(advance(state, 1));
    expect(state).toMatchObject({ day: 8, cash: 3121.75, dailyStreamIncome: 0, weeklyStreamIncome: 0 });
    state = await restore(advance(state, 27));
    expect(state).toMatchObject({ day: 14, phase: 'NIGHT', cash: 2791.75, weeklyStreamIncome: 0 });
    expect(state.periodicCostLedger.platformShare).toBe(0);
  });

  it('rejects entry below the full-run energy budget without consuming the daily slot', () => {
    const state = { ...initial(), energy: 14 };
    expect(gameReducer(state, { type: 'START_STREAM_RUN' })).toBe(state);
    expect(gameReducer({ ...state, energy: 15 }, { type: 'START_STREAM_RUN' }).activeActivity?.status).toBe('ACTIVE');
  });
});
