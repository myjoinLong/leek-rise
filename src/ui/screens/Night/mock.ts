import type { NightVM } from './types';

export function createMockNightVM(): NightVM {
  return {
    day: 4,
    pnlBreakdown: {
      tradingPnl: -1240,
      workIncome: 120,
      activityIncome: 0,
      fees: -38,
      contractFee: 0,
      interest: -270,
      rent: -100,
      membership: -20,
      equipment: -30,
      platformShare: 0,
      netChange: -1578,
    },
    periodicCostPolicy: {
      intervalDays: 7,
      weeklyInterestRate: 0.005,
      restructuredWeeklyInterestRate: 0.0025,
      restructuringWeeks: 8,
      restructuringFee: 200,
      rent: 240,
      membership: 30,
      equipment: 60,
      streamPlatformShareRate: 0.05,
    },
    periodicSettlementDue: true,
    deferredCosts: 0,
    interestGraceApplied: false,
    rateRestructureApplied: false,
    debtRatePlanWeeksRemaining: 0,
    debtCrisisStarted: false,
    debtNegotiationCompleted: false,
    cash: 1622,
    debt: 18000,
    mental: 42,
    dignity: 55,
    fame: 38,
    npcReaction: {
      npcName: '龙哥',
      content: '兄弟，今天手气不行，明天有个大票，别灰心。',
    },
    warnings: ['负债已超过总资产，请留意强平线'],
    brokerageReview: null,
  };
}
