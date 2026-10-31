import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import type { GameState, StockState } from '../types';
import { executeOrder } from './tradeEngine';

function tradingState(options: { cash?: number; shares?: number; orderSequence?: number } = {}): GameState {
  const state = createInitialState(19);
  const stock = state.stocks[state.selectedStockId];
  if (!stock) throw new Error('Expected the initial stock.');
  const book: StockState = {
    ...stock,
    price: 10,
    open: 10,
    high: 10,
    low: 10,
    asks: [{ price: 10.01, volume: 1000 }, { price: 10.02, volume: 1000 }],
    bids: [{ price: 9.99, volume: 1000 }, { price: 9.98, volume: 1000 }],
    holding: { shares: options.shares ?? 800, avgCost: 10 },
  };
  return {
    ...state,
    phase: 'TRADING',
    cash: options.cash ?? 3200,
    orderSequence: options.orderSequence ?? 0,
    stocks: { ...state.stocks, [stock.id]: book },
  };
}

describe('trade engine settlement invariants', () => {
  it.each([
    { side: 'BUY' as const, expectedPrice: 10.01, expectedCashDelta: -1, expectedSharesDelta: 1 },
    { side: 'SELL' as const, expectedPrice: 9.99, expectedCashDelta: 1, expectedSharesDelta: -1 },
  ])('settles $side against the correct side of the live book and reconciles feedback', ({ side, expectedPrice, expectedCashDelta, expectedSharesDelta }) => {
    const state = tradingState();
    const stock = state.stocks[state.selectedStockId];
    if (!stock) throw new Error('Expected the initial stock.');

    const { newState, feedback } = executeOrder(state, side, 100);

    expect(feedback.result).toBe('FILLED');
    expect(feedback.requestedPrice).toBe(stock.price);
    expect(feedback.filledPrice).toBe(expectedPrice);
    expect(feedback.filledPrice > stock.price).toBe(side === 'BUY');
    expect(feedback.filledPrice < stock.price).toBe(side === 'SELL');
    expect(feedback.fee).toBe(Number((feedback.filledShares * expectedPrice * 0.0015).toFixed(2)));
    expect(feedback.cashAfter).toBe(newState.cash);
    expect(newState.cash).toBe(Number((state.cash + expectedCashDelta * feedback.filledShares * expectedPrice - feedback.fee).toFixed(2)));
    expect(newState.stocks[stock.id]?.holding?.shares).toBe(800 + expectedSharesDelta * feedback.filledShares);
    expect(newState.stocks[stock.id]?.recentTrades[0]).toMatchObject({
      price: feedback.filledPrice,
      shares: feedback.filledShares,
      side,
      isPlayer: true,
    });
  });

  it('rejects unaffordable or uncovered orders without changing the game state', () => {
    const lowCash = tradingState({ cash: 1002.49 });
    const insufficientFunds = executeOrder(lowCash, 'BUY', 100);
    expect(insufficientFunds.newState).toBe(lowCash);
    expect(insufficientFunds.feedback).toMatchObject({
      result: 'REJECTED',
      rejectReason: '资金不足，无法完成委托',
      requestedShares: 100,
      filledShares: 0,
      cashAfter: lowCash.cash,
      fee: 0,
    });

    const lowPosition = tradingState({ shares: 50 });
    const insufficientHolding = executeOrder(lowPosition, 'SELL', 100);
    expect(insufficientHolding.newState).toBe(lowPosition);
    expect(insufficientHolding.feedback).toMatchObject({
      result: 'REJECTED',
      rejectReason: '持仓不足，无法完成委托',
      requestedShares: 100,
      filledShares: 0,
      cashAfter: lowPosition.cash,
      fee: 0,
    });
  });

  it('replays identical orders and accounts for the actual partial fill only', () => {
    const candidates = Array.from({ length: 256 }, (_, orderSequence) => tradingState({ cash: 100000, orderSequence }));
    const partialState = candidates.find((state) => executeOrder(state, 'BUY', 300).feedback.result === 'PARTIAL');
    if (!partialState) throw new Error('Expected the seeded order range to contain a partial fill.');

    const first = executeOrder(partialState, 'BUY', 300);
    const replay = executeOrder(partialState, 'BUY', 300);
    const feedback = first.feedback;
    expect(replay).toEqual(first);
    expect(feedback).toMatchObject({ result: 'PARTIAL', requestedShares: 300, filledShares: 180 });
    expect(first.newState.cash).toBe(feedback.cashAfter);
    expect(first.newState.stocks.dragon?.holding?.shares).toBe(980);
    expect(first.newState.stocks.dragon?.recentTrades[0]?.shares).toBe(feedback.filledShares);
  });
});
