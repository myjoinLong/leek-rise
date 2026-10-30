import { describe, expect, it } from 'vitest';
import { activityContracts } from '../activityContracts';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import { estimateBrokerPlanCost, getBrokerBreakEvenTurnover, getBrokerTradingFeeRate } from './brokerNegotiation';

function startNegotiation() {
  return gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, activityContracts.ZHOU_BROKER_NEGOTIATION.startAction);
}

describe('Zhou brokerage negotiation activity', () => {
  it('shows the real fee break-even and makes the estimate match the selected turnover', () => {
    expect(getBrokerBreakEvenTurnover()).toBe(36000);
    expect(estimateBrokerPlanCost(10000, 'STANDARD')).toBe(15);
    expect(estimateBrokerPlanCost(10000, 'LOW_COMMISSION')).toBe(28);
    expect(estimateBrokerPlanCost(36000, 'STANDARD')).toBe(54);
    expect(estimateBrokerPlanCost(36000, 'LOW_COMMISSION')).toBe(54);
    expect(estimateBrokerPlanCost(60000, 'LOW_COMMISSION')).toBe(78);
  });

  it('signs an optional seven-day contract and applies its rate to subsequent fills', () => {
    let state = startNegotiation();
    state = gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 60000 });
    state = gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan: 'LOW_COMMISSION' });

    expect(state.cash).toBe(3182);
    expect(state.dailyContractFees).toBe(18);
    expect(state.brokerNegotiationVisitedToday).toBe(true);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', plan: 'LOW_COMMISSION', expiresDay: 7 });
    expect(getBrokerTradingFeeRate(state.brokerContract, 1)).toBe(0.001);
    expect(getBrokerTradingFeeRate(state.brokerContract, 7)).toBe(0.001);
    expect(getBrokerTradingFeeRate(state.brokerContract, 8)).toBe(0.0015);
    expect(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }).activeActivity).toBeNull();
    const afterReturn = { ...state, activeActivity: null };
    expect(gameReducer(afterReturn, activityContracts.ZHOU_BROKER_NEGOTIATION.startAction)).toEqual(afterReturn);
  });

  it('keeps the standard plan free and lets an abandoned visit restart', () => {
    let state = startNegotiation();
    state = gameReducer(state, { type: 'ABANDON_BROKER_NEGOTIATION' });
    expect(state.cash).toBe(3200);
    expect(state.brokerNegotiationVisitedToday).toBe(false);

    state = gameReducer(state, activityContracts.ZHOU_BROKER_NEGOTIATION.startAction);
    state = gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 36000 });
    state = gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan: 'STANDARD' });
    expect(state.cash).toBe(3200);
    expect(state.dailyContractFees).toBe(0);
    expect(state.brokerContract).toBeNull();
    expect(state.brokerNegotiationVisitedToday).toBe(true);
  });

  it('rejects a signing that cannot cover the visible service fee', () => {
    let state = { ...startNegotiation(), cash: 17.99 };
    state = gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 60000 });
    const beforeChoice = state;
    state = gameReducer(state, { type: 'CHOOSE_BROKER_PLAN', plan: 'LOW_COMMISSION' });
    expect(state).toBe(beforeChoice);
  });
});
