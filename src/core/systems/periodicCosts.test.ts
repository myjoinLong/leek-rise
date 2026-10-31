import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import { settlePeriodicCosts } from './periodicCosts';

describe('weekly cost settlement', () => {
  it('does not charge before the seventh day and settles once on day seven', () => {
    const beforeDue = { ...createInitialState(), day: 6 };
    expect(settlePeriodicCosts(beforeDue)).toBe(beforeDue);

    const due = { ...beforeDue, day: 7 };
    const settled = settlePeriodicCosts(due);
    expect(settled.cash).toBe(2870);
    expect(settled.debt).toBe(18090);
    expect(settled.periodicCostLedger).toEqual({
      interest: 90, rent: 240, membership: 30, equipment: 60, platformShare: 0, deferred: 0, interestGraceApplied: false, rateRestructureApplied: false,
    });
    expect(settlePeriodicCosts(settled)).toBe(settled);
  });

  it('doubles fixed operating costs from chapter two without multiplying interest or revenue share', () => {
    const day35 = { ...createInitialState(), day: 35, weeklyStreamIncome: 2000 };
    const settled = settlePeriodicCosts(day35);
    expect(settled.periodicCostLedger).toEqual({
      interest: 90, rent: 480, membership: 60, equipment: 120, platformShare: 100, deferred: 0,
      interestGraceApplied: false, rateRestructureApplied: false,
    });
    expect(settled.cash).toBe(2440);
    expect(settled.debt).toBe(18090);
  });

  it('applies platform share to gross stream income and capitalizes unpaid fixed costs', () => {
    const due = {
      ...createInitialState(),
      day: 7,
      cash: 100,
      weeklyStreamIncome: 2000,
    };
    const settled = settlePeriodicCosts(due);
    expect(settled.cash).toBe(0);
    expect(settled.debt).toBe(18420);
    expect(settled.weeklyStreamIncome).toBe(0);
    expect(settled.periodicCostLedger).toEqual({
      interest: 90, rent: 240, membership: 30, equipment: 60, platformShare: 100, deferred: 330, interestGraceApplied: false, rateRestructureApplied: false,
    });
  });

  it('rounds interest to cents and can settle again in a later week', () => {
    const day14 = { ...createInitialState(), day: 14, debt: 18180.45, lastPeriodicSettlementDay: 7 };
    const settled = settlePeriodicCosts(day14);
    expect(settled.debt).toBe(18271.35);
    expect(settled.lastPeriodicSettlementDay).toBe(14);
  });

  it('applies a negotiated interest grace once and preserves other weekly costs', () => {
    const day35 = { ...createInitialState(), day: 35, debtInterestGraceWeeksRemaining: 1 };
    const settled = settlePeriodicCosts(day35);
    expect(settled.debt).toBe(18000);
    expect(settled.debtInterestGraceWeeksRemaining).toBe(0);
    expect(settled.periodicCostLedger.interestGraceApplied).toBe(true);
    expect(settled.periodicCostLedger.rent).toBe(480);
    expect(settled.cash).toBe(2540);
  });

  it('uses the lower rate for eight due settlements and then restores the standard rate', () => {
    let state = { ...createInitialState(), debtRatePlanWeeksRemaining: 8 };
    for (let index = 0; index < 8; index += 1) {
      const day = 35 + index * 7;
      const expectedInterest = Number((state.debt * 0.0025).toFixed(2));
      state = settlePeriodicCosts({ ...state, day, lastPeriodicSettlementDay: day - 7 });
      expect(state.periodicCostLedger.interest).toBe(expectedInterest);
      expect(state.periodicCostLedger.rateRestructureApplied).toBe(true);
      expect(state.debtRatePlanWeeksRemaining).toBe(7 - index);
    }
    const expectedStandardInterest = Number((state.debt * 0.005).toFixed(2));
    state = settlePeriodicCosts({ ...state, day: 91, lastPeriodicSettlementDay: 84 });
    expect(state.periodicCostLedger.interest).toBe(expectedStandardInterest);
    expect(state.periodicCostLedger.rateRestructureApplied).toBe(false);
    expect(state.debtRatePlanWeeksRemaining).toBe(0);
  });
});
