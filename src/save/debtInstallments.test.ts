import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../core/state';
import { gameReducer } from '../core/reducer';
import type { GameState } from '../core/types';
import { loadSavedGame, saveGame } from './storage';
import { saveVersion } from './schemas';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

function sign(): GameState {
  let state: GameState = { ...createInitialState(), day: 30, phase: 'DAYTIME', debtCrisisStarted: true, dailyWorkIncome: 120, cash: 430 };
  state = gameReducer(state, { type: 'START_JIUGE_NEGOTIATION' });
  for (const choice of ['SHOW_LEDGER', 'PROVE_INCOME', 'SIGN_INSTALLMENTS'] as const) {
    state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice });
  }
  return state;
}

describe('installment save version 13', () => {
  it.each(Array.from({ length: 12 }, (_, index) => index + 1))('defaults a version %s save to no automatic payment authorization', async (version) => {
    const { debtInstallmentPlan: removed, ...legacy } = createInitialState();
    expect(removed).toBeNull();
    store.value = { version, savedAt: 1, state: legacy };
    expect((await loadSavedGame())?.debtInstallmentPlan).toBeNull();
  });

  it('restores the signing receipt and paused state without signing or repaying twice', async () => {
    let state = sign();
    await saveGame(state);
    expect(saveVersion).toBe(28);
    let restored = await loadSavedGame();
    expect(restored).toEqual(state);
    if (!restored) throw new Error('Expected saved contract.');
    expect(gameReducer(restored, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SIGN_INSTALLMENTS' })).toBe(restored);
    state = gameReducer(restored, { type: 'RETURN_FROM_ACTIVITY' });
    state = gameReducer({ ...state, day: 35, phase: 'TRADING' }, { type: 'ADVANCE_PHASE' });
    await saveGame(state);
    restored = await loadSavedGame();
    expect(restored).toEqual(state);
    if (!restored) throw new Error('Expected saved payment.');
    expect(restored.debtInstallmentPlan?.status).toBe('PAUSED');
    expect(gameReducer(restored, { type: 'CHANGE_PHASE', phase: 'NIGHT' }).cash).toBe(state.cash);
    const resumed = gameReducer(restored, { type: 'RESUME_DEBT_INSTALLMENTS' });
    await saveGame(resumed);
    expect(await loadSavedGame()).toEqual(resumed);
    const cancelled = gameReducer(resumed, { type: 'CANCEL_DEBT_INSTALLMENTS' });
    await saveGame(cancelled);
    expect(await loadSavedGame()).toEqual(cancelled);
  });

  it('keeps a version 12 cafe activity while adding a safe contract default', async () => {
    const initial = { ...createInitialState(), phase: 'DAYTIME' as const };
    const state = gameReducer(initial, { type: 'START_CAFE_SHIFT' });
    const legacy = { ...state, debtInstallmentPlan: undefined };
    store.value = { version: 12, savedAt: 1, state: legacy };
    const restored = await loadSavedGame();
    expect(restored?.activeActivity).toEqual(state.activeActivity);
    expect(restored?.debtInstallmentPlan).toBeNull();
  });
});
