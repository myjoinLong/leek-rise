import { mulberry32 } from '../rng';
import type { GameState, OrderFeedback, OrderSide, StockState } from '../types';
import { calculateTradingFee, replenishLevels, simulateBookFill, standardTradingFeeRate } from './orderBook';
import { brokeragePolicy, getBrokerTradingFeeRate } from './brokerNegotiation';

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function createOrderRng(
  state: GameState,
  side: OrderSide,
  shares: number,
  leverage: number,
  isFollowingNpc: boolean,
): () => number {
  const stock = state.stocks[state.selectedStockId];
  const seedParts = [
    state.day, state.orderSequence, state.selectedStockId, side,
    shares, leverage, isFollowingNpc, state.cash, stock?.price ?? 0,
  ].join('|');
  let seed = 2166136261;
  for (const character of seedParts) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return mulberry32(seed >>> 0);
}

function makeRejectedFeedback(
  state: GameState,
  stock: StockState | undefined,
  side: OrderSide,
  shares: number,
  rejectReason: string,
): OrderFeedback {
  const price = stock?.price ?? 0;
  return {
    id: `order-${state.day}-${state.orderSequence + 1}`,
    stockName: stock?.name ?? '未知股票',
    side,
    requestedShares: shares,
    filledShares: 0,
    requestedPrice: price,
    filledPrice: price,
    slippagePct: 0,
    fee: 0,
    latencyMs: 0,
    result: 'REJECTED',
    rejectReason,
    cashAfter: state.cash,
  };
}

export function executeOrder(
  state: GameState,
  side: OrderSide,
  shares: number,
  leverage = 1,
  isFollowingNpc = false,
): { newState: GameState; feedback: OrderFeedback } {
  const stock = state.stocks[state.selectedStockId];
  if (!stock) {
    return { newState: state, feedback: makeRejectedFeedback(state, stock, side, shares, '未选择可交易的股票') };
  }
  if (!Number.isInteger(shares) || shares <= 0) {
    return { newState: state, feedback: makeRejectedFeedback(state, stock, side, shares, '委托数量无效') };
  }

  const rng = createOrderRng(state, side, shares, leverage, isFollowingNpc);
  const feeRate = getBrokerTradingFeeRate(state.brokerContract, state.day);
  const requestedPrice = stock.price;
  const requestedFill = simulateBookFill(stock, side, shares, leverage, isFollowingNpc);
  const requestedFee = calculateTradingFee(requestedFill.notional, feeRate);
  const rejectReason = side === 'BUY'
    && roundMoney(requestedFill.notional + requestedFee) > state.cash
    ? '资金不足，无法完成委托'
    : side === 'SELL' && shares > (stock.holding?.shares ?? 0)
      ? '持仓不足，无法完成委托'
      : undefined;
  if (rejectReason) {
    return { newState: state, feedback: makeRejectedFeedback(state, stock, side, shares, rejectReason) };
  }

  const partial = rng() < 0.15 && Math.floor(shares * 0.6) > 0;
  const filledShares = partial ? Math.floor(shares * 0.6) : shares;
  const fill = simulateBookFill(stock, side, filledShares, leverage, isFollowingNpc);
  const fee = calculateTradingFee(fill.notional, feeRate);
  const slippagePct = requestedPrice === 0 ? 0 : Math.abs((fill.filledPrice - requestedPrice) / requestedPrice);
  const latencyMs = rng() < 0.25
    ? Math.floor(rng() * 701) + 1500
    : Math.floor(rng() * 101) + 300;
  const id = `order-${state.day}-${state.orderSequence + 1}`;
  const result: OrderFeedback['result'] = partial ? 'PARTIAL' : 'FILLED';
  let cash: number;
  let holding: StockState['holding'];

  if (side === 'BUY') {
    const oldShares = stock.holding?.shares ?? 0;
    const totalShares = oldShares + filledShares;
    const oldCost = stock.holding?.avgCost ?? 0;
    holding = {
      shares: totalShares,
      avgCost: Number(((oldCost * oldShares + fill.notional + fee) / totalShares).toFixed(4)),
    };
    cash = roundMoney(state.cash - fill.notional - fee);
  } else {
    const remainingShares = (stock.holding?.shares ?? 0) - filledShares;
    if (remainingShares > 0 && stock.holding) holding = { ...stock.holding, shares: remainingShares };
    cash = roundMoney(state.cash + fill.notional - fee);
  }

  const priceChange = fill.filledPrice - stock.price;
  const updatedStock: StockState = {
    ...stock,
    price: fill.filledPrice,
    high: Math.max(stock.high, fill.filledPrice),
    low: Math.min(stock.low, fill.filledPrice),
    volume: stock.volume + filledShares,
    priceHistory: [...stock.priceHistory, fill.filledPrice].slice(-120),
    recentTrades: [{ id, price: fill.filledPrice, shares: filledShares, side, isPlayer: true }, ...stock.recentTrades].slice(0, 20),
    ...(side === 'BUY'
      ? {
        asks: replenishLevels(fill.remainingLevels, side, fill.filledPrice, rng),
        bids: stock.bids.map((level) => ({ ...level, price: Math.max(0.01, roundMoney(level.price + priceChange)) })),
      }
      : {
        bids: replenishLevels(fill.remainingLevels, side, fill.filledPrice, rng),
        asks: stock.asks.map((level) => ({ ...level, price: Math.max(0.01, roundMoney(level.price + priceChange)) })),
      }),
  };
  if (holding) updatedStock.holding = holding;
  else delete updatedStock.holding;

  const feedback: OrderFeedback = {
    id,
    stockName: stock.name,
    side,
    requestedShares: shares,
    filledShares,
    requestedPrice,
    filledPrice: fill.filledPrice,
    slippagePct,
    fee,
    latencyMs,
    result,
    cashAfter: cash,
  };
  const contractActive = getBrokerTradingFeeRate(state.brokerContract, state.day) === brokeragePolicy.lowFeeRate;
  const brokerContract = state.brokerContract && contractActive
    ? {
      ...state.brokerContract,
      actualTurnover: roundMoney(state.brokerContract.actualTurnover + fill.notional),
      discountedFeesPaid: roundMoney(state.brokerContract.discountedFeesPaid + fee),
      standardFeesEquivalent: roundMoney(
        state.brokerContract.standardFeesEquivalent + calculateTradingFee(fill.notional, standardTradingFeeRate),
      ),
    }
    : state.brokerContract;
  return {
    newState: { ...state, cash, brokerContract, stocks: { ...state.stocks, [stock.id]: updatedStock } },
    feedback,
  };
}
