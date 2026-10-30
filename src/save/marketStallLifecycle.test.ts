import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer, type GameAction } from '../core/reducer';
import { createInitialState } from '../core/state';
import type { GameState } from '../core/types';
import type { StallProduct } from '../core/marketStallTypes';
import { loadSavedGame, saveGame } from './storage';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

const products: StallProduct[] = ['THERMOS', 'RAINCOAT', 'CABLE'];
const start = (): GameState => gameReducer({ ...createInitialState(), phase: 'DAYTIME', energy: 15 }, { type: 'START_LAOLIANG_STALL' });
const sell = (state: GameState, product: StallProduct): GameState => gameReducer(
  gameReducer(state, { type: 'SELECT_STALL_PRODUCT', product }),
  { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' },
);
async function restore(state: GameState): Promise<GameState> {
  await saveGame(state);
  const loaded = await loadSavedGame();
  expect(loaded).toEqual(state);
  if (!loaded) throw new Error('Expected stall save.');
  return loaded;
}

describe('market stall lifecycle through public reducer and save boundary', () => {
  it('restores every selection, sale, receipt and Hub without paying twice', async () => {
    let state = await restore(start());
    for (const [step, product] of products.entries()) {
      state = await restore(gameReducer(state, { type: 'SELECT_STALL_PRODUCT', product }));
      expect(state.cash).toBe(3200);
      expect(state.dailyWorkIncome).toBe(0);
      state = await restore(gameReducer(state, { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' }));
      expect(state.energy).toBe(15 - (step + 1) * 5);
    }
    expect(state.cash).toBe(3317);
    expect(state.dailyWorkIncome).toBe(117);
    expect(state.debt).toBe(18000);
    expect(state.stocks).toEqual(createInitialState().stocks);
    const blocked: GameAction[] = [
      { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' },
      { type: 'SELECT_STALL_PRODUCT', product: 'CABLE' },
      { type: 'ABANDON_LAOLIANG_STALL' },
      { type: 'START_LAOLIANG_STALL' },
      { type: 'ADVANCE_PHASE' },
    ];
    for (const action of blocked) expect(gameReducer(state, action)).toBe(state);
    state = await restore(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }));
    expect(state.activeActivity).toBeNull();
    expect(state.phase).toBe('DAYTIME');
    expect(state.workedToday).toBe(true);
    expect(state.cash).toBe(3317);
    expect(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' })).toBe(state);
    for (const type of ['START_LAOLIANG_STALL', 'START_CAFE_SHIFT', 'START_FACTORY_SHIFT', 'START_DELIVERY_RUN'] as const) {
      expect(gameReducer(state, { type })).toBe(state);
    }
  });

  it.each([0, 1, 2])('persists exit after %s sales, forfeits wages and preserves the consumed work slot', async (count) => {
    let state = start();
    for (const product of products.slice(0, count)) state = sell(state, product);
    state = await restore(gameReducer(await restore(state), { type: 'ABANDON_LAOLIANG_STALL' }));
    expect(state.activeActivity).toBeNull();
    expect(state.energy).toBe(15 - count * 5);
    expect(state.cash).toBe(3200);
    expect(state.dailyWorkIncome).toBe(0);
    expect(gameReducer(state, { type: 'START_LAOLIANG_STALL' })).toBe(state);
    for (let step = 0; step < 4; step += 1) state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(state.day).toBe(2);
    expect(state.phase).toBe('DAYTIME');
    expect(state.workedToday).toBe(false);
    expect(gameReducer(state, { type: 'START_LAOLIANG_STALL' }).activeActivity?.id).toBe('LAOLIANG_MARKET_STALL');
  });

  it('freezes peripheral actions during the shift and ignores a sale without a product', () => {
    const state = start();
    const blocked: GameAction[] = [
      { type: 'ADVANCE_TICK' }, { type: 'ADVANCE_PHASE' },
      { type: 'CHANGE_PHASE', phase: 'NIGHT' }, { type: 'RETURN_FROM_ACTIVITY' },
      { type: 'PLACE_ORDER', side: 'BUY', shares: 100 }, { type: 'BORROW_FROM_NPC' },
      { type: 'START_STREAM_RUN' }, { type: 'START_CAFE_SHIFT' },
      { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' },
    ];
    for (const action of blocked) expect(gameReducer(state, action)).toBe(state);
  });

  it.each(['PRE_MARKET', 'TRADING', 'NIGHT'] as const)('rejects entry during %s', (phase) => {
    const state = { ...createInitialState(), phase };
    expect(gameReducer(state, { type: 'START_LAOLIANG_STALL' })).toBe(state);
  });

  it('preserves wages at weekly settlement and resets only the daily ledger on the next day', async () => {
    let state = gameReducer({ ...createInitialState(), day: 7, phase: 'DAYTIME' }, { type: 'START_LAOLIANG_STALL' });
    for (const product of products) state = sell(state, product);
    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    state = gameReducer(gameReducer(state, { type: 'ADVANCE_PHASE' }), { type: 'ADVANCE_PHASE' });
    expect(state.phase).toBe('NIGHT');
    expect(state.dailyWorkIncome).toBe(117);
    expect(state.cash).toBe(2987);
    expect(state.debt).toBe(18090);
    expect(state.periodicCostLedger).toMatchObject({ rent: 240, membership: 30, equipment: 60, interest: 90 });
    state = await restore(state);
    expect(gameReducer(state, { type: 'CHANGE_PHASE', phase: 'NIGHT' })).toEqual(state);
    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(state.dailyWorkIncome).toBe(0);
    expect(state.workedToday).toBe(false);
    expect(state.cash).toBe(2987);
    expect(state.debt).toBe(18090);
  });
});
