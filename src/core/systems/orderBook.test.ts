import { describe, expect, it } from 'vitest';
import type { StockState } from '../types';
import { calculateTradingFee, estimateOrderCost, estimateOrderSettlement, maxAffordableBuyShares } from './orderBook';

const stock: StockState = {
  id: 'sample',
  name: '示例股票',
  price: 10,
  open: 10,
  high: 10,
  low: 10,
  volume: 0,
  priceHistory: [10],
  bids: [{ price: 9.99, volume: 100 }],
  asks: [{ price: 10.01, volume: 100 }],
  recentTrades: [],
  scriptPhase: 'ACCUMULATE',
  phaseProgress: 0,
};

describe('order book cash-flow estimates', () => {
  it('estimates buy outflow and sell proceeds from their own book sides, including the exact fee', () => {
    expect(estimateOrderSettlement(stock, 'BUY', 100)).toEqual({
      averageFillPrice: 10.01,
      notional: 1001,
      fee: 1.5,
      cashDelta: -1002.5,
    });
    expect(estimateOrderSettlement(stock, 'SELL', 100)).toEqual({
      averageFillPrice: 9.99,
      notional: 999,
      fee: 1.5,
      cashDelta: 997.5,
    });
  });

  it('uses the same rounded fee and cash estimate for the buy affordability limit', () => {
    expect(calculateTradingFee(1001)).toBe(1.5);
    expect(estimateOrderCost(stock, 'BUY', 100)).toBe(1002.5);
    expect(maxAffordableBuyShares(1002.5, stock)).toBe(100);
    expect(maxAffordableBuyShares(1002.49, stock)).toBe(0);
  });

  it('returns a zero-flow estimate for an invalid order size', () => {
    expect(estimateOrderSettlement(stock, 'BUY', 0)).toEqual({
      averageFillPrice: stock.price,
      notional: 0,
      fee: 0,
      cashDelta: 0,
    });
  });
});
