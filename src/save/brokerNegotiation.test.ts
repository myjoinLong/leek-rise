import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer, type GameAction } from '../core/reducer';
import { createInitialState } from '../core/state';
import type { GameState } from '../core/types';
import { gameStateSchema, saveVersion } from './schemas';
import { loadSavedGame, saveGame } from './storage';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

const start = (): GameState => gameReducer(
  { ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_BROKER_NEGOTIATION' },
);
async function restore(state: GameState): Promise<GameState> {
  await saveGame(state);
  const loaded = await loadSavedGame();
  expect(loaded).toEqual(state);
  if (!loaded) throw new Error('Expected brokerage save.');
  return loaded;
}

describe('broker negotiation persistence and lifecycle acceptance', () => {
  it.each(['STANDARD', 'LOW_COMMISSION'] as const)('restores every step and %s receipt without duplicate charges', async (plan) => {
    let state = await restore(start());
    const initial = createInitialState();
    const blocked: GameAction[] = [
      { type: 'ADVANCE_TICK' }, { type: 'ADVANCE_PHASE' },
      { type: 'CHANGE_PHASE', phase: 'NIGHT' }, { type: 'BORROW_FROM_NPC' },
      { type: 'PLACE_ORDER', side: 'BUY', shares: 100 }, { type: 'START_CAFE_SHIFT' },
    ];
    for (const action of blocked) expect(gameReducer(state, action)).toBe(state);
    expect(gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan })).toBe(state);
    state = await restore(gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 60000 }));
    for (const action of blocked) expect(gameReducer(state, action)).toBe(state);
    state = await restore(gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan }));
    const fee = plan === 'STANDARD' ? 0 : 18;
    expect(state.cash).toBe(3200 - fee);
    expect(state.dailyContractFees).toBe(fee);
    expect(state.dailyWorkIncome).toBe(0);
    expect(state.dailyFees).toBe(0);
    expect(state.energy).toBe(initial.energy);
    expect(state.debt).toBe(initial.debt);
    expect(state.stocks).toEqual(initial.stocks);
    for (const action of [...blocked,
      { type: 'CHOOSE_BROKER_PLAN', plan } as const,
      { type: 'ABANDON_BROKER_NEGOTIATION' } as const,
    ]) expect(gameReducer(state, action)).toBe(state);
    state = await restore(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }));
    expect(state.activeActivity).toBeNull();
    expect(state.phase).toBe('DAYTIME');
    expect(state.cash).toBe(3200 - fee);
    expect(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' })).toBe(state);
    expect(gameReducer(state, { type: 'START_BROKER_NEGOTIATION' })).toBe(state);
  });

  it.each([false, true])('exits with no charges before or after estimation (%s), then permits reentry', async (estimated) => {
    let state = start();
    if (estimated) state = gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 10000 });
    state = await restore(gameReducer(await restore(state), { type: 'ABANDON_BROKER_NEGOTIATION' }));
    expect(state).toEqual({ ...createInitialState(), phase: 'DAYTIME' });
    expect(gameReducer(state, { type: 'START_BROKER_NEGOTIATION' }).activeActivity?.status).toBe('ACTIVE');
  });

  it('preserves the insufficient-cash choice and permits the free fallback after restore', async () => {
    let state = gameReducer({ ...start(), cash: 17.99 }, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 60000 });
    state = await restore(state);
    expect(gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan: 'LOW_COMMISSION' })).toBe(state);
    state = await restore(gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan: 'STANDARD' }));
    expect(state.cash).toBe(17.99);
    expect(state.brokerContract).toBeNull();
    expect(state.dailyContractFees).toBe(0);
  });

  it.each(Array.from({ length: 15 }, (_, index) => index + 1))('migrates v%s with no invented contract or visit', async (version) => {
    const legacy: Record<string, unknown> = { ...createInitialState(), cash: 1234.56 };
    delete legacy.brokerContract;
    delete legacy.brokerNegotiationVisitedToday;
    store.value = { version, savedAt: 1, state: legacy };
    const state = await loadSavedGame();
    expect(state?.brokerContract).toBeNull();
    expect(state?.brokerNegotiationVisitedToday).toBe(false);
    expect(state?.cash).toBe(1234.56);
    expect(state?.debt).toBe(18000);
    if (!state) throw new Error('Expected migrated save.');
    await restore(state);
    expect(store.value).toMatchObject({ version: saveVersion });
  });

  it('preserves v15 stall progress and rejects inconsistent v16 broker terms', async () => {
    const stall = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_LAOLIANG_STALL' });
    store.value = { version: 15, savedAt: 1, state: stall };
    expect((await loadSavedGame())?.activeActivity).toEqual(stall.activeActivity);
    const estimated = gameReducer(start(), { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 36000 });
    const signed = gameReducer(estimated, { type: 'CHOOSE_BROKER_PLAN', plan: 'LOW_COMMISSION' });
    expect(gameStateSchema.safeParse({ ...signed, brokerContract: { ...signed.brokerContract, expiresDay: 8 } }).success).toBe(false);
    expect(gameStateSchema.safeParse({ ...signed, activeActivity: { ...signed.activeActivity, serviceFeePaid: 0 } }).success).toBe(false);
    expect(gameStateSchema.safeParse({ ...estimated, activeActivity: { ...estimated.activeActivity, projectedTurnover: null } }).success).toBe(false);
  });
});
