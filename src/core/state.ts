import type { GameState } from './types';
import { mulberry32 } from './rng';
import { firstChapterStartingDebt } from './timeRules';
import { createEmptyNpcActivityMemory } from './npcActivityMemory';
import { stockCatalog } from './stockCatalog';
import type { StockDefinition } from './stockCatalog';

function roundPrice(value: number): number {
  return Math.max(0.01, Number(value.toFixed(2)));
}

function stockSeed(seed: number, id: string): number {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash ^ seed) >>> 0;
}

function createPriceHistory(definition: StockDefinition, rng: () => number, legacyDragon: boolean): number[] {
  const history: number[] = [];
  if (legacyDragon) {
    let price = 9.8;
    for (let index = 0; index < 20; index += 1) {
      const drift = index === 0 ? 0 : 0.01 + (rng() - 0.5) * 0.04;
      price = roundPrice(price + drift);
      history.push(price);
    }
    return history;
  }

  let price = roundPrice(definition.referencePrice * 0.98);
  for (let index = 0; index < 20; index += 1) {
    if (index > 0) {
      const drift = 0.001 + (rng() - 0.5) * 0.008 * definition.volatility;
      price = roundPrice(price * (1 + drift));
    }
    history.push(price);
  }
  return history;
}

function createOrderBook(price: number, rng: () => number): { bids: GameState['stocks'][string]['bids']; asks: GameState['stocks'][string]['asks'] } {
  const levels = (side: 'BUY' | 'SELL') => [1, 2, 3].map((level) => ({
    price: roundPrice(price + (side === 'BUY' ? -1 : 1) * level * 0.01),
    volume: (Math.floor(rng() * 10) + 1) * 100,
  }));
  return { bids: levels('BUY'), asks: levels('SELL') };
}

function createStock(definition: StockDefinition, rng: () => number, legacyDragon: boolean): GameState['stocks'][string] {
  const priceHistory = createPriceHistory(definition, rng, legacyDragon);
  const price = priceHistory[priceHistory.length - 1] ?? definition.referencePrice;
  const { bids, asks } = createOrderBook(price, rng);
  const stock: GameState['stocks'][string] = {
    id: definition.id,
    name: definition.name,
    symbol: definition.symbol,
    sector: definition.sector,
    volatility: definition.volatility,
    price,
    open: priceHistory[0] ?? price,
    high: Math.max(...priceHistory),
    low: Math.min(...priceHistory),
    volume: definition.initialVolume,
    priceHistory,
    bids,
    asks,
    recentTrades: [
      { id: `${definition.id}-seed-buy`, price: asks[0]?.price ?? price, shares: 500, side: 'BUY', isPlayer: false },
      { id: `${definition.id}-seed-sell`, price: bids[0]?.price ?? price, shares: 300, side: 'SELL', isPlayer: false },
    ],
    scriptPhase: definition.scriptPhase,
    phaseProgress: definition.phaseProgress,
  };
  if (definition.id === 'dragon') stock.holding = { shares: 800, avgCost: price };
  return stock;
}

function createStockPool(seed: number): Record<string, GameState['stocks'][string]> {
  const legacyRng = mulberry32(seed >>> 0);
  const stocks: Record<string, GameState['stocks'][string]> = {};
  for (const definition of stockCatalog) {
    const rng = definition.id === 'dragon' ? legacyRng : mulberry32(stockSeed(seed, definition.id));
    stocks[definition.id] = createStock(definition, rng, definition.id === 'dragon');
  }
  return stocks;
}

export function mergeStockPool(
  existing: Record<string, GameState['stocks'][string]>,
  seed: number,
): Record<string, GameState['stocks'][string]> {
  const defaults = createStockPool(seed);
  const stocks: Record<string, GameState['stocks'][string]> = { ...defaults, ...existing };
  for (const definition of stockCatalog) {
    const current = existing[definition.id];
    const fallback = defaults[definition.id];
    if (!current || !fallback) continue;
    stocks[definition.id] = {
      ...current,
      symbol: current.symbol ?? definition.symbol,
      sector: current.sector ?? definition.sector,
      volatility: current.volatility ?? definition.volatility,
    };
  }
  return stocks;
}

export function createInitialState(seed = 4): GameState {
  const stocks = createStockPool(seed);
  const initialStock = stocks.dragon;
  const currentPrice = initialStock?.price ?? 10;

  return {
    day: 1,
    scenarioSeed: seed >>> 0,
    phase: 'PRE_MARKET',
    marketTicksThisDay: 0,
    cash: 3200,
    debt: firstChapterStartingDebt,
    stocks,
    selectedStockId: 'dragon',
    inputShares: 100,
    lastOrderFeedback: null,
    orderSequence: 0,
    npcMessage: '昨晚龙哥在群里发了一堆消息，但你决定先看看再说。',
    energy: 100,
    energyMax: 100,
    workedToday: false,
    dayStartEquity: Number((3200 + currentPrice * 800 - firstChapterStartingDebt).toFixed(2)),
    dailyWorkIncome: 0,
    dailyStreamIncome: 0,
    dailyFees: 0,
    dailyContractFees: 0,
    weeklyStreamIncome: 0,
    periodicCostLedger: { interest: 0, rent: 0, membership: 0, equipment: 0, platformShare: 0, deferred: 0, interestGraceApplied: false, rateRestructureApplied: false },
    lastPeriodicSettlementDay: 0,
    debtCrisisStarted: false,
    debtCrisisRecoveryDay: null,
    debtNegotiationCompleted: false,
    debtInterestGraceWeeksRemaining: 0,
    debtRatePlanWeeksRemaining: 0,
    debtInstallmentPlan: null,
    fame: 0,
    streamedToday: false,
    gender: null,
    leechLevel: 100,
    activeActivity: null,
    marketIntel: null,
    longgeLastConclusion: null,
    longgeVisitedToday: false,
    chenVisitedToday: false,
    chartLessonVisitedToday: false,
    riskReplayVisitedToday: false,
    brokerContract: null,
    brokerNegotiationVisitedToday: false,
    npcActivityMemory: createEmptyNpcActivityMemory(),
  };
}
