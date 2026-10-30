import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { previewDebtOffers } from './debtPlanPreview';

function ready(overrides: Partial<GameState> = {}): GameState {
  let state: GameState = { ...createInitialState(), day: 30, phase: 'DAYTIME', debtCrisisStarted: true, dailyWorkIncome: 120, ...overrides };
  state = gameReducer(state, { type: 'START_JIUGE_NEGOTIATION' });
  state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });
  return gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' });
}

describe('read-only debt offer cashflow preview', () => {
  it('matches actual signing, daily calendar, weekly costs and night repayments for all offers', () => {
    const state = ready({ weeklyStreamIncome: 500 });
    const before = structuredClone(state);
    const assumptions = { weeklyWorkIncome: 800, weeklyRepayment: 1000 };
    const previews = previewDebtOffers(state, assumptions);
    expect(previews).toHaveLength(4);
    for (const preview of previews) {
      expect(preview.available).toBe(true);
      let actual = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: preview.choice });
      actual = gameReducer(actual, { type: 'RETURN_FROM_ACTIVITY' });
      for (const row of preview.weeks) {
        while (actual.day < row.day) actual = gameReducer(actual, { type: 'ADVANCE_PHASE' });
        actual = { ...actual, cash: Number((actual.cash + assumptions.weeklyWorkIncome).toFixed(2)) };
        while (actual.phase !== 'NIGHT') actual = gameReducer(actual, { type: 'ADVANCE_PHASE' });
        const amount = preview.choice === 'SIGN_INSTALLMENTS' ? actual.debtInstallmentPlan?.lastReceipt?.paid ?? 0 : Math.min(actual.cash, actual.debt, assumptions.weeklyRepayment);
        if (preview.choice !== 'SIGN_INSTALLMENTS') actual = gameReducer(actual, { type: 'REPAY_DEBT', amount });
        expect(row).toMatchObject({ day: actual.day, cash: actual.cash, debt: actual.debt, interest: actual.periodicCostLedger.interest, repaid: amount });
      }
      expect(preview.cashMinusDebtChange).toBeCloseTo(actual.cash - actual.debt - (state.cash - state.debt), 2);
      expect(preview.weeks[0]?.operatingCosts).toBe(355);
      expect(preview.weeks[1]?.operatingCosts).toBe(330);
    }
    expect(state).toEqual(before);
    expect(previewDebtOffers(state, assumptions)).toEqual(previews);
  });

  it('makes fee disadvantage visible when debt is cleared at the first settlement', () => {
    const [standard, grace, rate] = previewDebtOffers(ready({ cash: 30000 }), { weeklyWorkIncome: 0, weeklyRepayment: 30000 });
    expect(standard!.weeks[0]?.debt).toBe(0);
    expect(grace!.cashMinusDebtChange - standard!.cashMinusDebtChange).toBe(90);
    expect(rate!.cashMinusDebtChange - standard!.cashMinusDebtChange).toBe(-155);
    expect(rate!.weeks.slice(1).every((row) => row.interest === 0)).toBe(true);
    expect(rate!.weeks).toHaveLength(8);
  });

  it('reconciles deferred costs, capitalized interest and cash-limited repayment without invented penalties', () => {
    const state = ready({ cash: 200 });
    const previews = previewDebtOffers(state, { weeklyWorkIncome: 0, weeklyRepayment: 100 });
    for (const preview of previews) {
      let cash = state.cash - preview.contractFee;
      let debt = state.debt;
      for (const row of preview.weeks) {
        expect(row.cash).toBeCloseTo(cash - (row.operatingCosts - row.deferred) - row.repaid, 2);
        expect(row.debt).toBeCloseTo(debt + row.interest + row.deferred - row.repaid, 2);
        expect(row.repaymentShortfall).toBe(preview.choice === 'SIGN_INSTALLMENTS' ? row.day === 35 ? 300 : 0 : 100);
        cash = row.cash;
        debt = row.debt;
      }
    }
    expect(previews[2]?.weeks[0]?.deferred).toBe(330);
  });

  it('includes a settlement due today and skips one already settled today', () => {
    const today = previewDebtOffers(ready({ day: 35 }), { weeklyWorkIncome: 0, weeklyRepayment: 0 });
    expect(today[0]?.weeks[0]?.day).toBe(35);
    const settled = previewDebtOffers(ready({ day: 35, lastPeriodicSettlementDay: 35 }), { weeklyWorkIncome: 0, weeklyRepayment: 0 });
    expect(settled[0]?.weeks[0]?.day).toBe(42);
  });

  it('uses core eligibility instead of simulating unavailable concessions', () => {
    const poor = previewDebtOffers(ready({ cash: 199.99 }), { weeklyWorkIncome: 1000, weeklyRepayment: 100 });
    expect(poor[2]).toMatchObject({ available: false, weeks: [], contractFee: 0 });
    const unsupported = ready();
    if (unsupported.activeActivity?.id === 'JIUGE_NEGOTIATION') unsupported.activeActivity.decisions = [];
    const previews = previewDebtOffers(unsupported, { weeklyWorkIncome: 0, weeklyRepayment: 0 });
    expect(previews.map((preview) => preview.available)).toEqual([true, false, false, false]);
    expect(previewDebtOffers(createInitialState(), { weeklyWorkIncome: 0, weeklyRepayment: 0 })).toEqual([]);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 0.001, 1000000.01])('rejects invalid scenario amounts: %s', (amount) => {
    expect(() => previewDebtOffers(ready(), { weeklyWorkIncome: amount, weeklyRepayment: 0 })).toThrow(RangeError);
    expect(() => previewDebtOffers(ready(), { weeklyWorkIncome: 0, weeklyRepayment: amount })).toThrow(RangeError);
  });
});
