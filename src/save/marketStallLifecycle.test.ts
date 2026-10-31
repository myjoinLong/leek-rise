import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer, type GameAction } from '../core/reducer';
import { createInitialState } from '../core/state';
import type { GameState } from '../core/types';
import { quoteStallSale, stallCustomerForRun } from '../core/systems/laoLiangMarketStall';
import { loadSavedGame, saveGame } from './storage';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

const start = (): GameState => gameReducer({ ...createInitialState(), phase: 'DAYTIME', energy: 15 }, { type: 'START_LAOLIANG_STALL' });
function currentCustomer(state: GameState) {
  const run = state.activeActivity;
  if (run?.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE') throw new Error('Expected an active stall shift.');
  return stallCustomerForRun(run.day, run.step, run.scenarioVersion, run.scenarioSeed);
}
function sell(state: GameState): GameState {
  const customer = currentCustomer(state);
  return gameReducer(gameReducer(state, { type: 'SELECT_STALL_PRODUCT', product: customer.product }), { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' });
}
function matchedStandardIncome(state: GameState): number {
  const run = state.activeActivity;
  if (run?.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE') throw new Error('Expected an active stall shift.');
  return 60 + ([0, 1, 2] as const).reduce<number>((sum, step) => {
    const customer = stallCustomerForRun(run.day, step, run.scenarioVersion, run.scenarioSeed);
    return sum + quoteStallSale(step, customer.product, 'STANDARD', run.day, run.scenarioSeed ?? 4, run.scenarioVersion ?? 1).commission;
  }, 0);
}
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
    const income = matchedStandardIncome(state);
    for (let step = 0; step < 3; step += 1) {
      const product = currentCustomer(state).product;
      state = await restore(gameReducer(state, { type: 'SELECT_STALL_PRODUCT', product }));
      expect(state.cash).toBe(3200);
      expect(state.dailyWorkIncome).toBe(0);
      state = await restore(gameReducer(state, { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' }));
      expect(state.energy).toBe(15 - (step + 1) * 5);
    }
    expect(state.cash).toBe(3200 + income);
    expect(state.dailyWorkIncome).toBe(income);
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
    expect(state.cash).toBe(3200 + income);
    expect(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' })).toBe(state);
    for (const type of ['START_LAOLIANG_STALL', 'START_CAFE_SHIFT', 'START_FACTORY_SHIFT', 'START_DELIVERY_RUN'] as const) {
      expect(gameReducer(state, { type })).toBe(state);
    }
  });

  it.each([0, 1, 2])('persists exit after %s sales, forfeits wages and preserves the consumed work slot', async (count) => {
    let state = start();
    for (let step = 0; step < count; step += 1) state = sell(state);
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
    const income = matchedStandardIncome(state);
    for (let step = 0; step < 3; step += 1) state = sell(state);
    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    state = gameReducer(gameReducer(state, { type: 'ADVANCE_PHASE' }), { type: 'ADVANCE_PHASE' });
    expect(state.phase).toBe('NIGHT');
    expect(state.dailyWorkIncome).toBe(income);
    expect(state.cash).toBe(3200 + income - 330);
    expect(state.debt).toBe(18090);
    expect(state.periodicCostLedger).toMatchObject({ rent: 240, membership: 30, equipment: 60, interest: 90 });
    state = await restore(state);
    expect(gameReducer(state, { type: 'CHANGE_PHASE', phase: 'NIGHT' })).toEqual(state);
    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(state.dailyWorkIncome).toBe(0);
    expect(state.workedToday).toBe(false);
    expect(state.cash).toBe(3200 + income - 330);
    expect(state.debt).toBe(18090);
  });
});
