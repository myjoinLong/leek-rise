import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { selectTradingVM } from '../../ui/screens/Trading/selectors';
import { selectNightVM } from '../../ui/screens/Night/selectors';
import { getBrokerTradingFeeRate } from './brokerNegotiation';
import { estimateOrderSettlement } from './orderBook';

function signedState(): GameState {
  let state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_BROKER_NEGOTIATION' });
  state = gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 60000 });
  state = gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan: 'LOW_COMMISSION' });
  return gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
}

function flatBook(state: GameState): GameState {
  const stock = state.stocks[state.selectedStockId];
  if (!stock) throw new Error('Expected selected stock.');
  return { ...state, phase: 'TRADING', stocks: { [stock.id]: {
    ...stock, price: 10, bids: [{ price: 10, volume: 100000 }], asks: [{ price: 10, volume: 100000 }],
  } } };
}

describe('broker contract actual order settlement and calendar acceptance', () => {
  it.each([1, 7, 8])('uses the same fee for estimates, fills and cash on day %s', (day) => {
    const initial = flatBook({ ...signedState(), day });
    const rate = day <= 7 ? 0.001 : 0.0015;
    for (const side of ['BUY', 'SELL'] as const) {
      const stock = initial.stocks[initial.selectedStockId];
      if (!stock) throw new Error('Expected flat book.');
      const estimate = estimateOrderSettlement(stock, side, 100, 1, false,
        getBrokerTradingFeeRate(initial.brokerContract, initial.day));
      expect(estimate.fee).toBe(day <= 7 ? 1 : 1.5);
      const settled = gameReducer(initial, { type: 'PLACE_ORDER', side, shares: 100 });
      const feedback = settled.lastOrderFeedback;
      if (!feedback || feedback.result === 'REJECTED') throw new Error('Expected successful order.');
      const notional = feedback.filledShares * 10;
      const fee = Number((notional * rate).toFixed(2));
      expect(feedback.fee).toBe(fee);
      expect(settled.dailyFees).toBe(fee);
      expect(settled.cash).toBe(Number((initial.cash + (side === 'BUY' ? -notional : notional) - fee).toFixed(2)));
      expect(settled.dailyContractFees).toBe(18);
      expect(settled.debt).toBe(initial.debt);
      expect(settled.energy).toBe(initial.energy);
      expect(settled.stocks[stock.id]?.holding?.shares).toBe(800 + (side === 'BUY' ? 1 : -1) * feedback.filledShares);
    }
  });

  it('uses the contract for the affordable quantity and funding rejection at the one-lot boundary', () => {
    const low = flatBook({ ...signedState(), cash: 1001 });
    const standard = { ...low, brokerContract: null };
    expect(selectTradingVM(low).maxBuyShares).toBe(100);
    expect(selectTradingVM(standard).maxBuyShares).toBe(0);
    expect(gameReducer(low, { type: 'PLACE_ORDER', side: 'BUY', shares: 100 }).lastOrderFeedback?.result).not.toBe('REJECTED');
    const rejected = gameReducer(standard, { type: 'PLACE_ORDER', side: 'BUY', shares: 100 });
    expect(rejected.lastOrderFeedback?.result).toBe('REJECTED');
    expect(rejected.cash).toBe(1001);
    expect(rejected.dailyFees).toBe(0);
    expect(rejected.stocks).toEqual(standard.stocks);
  });

  it('charges the service once, itemizes it at night, expires without renewal and allows a new visit', () => {
    let state = signedState();
    const contract = state.brokerContract;
    for (let day = 1; day <= 7; day += 1) {
      expect(state.day).toBe(day);
      expect(getBrokerTradingFeeRate(state.brokerContract, day)).toBe(0.001);
      expect(gameReducer(state, { type: 'START_BROKER_NEGOTIATION' })).toBe(state);
      state = gameReducer(gameReducer(state, { type: 'ADVANCE_PHASE' }), { type: 'ADVANCE_PHASE' });
      expect(state.phase).toBe('NIGHT');
      expect(selectNightVM(state).pnlBreakdown.contractFee).toBe(day === 1 ? -18 : -0);
      expect(state.brokerContract).toEqual(contract);
      expect(state.cash).toBe(day < 7 ? 3182 : 2852);
      expect(state.debt).toBe(day < 7 ? 18000 : 18090);
      state = gameReducer(gameReducer(state, { type: 'ADVANCE_PHASE' }), { type: 'ADVANCE_PHASE' });
      expect(state.dailyContractFees).toBe(0);
    }
    expect(state.day).toBe(8);
    expect(getBrokerTradingFeeRate(state.brokerContract, state.day)).toBe(0.0015);
    expect(state.cash).toBe(2852);
    expect(gameReducer(state, { type: 'START_BROKER_NEGOTIATION' }).activeActivity?.status).toBe('ACTIVE');
  });
});
