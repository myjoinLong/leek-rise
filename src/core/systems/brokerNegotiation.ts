import type { BrokerNegotiationAction, BrokerPlan, BrokerTurnover } from '../brokerNegotiationTypes';
import type { GameState } from '../types';

export const brokeragePolicy = {
  standardFeeRate: 0.0015,
  lowFeeRate: 0.001,
  serviceFee: 18,
  termDays: 7,
  turnoverChoices: [10000, 36000, 60000] as const,
};

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function getBrokerTradingFeeRate(
  contract: GameState['brokerContract'],
  day: number,
): number {
  return contract && day >= contract.signedDay && day <= contract.expiresDay
    ? brokeragePolicy.lowFeeRate
    : brokeragePolicy.standardFeeRate;
}

export function estimateBrokerPlanCost(turnover: BrokerTurnover, plan: BrokerPlan): number {
  const rate = plan === 'LOW_COMMISSION' ? brokeragePolicy.lowFeeRate : brokeragePolicy.standardFeeRate;
  const serviceFee = plan === 'LOW_COMMISSION' ? brokeragePolicy.serviceFee : 0;
  return roundMoney(turnover * rate + serviceFee);
}

export function getBrokerBreakEvenTurnover(): number {
  return roundMoney(brokeragePolicy.serviceFee / (brokeragePolicy.standardFeeRate - brokeragePolicy.lowFeeRate));
}

function isBrokerNegotiationActive(state: GameState) {
  const activity = state.activeActivity;
  return activity?.id === 'ZHOU_BROKER_NEGOTIATION' && activity.status === 'ACTIVE'
    ? activity
    : null;
}

export function reduceBrokerNegotiation(state: GameState, action: BrokerNegotiationAction): GameState {
  if (action.type === 'START_BROKER_NEGOTIATION') {
    const contractActive = state.brokerContract && state.day <= state.brokerContract.expiresDay;
    if (state.phase !== 'DAYTIME' || state.activeActivity || state.brokerNegotiationVisitedToday || contractActive) return state;
    return {
      ...state,
      activeActivity: { id: 'ZHOU_BROKER_NEGOTIATION', day: state.day, status: 'ACTIVE', step: 0, projectedTurnover: null },
    };
  }

  const activity = isBrokerNegotiationActive(state);
  if (!activity || activity.day !== state.day || state.phase !== 'DAYTIME') return state;

  if (action.type === 'ABANDON_BROKER_NEGOTIATION') return { ...state, activeActivity: null };
  if (action.type === 'ESTIMATE_BROKER_TURNOVER') {
    if (activity.step !== 0 || !brokeragePolicy.turnoverChoices.includes(action.turnover)) return state;
    return { ...state, activeActivity: { ...activity, step: 1, projectedTurnover: action.turnover } };
  }

  if (activity.step !== 1 || activity.projectedTurnover === null) return state;
  const lowPlan = action.plan === 'LOW_COMMISSION';
  if (lowPlan && state.cash < brokeragePolicy.serviceFee) return state;
  const serviceFeePaid = lowPlan ? brokeragePolicy.serviceFee : 0;
  const expiresDay = lowPlan ? state.day + brokeragePolicy.termDays - 1 : null;
  return {
    ...state,
    cash: roundMoney(state.cash - serviceFeePaid),
    dailyContractFees: roundMoney(state.dailyContractFees + serviceFeePaid),
    brokerContract: lowPlan && expiresDay !== null
      ? {
        plan: 'LOW_COMMISSION', signedDay: state.day, expiresDay,
        projectedTurnover: activity.projectedTurnover, actualTurnover: 0,
        discountedFeesPaid: 0, standardFeesEquivalent: 0, serviceFee: serviceFeePaid,
      }
      : null,
    brokerNegotiationVisitedToday: true,
    activeActivity: {
      id: 'ZHOU_BROKER_NEGOTIATION', day: state.day, status: 'RESULT', step: 2,
      projectedTurnover: activity.projectedTurnover, plan: action.plan, serviceFeePaid, expiresDay,
    },
  };
}
