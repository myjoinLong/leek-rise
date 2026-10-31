export type BrokerTurnover = 10000 | 36000 | 60000;
export type BrokerPlan = 'STANDARD' | 'LOW_COMMISSION';

export interface BrokerMarketSnapshot {
  stockId: string;
  stockName: string;
  currentPrice: number;
  openPrice: number;
  dayVolume: number;
  recentTradeCount: number;
  recentTurnover: number;
  recentBuyShares: number;
  recentSellShares: number;
  bestSpread: number | null;
}

export interface BrokerageContract {
  plan: 'LOW_COMMISSION';
  signedDay: number;
  expiresDay: number;
  projectedTurnover: BrokerTurnover | null;
  actualTurnover: number;
  discountedFeesPaid: number;
  standardFeesEquivalent: number;
  serviceFee: 18;
}

export interface BrokerContractReview {
  signedDay: number;
  expiresDay: number;
  projectedTurnover: BrokerTurnover | null;
  actualTurnover: number;
  discountedFeesPaid: number;
  standardFeesEquivalent: number;
  serviceFee: 18;
  netSavingsVsStandard: number;
}

export interface BrokerNegotiationActiveState {
  id: 'ZHOU_BROKER_NEGOTIATION';
  day: number;
  status: 'ACTIVE';
  step: 0 | 1;
  projectedTurnover: BrokerTurnover | null;
  previousReview?: BrokerContractReview;
  scenarioVersion?: 2;
  scenarioSeed?: number;
  scenarioIndex?: number;
  marketSnapshot?: BrokerMarketSnapshot;
}

export interface BrokerNegotiationResultState {
  id: 'ZHOU_BROKER_NEGOTIATION';
  day: number;
  status: 'RESULT';
  step: 2;
  projectedTurnover: BrokerTurnover;
  plan: BrokerPlan;
  serviceFeePaid: number;
  expiresDay: number | null;
  previousReview?: BrokerContractReview;
  scenarioVersion?: 2;
  scenarioSeed?: number;
  scenarioIndex?: number;
  marketSnapshot?: BrokerMarketSnapshot;
}

export type BrokerNegotiationState = BrokerNegotiationActiveState | BrokerNegotiationResultState;

export type BrokerNegotiationAction =
  | { type: 'START_BROKER_NEGOTIATION' }
  | { type: 'ESTIMATE_BROKER_TURNOVER'; turnover: BrokerTurnover }
  | { type: 'CHOOSE_BROKER_PLAN'; plan: BrokerPlan }
  | { type: 'ABANDON_BROKER_NEGOTIATION' };
