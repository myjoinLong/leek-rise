import type { GameState } from './types';
import { mulberry32 } from './rng';

export function createInitialState(seed = 4): GameState {
  const random = mulberry32(seed >>> 0);
  const priceHistory: number[] = [];
  let price = 9.8;
  for (let index = 0; index < 20; index += 1) {
    const drift = index === 0 ? 0 : 0.01 + (random() - 0.5) * 0.04;
    price = Number((price + drift).toFixed(2));
    priceHistory.push(price);
  }
  const open = priceHistory[0] ?? 10;
  const high = Math.max(...priceHistory);
  const low = Math.min(...priceHistory);
  const currentPrice = priceHistory[priceHistory.length - 1] ?? 10;
  const bids = [1, 2, 3].map((level) => ({
    price: Number((currentPrice - level * 0.01).toFixed(2)),
    volume: (Math.floor(random() * 10) + 1) * 100,
  }));
  const asks = [1, 2, 3].map((level) => ({
    price: Number((currentPrice + level * 0.01).toFixed(2)),
    volume: (Math.floor(random() * 10) + 1) * 100,
  }));

  return {
    day: 1,
    phase: 'PRE_MARKET',
    cash: 3200,
    debt: 18000,
    stocks: {
      dragon: {
        id: 'dragon',
        name: '龙科科技',
        price: currentPrice,
        open,
        high,
        low,
        volume: 20000,
        priceHistory,
        bids,
        asks,
        recentTrades: [
          { id: 'seed-buy', price: asks[0]?.price ?? currentPrice, shares: 500, side: 'BUY', isPlayer: false },
          { id: 'seed-sell', price: bids[0]?.price ?? currentPrice, shares: 300, side: 'SELL', isPlayer: false },
        ],
        scriptPhase: 'ACCUMULATE',
        phaseProgress: 0,
        holding: { shares: 800, avgCost: currentPrice },
      },
    },
    selectedStockId: 'dragon',
    inputShares: 100,
    lastOrderFeedback: null,
    orderSequence: 0,
    npcMessage: '昨晚龙哥在群里发了一堆消息，但你决定先看看再说。',
    energy: 100,
    energyMax: 100,
    workedToday: false,
    dayStartEquity: Number((3200 + currentPrice * 800 - 18000).toFixed(2)),
    dailyWorkIncome: 0,
    dailyStreamIncome: 0,
    dailyFees: 0,
    dailyContractFees: 0,
    weeklyStreamIncome: 0,
    periodicCostLedger: { interest: 0, rent: 0, membership: 0, equipment: 0, platformShare: 0, deferred: 0, interestGraceApplied: false, rateRestructureApplied: false },
    lastPeriodicSettlementDay: 0,
    debtCrisisStarted: false,
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
    longgeVisitedToday: false,
    chenVisitedToday: false,
    chartLessonVisitedToday: false,
    riskReplayVisitedToday: false,
    brokerContract: null,
    brokerNegotiationVisitedToday: false,
  };
}
