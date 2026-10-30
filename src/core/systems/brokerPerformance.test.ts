import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { selectNightVM } from '../../ui/screens/Night/selectors';

function signedState(): GameState {
  let state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_BROKER_NEGOTIATION' });
  state = gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 36000 });
  state = gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan: 'LOW_COMMISSION' });
  return gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
}

function withFlatBook(state: GameState): GameState {
  const stock = state.stocks[state.selectedStockId];
  if (!stock) throw new Error('Expected selected stock.');
  return { ...state, stocks: { [stock.id]: {
    ...stock, price: 10, asks: [{ price: 10, volume: 100000 }], bids: [{ price: 10, volume: 100000 }],
  } } };
}

describe('broker contract realized savings', () => {
  it('records executed turnover and compares actual fees with standard fees on identical fills', () => {
    let state = withFlatBook(signedState());
    state = gameReducer(state, { type: 'PLACE_ORDER', side: 'BUY', shares: 100 });
    state = gameReducer(state, { type: 'PLACE_ORDER', side: 'SELL', shares: 100 });

    expect(state.brokerContract).toMatchObject({
      projectedTurnover: 36000,
      actualTurnover: 2000,
      discountedFeesPaid: 2,
      standardFeesEquivalent: 3,
      serviceFee: 18,
    });
    expect(selectNightVM(state).brokerageReview?.netSavings).toBe(-17);
  });

  it('stops accumulating at expiry while preserving the final review', () => {
    const state = withFlatBook({ ...signedState(), day: 8 });
    const before = state.brokerContract;
    const settled = gameReducer(state, { type: 'PLACE_ORDER', side: 'BUY', shares: 100 });
    expect(settled.lastOrderFeedback?.fee).toBe(1.5);
    expect(settled.brokerContract).toEqual(before);
    expect(selectNightVM(settled).brokerageReview?.active).toBe(false);
  });
});
