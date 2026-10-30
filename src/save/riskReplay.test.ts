import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../core/reducer';
import { createInitialState } from '../core/state';
import { loadSavedGame, saveGame } from './storage';
import { gameStateSchema, saveVersion } from './schemas';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

describe('risk replay save compatibility', () => {
  it.each(Array.from({ length: 13 }, (_, index) => index + 1))('migrates version %s without inventing a completed visit', async (version) => {
    const legacy = { ...createInitialState(), riskReplayVisitedToday: undefined };
    store.value = { version, savedAt: 1, state: legacy };
    expect((await loadSavedGame())?.riskReplayVisitedToday).toBe(false);
  });

  it('round trips entry, all decisions, result and return without duplicate energy or cash changes', async () => {
    let state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_RISK_REPLAY' });
    expect(saveVersion).toBe(18);
    for (const allocation of [25, 100, 0, null]) {
      await saveGame(state);
      const restored = await loadSavedGame();
      expect(restored).toEqual(state);
      if (!restored) throw new Error('Expected replay save.');
      state = allocation === null ? gameReducer(restored, { type: 'RETURN_FROM_ACTIVITY' })
        : gameReducer(restored, { type: 'COMMIT_RISK_ALLOCATION', allocation });
    }
    await saveGame(state);
    expect(await loadSavedGame()).toEqual(state);
    expect(state.activeActivity).toBeNull();
    expect(state.energy).toBe(88);
    expect(state.cash).toBe(3200);
    expect(gameReducer(state, { type: 'START_RISK_REPLAY' })).toBe(state);
  });

  it('preserves exit lock and rejects mismatched progress in a corrupted replay', async () => {
    const state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_RISK_REPLAY' });
    expect(gameStateSchema.safeParse({ ...state, activeActivity: { ...state.activeActivity, step: 2 } }).success).toBe(false);
    const exited = gameReducer(state, { type: 'ABANDON_RISK_REPLAY' });
    await saveGame(exited);
    expect(await loadSavedGame()).toEqual(exited);
  });

  it('preserves the previous cafe activity and installment authorization during v13 migration', async () => {
    const initial = { ...createInitialState(), phase: 'DAYTIME' as const,
      debtInstallmentPlan: { status: 'PAUSED' as const, remaining: 8, weeklyPayment: 300, lastReceipt: null } };
    const state = gameReducer(initial, { type: 'START_CAFE_SHIFT' });
    store.value = { version: 13, savedAt: 1, state: { ...state, riskReplayVisitedToday: undefined } };
    const restored = await loadSavedGame();
    expect(restored?.activeActivity).toEqual(state.activeActivity);
    expect(restored?.debtInstallmentPlan).toEqual(state.debtInstallmentPlan);
  });
});
