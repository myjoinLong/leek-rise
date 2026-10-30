import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../core/reducer';
import { createInitialState } from '../core/state';
import { loadSavedGame, saveGame } from './storage';
import { saveVersion } from './schemas';

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
    expect(saveVersion).toBe(18);
    expect(restored).toEqual(state);
    expect(restored?.workedToday).toBe(true);
    expect(restored?.activeActivity).toMatchObject({ id: 'LAOLIANG_MARKET_STALL', status: 'ACTIVE', selectedProduct: 'THERMOS' });
  });

  it('keeps an in-progress version 14 risk replay readable after adding the new activity', async () => {
    const state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_RISK_REPLAY' });
    store.value = { version: 14, savedAt: 1, state };

    expect(await loadSavedGame()).toEqual(state);
  });
});
