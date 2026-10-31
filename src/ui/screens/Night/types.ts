export interface NightVM {
  day: number;
  chapter: {
    number: 1 | 2 | 3;
    title: string;
    startDay: number;
    endDay: number | null;
    fixedCostMultiplier: 1 | 2;
  };
  pnlBreakdown: {
    tradingPnl: number;
    workIncome: number;
    activityIncome: number;
    fees: number;
    contractFee: number;
    interest: number;
    rent: number;
    membership: number;
    equipment: number;
    platformShare: number;
    netChange: number;
  };
  periodicCostPolicy: {
    intervalDays: number;
    weeklyInterestRate: number;
    restructuredWeeklyInterestRate: number;
    restructuringWeeks: number;
    restructuringFee: number;
    rent: number;
    membership: number;
    equipment: number;
    streamPlatformShareRate: number;
  };
  periodicSettlementDue: boolean;
  deferredCosts: number;
  interestGraceApplied: boolean;
  rateRestructureApplied: boolean;
  debtRatePlanWeeksRemaining: number;
  debtCrisisStarted: boolean;
  debtCrisisRecoveredTonight: boolean;
  debtNegotiationCompleted: boolean;
  cash: number;
  debt: number;
  mental: number;
  dignity: number;
  fame: number;
  npcReaction: {
    npcName: string;
    content: string;
  };
  warnings: string[];
  brokerageReview: {
    active: boolean;
    signedDay: number;
    expiresDay: number;
    projectedTurnover: number | null;
    actualTurnover: number;
    discountedFeesPaid: number;
    standardFeesEquivalent: number;
    serviceFee: number;
    netSavings: number;
  } | null;
}
