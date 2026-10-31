import { estimateOrderCost } from '../systems/orderBook';
import type { GameAction } from '../reducer';
import type { GameState } from '../types';
import { getBrokerTradingFeeRate } from '../systems/brokerNegotiation';

export const economyStrategies = ['IDLE', 'WORK', 'FACTORY', 'CAFE', 'STREAM', 'WORK_STREAM', 'FACTORY_STREAM', 'CAFE_STREAM', 'CAFE_CASH', 'WORK_CASH', 'BIKE_REPAIR', 'BIKE_REPAIR_CASH', 'BIKE_REPAIR_STREAM', 'BIKE_REPAIR_CASH_STREAM', 'PHONE_FLIP', 'PHONE_FLIP_CASH', 'LOW_FREQUENCY', 'HEAVY', 'BORROW_WORK', 'EXIT'] as const;
export type EconomyStrategy = typeof economyStrategies[number];
export const bikeRepairStrategies = ['BIKE_REPAIR', 'BIKE_REPAIR_CASH', 'BIKE_REPAIR_STREAM', 'BIKE_REPAIR_CASH_STREAM'] as const;
export function isBikeRepairStrategy(strategy: EconomyStrategy): boolean { return bikeRepairStrategies.some((candidate) => candidate === strategy); }
export function isBikeRepairCashStrategy(strategy: EconomyStrategy): boolean { return strategy === 'BIKE_REPAIR_CASH' || strategy === 'BIKE_REPAIR_CASH_STREAM'; }
export function isBikeRepairStreamingStrategy(strategy: EconomyStrategy): boolean { return strategy === 'BIKE_REPAIR_STREAM' || strategy === 'BIKE_REPAIR_CASH_STREAM'; }
export function isPhoneFlipStrategy(strategy: EconomyStrategy): boolean { return strategy === 'PHONE_FLIP' || strategy === 'PHONE_FLIP_CASH'; }
export function isPhoneFlipCashStrategy(strategy: EconomyStrategy): boolean { return strategy === 'PHONE_FLIP_CASH'; }

export function tradingAction(state: GameState, strategy: EconomyStrategy, tick: number): GameAction | null {
  const stock = state.stocks[state.selectedStockId];
  if (!stock) return null;
  const holding = stock.holding?.shares ?? 0;
  const feeRate = getBrokerTradingFeeRate(state.brokerContract, state.day);
  if (strategy === 'EXIT') {
    return holding > 0 ? { type: 'PLACE_ORDER', side: 'SELL', shares: holding } : null;
  }
  if (strategy !== 'HEAVY' && strategy !== 'LOW_FREQUENCY') return null;
  if (tick % 5 !== 0) return null;
  const previousPrice = stock.priceHistory.at(-4) ?? stock.price;
  if (stock.price < previousPrice && holding > 0) {
    return { type: 'PLACE_ORDER', side: 'SELL', shares: strategy === 'HEAVY' ? holding : Math.min(100, holding) };
  }
  if (stock.price <= previousPrice) return null;
  let shares = 100;
  if (strategy === 'HEAVY') {
    let low = 0;
    let high = Math.floor(state.cash / Math.max(stock.price, 0.01) / 100);
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (estimateOrderCost(stock, 'BUY', middle * 100, 1, false, feeRate) <= state.cash) low = middle;
      else high = middle - 1;
    }
    shares = low * 100;
  }
  return shares > 0 && estimateOrderCost(stock, 'BUY', shares, 1, false, feeRate) <= state.cash
    ? { type: 'PLACE_ORDER', side: 'BUY', shares }
    : null;
}
