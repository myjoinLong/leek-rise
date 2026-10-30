import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { reduceLaoLiangStall, quoteStallSale } from './laoLiangMarketStall';

function start(overrides: Partial<GameState> = {}): GameState {
  return reduceLaoLiangStall({ ...createInitialState(), phase: 'DAYTIME', energy: 120, ...overrides }, { type: 'START_LAOLIANG_STALL' });
}

function sell(state: GameState, product: 'THERMOS' | 'RAINCOAT' | 'CABLE', priceTier: 'VALUE' | 'STANDARD' | 'PREMIUM'): GameState {
  const selected = reduceLaoLiangStall(state, { type: 'SELECT_STALL_PRODUCT', product });
  return reduceLaoLiangStall(selected, { type: 'SELL_STALL_GOODS', priceTier });
}

describe('Lao Liang community stall', () => {
  it('settles a transparent 3-customer shift into real cash and daily work income', () => {
    let state = start();
    state = sell(state, 'THERMOS', 'STANDARD');
    state = sell(state, 'RAINCOAT', 'STANDARD');
    state = sell(state, 'CABLE', 'STANDARD');

    expect(state.activeActivity).toMatchObject({ id: 'LAOLIANG_MARKET_STALL', status: 'RESULT', income: 117, energySpent: 15 });
    expect(state.cash).toBe(3317);
    expect(state.dailyWorkIncome).toBe(117);
    expect(state.energy).toBe(105);
    expect(state.workedToday).toBe(true);
  });

  it('shows price and demand tradeoffs without charging cash for unsold consignment', () => {
    expect(quoteStallSale(0, 'THERMOS', 'STANDARD')).toMatchObject({ unitPrice: 30, unitsSold: 2, commission: 18 });
    expect(quoteStallSale(0, 'THERMOS', 'PREMIUM')).toMatchObject({ unitPrice: 42, unitsSold: 0, commission: 0 });
    expect(quoteStallSale(0, 'CABLE', 'VALUE')).toMatchObject({ unitsSold: 0, commission: 0 });
  });

  it('consumes the work slot and spent energy when the player abandons before payout', () => {
    let state = sell(start(), 'THERMOS', 'STANDARD');
    state = reduceLaoLiangStall(state, { type: 'ABANDON_LAOLIANG_STALL' });

    expect(state.activeActivity).toBeNull();
    expect(state.cash).toBe(3200);
    expect(state.dailyWorkIncome).toBe(0);
    expect(state.energy).toBe(115);
    expect(state.workedToday).toBe(true);
  });

  it('rejects a shift when work is already used or the full energy reserve is unavailable', () => {
    expect(start({ workedToday: true }).activeActivity).toBeNull();
    expect(start({ energy: 14 }).activeActivity).toBeNull();
  });
});
