import { describe, expect, it } from 'vitest';
import { activityContracts } from '../activityContracts';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import { estimateBrokerPlanCost, getBrokerBreakEvenTurnover, getBrokerTradingFeeRate, reviewBrokerContract } from './brokerNegotiation';
import { getBrokerNegotiationScenario, getBrokerNegotiationScenarioIndex, brokerNegotiationScenarioCount } from '../brokerNegotiationScenarios';
import { brokerNegotiationSchema } from '../../save/brokerNegotiationSchema';

function startNegotiation() {
  return gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, activityContracts.ZHOU_BROKER_NEGOTIATION.startAction);
}

describe('Zhou brokerage negotiation activity', () => {
  it('assigns a reproducible, non-repeating first-chapter desk scenario sequence', () => {
    const days = Array.from({ length: brokerNegotiationScenarioCount }, (_, index) => index + 1);
    const firstSeed = days.map((day) => getBrokerNegotiationScenarioIndex(day, 47));
    const secondSeed = days.map((day) => getBrokerNegotiationScenarioIndex(day, 48));

    expect(new Set(firstSeed).size).toBe(brokerNegotiationScenarioCount);
    expect(days.map((day) => getBrokerNegotiationScenarioIndex(day, 47))).toEqual(firstSeed);
    expect(secondSeed).not.toEqual(firstSeed);
    expect(firstSeed.every((index) => getBrokerNegotiationScenario(index) !== null)).toBe(true);
  });

  it('captures actual market evidence once and carries it through the saved activity and receipt', () => {
    const initial = { ...createInitialState(47), phase: 'DAYTIME' as const };
    const state = gameReducer(initial, { type: 'START_BROKER_NEGOTIATION' });
    const run = state.activeActivity;
    expect(run).toMatchObject({
      id: 'ZHOU_BROKER_NEGOTIATION', scenarioVersion: 2, scenarioSeed: 47,
      scenarioIndex: getBrokerNegotiationScenarioIndex(initial.day, 47),
      marketSnapshot: {
        stockId: 'dragon', stockName: '龙科科技', recentTradeCount: 2,
        recentTurnover: expect.any(Number), recentBuyShares: 500, recentSellShares: 300,
      },
    });
    expect(brokerNegotiationSchema.safeParse(run).success).toBe(true);
    expect(brokerNegotiationSchema.safeParse({
      id: 'ZHOU_BROKER_NEGOTIATION', day: 1, status: 'ACTIVE', step: 0, projectedTurnover: null,
    }).success).toBe(true);

    const estimated = gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 36000 });
    const settled = gameReducer(estimated, { type: 'CHOOSE_BROKER_PLAN', plan: 'STANDARD' });
    expect(settled.activeActivity).toMatchObject({
      status: 'RESULT', scenarioVersion: 2, scenarioSeed: 47,
      scenarioIndex: getBrokerNegotiationScenarioIndex(initial.day, 47),
      marketSnapshot: run?.id === 'ZHOU_BROKER_NEGOTIATION' ? run.marketSnapshot : undefined,
    });
    expect(brokerNegotiationSchema.safeParse(settled.activeActivity).success).toBe(true);
    expect(settled.cash).toBe(initial.cash);
    expect(settled.debt).toBe(initial.debt);
  });

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

  it('reconciles the prior contract against actual turnover and the standard-fee alternative', () => {
    const review = reviewBrokerContract({
      plan: 'LOW_COMMISSION', signedDay: 1, expiresDay: 7, projectedTurnover: 36000,
      actualTurnover: 10000, discountedFeesPaid: 10, standardFeesEquivalent: 15, serviceFee: 18,
    });
    expect(review).toMatchObject({
      actualTurnover: 10000, discountedFeesPaid: 10, standardFeesEquivalent: 15,
      serviceFee: 18, netSavingsVsStandard: -13,
    });
    expect(reviewBrokerContract(null)).toBeNull();
  });
});
