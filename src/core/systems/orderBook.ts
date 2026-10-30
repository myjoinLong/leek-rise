import type { OrderBookLevel, OrderSide, StockState } from '../types';
import { brokeragePolicy } from './brokerNegotiation';

const syntheticLevelVolume = 1000;
export const standardTradingFeeRate = brokeragePolicy.standardFeeRate;

export interface OrderEstimate {
  averageFillPrice: number;
  notional: number;
  fee: number;
  cashDelta: number;
}

export interface BookFill {
  filledShares: number;
  filledPrice: number;
  notional: number;
  remainingLevels: OrderBookLevel[];
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function calculateTradingFee(notional: number, feeRate = standardTradingFeeRate): number {
  return roundMoney(notional * feeRate);
}

function sumArithmeticPrices(first: number, step: number, count: number): number {
  return count * (2 * first + (count - 1) * step) / 2;
}

function calculateSyntheticNotional(
  shares: number,
  firstPrice: number,
  side: OrderSide,
  priceStep: number,
): number {
  const fullLevels = Math.floor(shares / syntheticLevelVolume);
  const remainingShares = shares % syntheticLevelVolume;
  if (side === 'BUY') {
    const fullLevelNotional = syntheticLevelVolume
      * sumArithmeticPrices(firstPrice, priceStep, fullLevels);
    return fullLevelNotional + remainingShares * (firstPrice + fullLevels * priceStep);
  }

  const movingLevels = Math.min(
    fullLevels,
    Math.max(1, Math.floor((firstPrice - 0.01) / priceStep) + 1),
  );
  const movingNotional = syntheticLevelVolume
    * sumArithmeticPrices(firstPrice, -priceStep, movingLevels);
  const floorLevels = fullLevels - movingLevels;
  const nextPrice = Math.max(0.01, firstPrice - fullLevels * priceStep);
  return movingNotional + floorLevels * syntheticLevelVolume * 0.01 + remainingShares * nextPrice;
}

export function simulateBookFill(
  stock: StockState,
  side: OrderSide,
  shares: number,
  leverage = 1,
  isFollowingNpc = false,
): BookFill {
  const levels = side === 'BUY' ? stock.asks : stock.bids;
  const usableLevels = levels.length > 0
    ? levels
    : [{ price: roundMoney(stock.price + (side === 'BUY' ? 0.01 : -0.01)), volume: 0 }];
  let remainingShares = shares;
  let rawNotional = 0;
  const remainingLevels: OrderBookLevel[] = [];

  for (const level of usableLevels) {
    const taken = Math.min(remainingShares, level.volume);
    rawNotional += taken * level.price;
    remainingShares -= taken;
    if (level.volume > taken) remainingLevels.push({ ...level, volume: level.volume - taken });
  }

  if (remainingShares > 0) {
    const lastPrice = usableLevels[usableLevels.length - 1]?.price ?? stock.price;
    const impactMultiplier = (leverage > 1 ? 1.5 : 1) * (isFollowingNpc ? 2 : 1);
    const priceStep = 0.01 * impactMultiplier;
    const firstPrice = side === 'BUY'
      ? roundMoney(lastPrice + priceStep)
      : Math.max(0.01, roundMoney(lastPrice - priceStep));
    rawNotional += calculateSyntheticNotional(remainingShares, firstPrice, side, priceStep);
  }

  const notional = roundMoney(rawNotional);
  return {
    filledShares: shares,
    filledPrice: shares > 0 ? roundMoney(notional / shares) : stock.price,
    notional,
    remainingLevels,
  };
}

export function estimateOrderCost(
  stock: StockState,
  side: OrderSide,
  shares: number,
  leverage = 1,
  isFollowingNpc = false,
  feeRate = standardTradingFeeRate,
): number {
  if (!Number.isInteger(shares) || shares <= 0) return 0;
  const estimate = estimateOrderSettlement(stock, side, shares, leverage, isFollowingNpc, feeRate);
  return roundMoney(estimate.notional + estimate.fee);
}

export function estimateOrderSettlement(
  stock: StockState,
  side: OrderSide,
  shares: number,
  leverage = 1,
  isFollowingNpc = false,
  feeRate = standardTradingFeeRate,
): OrderEstimate {
  if (!Number.isInteger(shares) || shares <= 0) {
    return { averageFillPrice: stock.price, notional: 0, fee: 0, cashDelta: 0 };
  }
  const fill = simulateBookFill(stock, side, shares, leverage, isFollowingNpc);
  const fee = calculateTradingFee(fill.notional, feeRate);
  const cashDelta = side === 'BUY'
    ? -roundMoney(fill.notional + fee)
    : roundMoney(fill.notional - fee);
  return { averageFillPrice: fill.filledPrice, notional: fill.notional, fee, cashDelta };
}

export function maxAffordableBuyShares(cash: number, stock: StockState, leverage = 1, feeRate = standardTradingFeeRate): number {
  if (cash <= 0) return 0;
  const price = Math.max(stock.price, 0.01);
  let lowLots = 0;
  let highLots = Math.floor(cash / (price * 100));
  while (lowLots < highLots) {
    const middleLots = Math.ceil((lowLots + highLots) / 2);
    if (estimateOrderCost(stock, 'BUY', middleLots * 100, leverage, false, feeRate) <= cash) lowLots = middleLots;
    else highLots = middleLots - 1;
  }
  return lowLots * 100;
}

export function replenishLevels(
  remaining: OrderBookLevel[],
  side: OrderSide,
  price: number,
  rng: () => number,
): OrderBookLevel[] {
  const levels = remaining.slice(0, 3);
  let lastPrice = levels[levels.length - 1]?.price ?? price;
  while (levels.length < 3) {
    const levelPrice = side === 'BUY'
      ? Math.max(roundMoney(price + 0.01), roundMoney(lastPrice + 0.01))
      : Math.max(0.01, Math.min(roundMoney(price - 0.01), roundMoney(lastPrice - 0.01)));
    levels.push({ price: levelPrice, volume: (Math.floor(rng() * 10) + 1) * 100 });
    lastPrice = levelPrice;
  }
  return levels;
}
