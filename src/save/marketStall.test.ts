import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../core/reducer';
import { createInitialState } from '../core/state';
import { loadSavedGame, saveGame } from './storage';
import { saveVersion } from './schemas';
import { stallMarketDayFor } from '../core/marketStallScenarios';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

describe('Lao Liang stall save compatibility', () => {
  it('round trips a selected product and an active stall without duplicating the work slot', async () => {
    let state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_LAOLIANG_STALL' });
    state = gameReducer(state, { type: 'SELECT_STALL_PRODUCT', product: 'THERMOS' });
    await saveGame(state);

    const restored = await loadSavedGame();
    expect(saveVersion).toBe(27);
    expect(restored).toEqual(state);
    expect(restored?.workedToday).toBe(true);
    expect(restored?.activeActivity).toMatchObject({ id: 'LAOLIANG_MARKET_STALL', status: 'ACTIVE', scenarioVersion: 3, scenarioSeed: 4, selectedProduct: 'THERMOS' });
  });

  it('keeps legacy in-progress shifts on their original fixed customers after restore', async () => {
    let state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_LAOLIANG_STALL' });
    const run = state.activeActivity;
    if (run?.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE') throw new Error('Expected an active stall shift.');
    const { scenarioVersion, scenarioSeed, ...legacyRun } = run;
    void scenarioVersion;
    void scenarioSeed;
    state = { ...state, activeActivity: legacyRun };
    await saveGame(state);

    const restored = await loadSavedGame();
    expect(restored).toEqual(state);
    if (!restored) throw new Error('Expected a restored legacy stall shift.');
    state = gameReducer(restored, { type: 'SELECT_STALL_PRODUCT', product: 'THERMOS' });
    state = gameReducer(state, { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' });
    expect(state.activeActivity).toMatchObject({ status: 'ACTIVE', step: 1, decisions: [{ unitsSold: 2, commission: 18 }] });
  });

  it('restores a version 2 shift on its original continuation cycle', async () => {
    const started = gameReducer({ ...createInitialState(), day: 31, phase: 'DAYTIME' }, { type: 'START_LAOLIANG_STALL' });
    const run = started.activeActivity;
    if (run?.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE') throw new Error('Expected an active stall shift.');
    const state = { ...started, activeActivity: { ...run, scenarioVersion: 2 as const } };
    await saveGame(state);

    const restored = await loadSavedGame();
    expect(restored).toEqual(state);
    expect(restored?.activeActivity).toMatchObject({ scenarioVersion: 2, scenarioSeed: 4, day: 31 });
    expect(stallMarketDayFor(31, 4, 2).title).toBe(stallMarketDayFor(1, 4, 2).title);
  });

  it('keeps an in-progress version 14 risk replay readable after adding the new activity', async () => {
    const state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_RISK_REPLAY' });
    store.value = { version: 14, savedAt: 1, state };

    expect(await loadSavedGame()).toEqual(state);
  });
});
