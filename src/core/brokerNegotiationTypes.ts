export type BrokerTurnover = 10000 | 36000 | 60000;
export type BrokerPlan = 'STANDARD' | 'LOW_COMMISSION';

export interface BrokerageContract {
  plan: 'LOW_COMMISSION';
  signedDay: number;
  expiresDay: number;
  projectedTurnover: BrokerTurnover | null;
  actualTurnover: number;
  discountedFeesPaid: number;
  standardFeesEquivalent: number;
  serviceFee: number;
}

export interface BrokerNegotiationActiveState {
  id: 'ZHOU_BROKER_NEGOTIATION';
  day: number;
  status: 'ACTIVE';
  step: 0 | 1;
  projectedTurnover: BrokerTurnover | null;
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
}

export type BrokerNegotiationState = BrokerNegotiationActiveState | BrokerNegotiationResultState;

export type BrokerNegotiationAction =
  | { type: 'START_BROKER_NEGOTIATION' }
  | { type: 'ESTIMATE_BROKER_TURNOVER'; turnover: BrokerTurnover }
  | { type: 'CHOOSE_BROKER_PLAN'; plan: BrokerPlan }
  | { type: 'ABANDON_BROKER_NEGOTIATION' };
