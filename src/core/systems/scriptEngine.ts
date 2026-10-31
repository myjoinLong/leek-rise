import type { OrderBookLevel, ScriptPhase, StockState, TradeRecord } from '../types';

const phaseOrder: readonly ScriptPhase[] = ['ACCUMULATE', 'PUMP', 'DISTRIBUTE', 'DUMP'];
const ticksPerPhase = 10;
const maxHistoryLength = 120;

function getDrift(phase: ScriptPhase, random: number, volatility = 1): number {
  const multiplier = Number.isFinite(volatility) ? Math.min(2, Math.max(0.5, volatility)) : 1;
  let drift: number;
  switch (phase) {
    case 'ACCUMULATE': drift = -0.0015 + random * 0.003; break;
    case 'PUMP': drift = -0.0005 + random * 0.004; break;
    case 'DISTRIBUTE': drift = -0.0015 + random * 0.003; break;
    case 'DUMP': drift = -0.0035 + random * 0.004; break;
  }
  return drift * multiplier;
}

function getBuyProbability(phase: ScriptPhase): number {
  switch (phase) {
    case 'ACCUMULATE': return 0.58;
    case 'PUMP': return 0.72;
    case 'DISTRIBUTE': return 0.42;
    case 'DUMP': return 0.25;
  }
}

function createOrderBook(price: number, rng: () => number): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  for (let level = 1; level <= 3; level += 1) {
    const volume = (): number => (Math.floor(rng() * 10) + 1) * 100;
    bids.push({ price: Math.max(0.01, Number((price - level * 0.01).toFixed(2))), volume: volume() });
    asks.push({ price: Number((price + level * 0.01).toFixed(2)), volume: volume() });
  }
  return { bids, asks };
}

function createExternalTrades(
  stock: StockState,
  bids: OrderBookLevel[],
  asks: OrderBookLevel[],
  volume: number,
  buyProbability: number,
  rng: () => number,
): TradeRecord[] {
  const trades: TradeRecord[] = [];
  const count = Math.floor(rng() * 3) + 1;
  for (let index = 0; index < count; index += 1) {
    const side = rng() < buyProbability ? 'BUY' : 'SELL';
    const bestLevel = side === 'BUY' ? asks[0] : bids[0];
    trades.unshift({
      id: `${stock.id}-${volume}-${index}`,
      price: bestLevel?.price ?? stock.price,
      shares: (Math.floor(rng() * 10) + 1) * 100,
      side,
      isPlayer: false,
    });
  }
  return trades;
}

export function tickStock(stock: StockState, rng: () => number): StockState {
  const drift = getDrift(stock.scriptPhase, rng(), stock.volatility);
  const price = Math.max(0.01, Number((stock.price * (1 + drift)).toFixed(2)));
  const volumeIncrease = Math.floor(rng() * 1001) + 500;
  const volume = stock.volume + volumeIncrease;
  const { bids, asks } = createOrderBook(price, rng);
  const recentTrades = createExternalTrades(stock, bids, asks, volume, getBuyProbability(stock.scriptPhase), rng);
  const phaseProgress = stock.phaseProgress + 1;
  const phaseComplete = phaseProgress >= ticksPerPhase;
  const currentIndex = phaseOrder.indexOf(stock.scriptPhase);
  const nextPhase = phaseOrder[(currentIndex + 1) % phaseOrder.length] ?? stock.scriptPhase;

  return {
    ...stock,
    price,
    high: Math.max(stock.high, price),
    low: Math.min(stock.low, price),
    volume,
    priceHistory: [...stock.priceHistory, price].slice(-maxHistoryLength),
    bids,
    asks,
    recentTrades: [...recentTrades, ...stock.recentTrades].slice(0, 20),
    scriptPhase: phaseComplete ? nextPhase : stock.scriptPhase,
    phaseProgress: phaseComplete ? 0 : phaseProgress,
  };
}
