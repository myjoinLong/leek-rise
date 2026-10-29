import type { TradingVM } from './types';

const gen = (base: number, n = 30, vol = 0.015) => {
  let p = base;
  return Array.from({ length: n }, () => {
    p = p * (1 + (Math.random() - 0.48) * vol);
    return +p.toFixed(2);
  });
};

export function createMockVM(): TradingVM {
  const s1 = gen(10.1);
  const s2 = gen(2.88);
  return {
    day: 4,
    phase: 'TRADING',
    cash: 3200,
    debt: 18000,
    leverageAvailable: true,
    leverageOn: false,
    inputShares: 100,
    inputError: null,
    selectedStockId: 'dragon',
    stocks: [
      {
        id: 'dragon', name: '龙科科技', price: s1[s1.length - 1]!,
        changePct: 3.2, isHalted: false,
        holding: { shares: 800, avgCost: 11.85, pnlPct: -12.1 },
        priceHistory: s1,
      },
      {
        id: 'st', name: 'ST 摘帽', price: s2[s2.length - 1]!,
        changePct: -8.1, isHalted: false,
        priceHistory: s2,
      },
    ],
    selectedDetail: {
      id: 'dragon', name: '龙科科技',
      price: s1[s1.length - 1]!,
      changePct: 3.2,
      changeAmount: 0.32,
      priceHistory: s1,
      open: 10.1, high: Math.max(...s1), low: Math.min(...s1),
      volume: 23400, markers: [],
      newsHint: { npcName: '龙哥', time: '07:45', text: '龙科科技，我自己先干了。' },
    },
    maxBuyShares: Math.floor(3200 / s1[s1.length - 1]! / 100) * 100,
    maxSellShares: 800,
    lastOrder: null,
  };
}