import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { previewDebtOffers } from './debtPlanPreview';
import { simulateEconomy } from '../simulation/economySimulation';

export function signedInstallments(overrides: Partial<GameState> = {}): GameState {
  let state: GameState = { ...createInitialState(), day: 30, phase: 'DAYTIME', debtCrisisStarted: true, dailyWorkIncome: 120, ...overrides };
  state = gameReducer(state, { type: 'START_JIUGE_NEGOTIATION' });
  state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });
  state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' });
  return gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SIGN_INSTALLMENTS' });
}

function due(state: GameState, day = 35): GameState {
  return gameReducer({ ...state, activeActivity: null, day, phase: 'TRADING' }, { type: 'ADVANCE_PHASE' });
}

describe('disclosed installment fulfillment prototype', () => {
  it('signs without a reward or charge, and blocks replay and peripheral actions on the receipt', () => {
    const state = signedInstallments();
    expect(state.cash).toBe(3200);
    expect(state.debt).toBe(18000);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', outcome: 'INSTALLMENTS' });
    expect(state.debtInstallmentPlan).toMatchObject({ status: 'ACTIVE', remaining: 8, lastReceipt: null });
    expect(gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SIGN_INSTALLMENTS' })).toBe(state);
    expect(gameReducer(state, { type: 'CANCEL_DEBT_INSTALLMENTS' })).toBe(state);
    expect(signedInstallments({ dailyWorkIncome: 0 }).debtInstallmentPlan).toBeNull();
    expect(signedInstallments({ debtRatePlanWeeksRemaining: 1 }).debtInstallmentPlan).toBeNull();
  });

  it('settles costs before repayment, preserves equity, and cannot debit twice on re-entry', () => {
    const state = due(signedInstallments());
    expect(state.cash).toBe(2240);
    expect(state.debt).toBe(17790);
    expect(state.debtInstallmentPlan?.lastReceipt).toEqual({ day: 35, due: 300, paid: 300, shortfall: 0 });
    expect(state.cash - state.debt).toBe(3200 - 18000 - 660 - 90);
    const replay = gameReducer(state, { type: 'CHANGE_PHASE', phase: 'NIGHT' });
    expect(replay.cash).toBe(state.cash);
    expect(replay.debtInstallmentPlan).toEqual(state.debtInstallmentPlan);
  });

  it('ends the debt crisis when scheduled repayment reaches the confirmed chapter debt cap', () => {
    const state = due(signedInstallments({ cash: 10000, debt: 3200 }));

    expect(state.debt).toBe(2916);
    expect(state.debtCrisisStarted).toBe(false);
    expect(state.debtCrisisRecoveryDay).toBe(35);
  });

  it('partially pays then pauses without extra debt, resumes only by choice, and can cancel', () => {
    const state = due(signedInstallments({ cash: 760 }));
    expect(state.debtInstallmentPlan).toMatchObject({ status: 'PAUSED', remaining: 8, lastReceipt: { due: 300, paid: 100, shortfall: 200 } });
    expect(state.cash).toBe(0);
    expect(state.debt).toBe(17990);
    const stillPaused = due({ ...state, cash: 1620 }, 42);
    expect(stillPaused.debtInstallmentPlan).toEqual(state.debtInstallmentPlan);
    expect(stillPaused.cash).toBe(960);
    const resumed = gameReducer(stillPaused, { type: 'RESUME_DEBT_INSTALLMENTS' });
    expect(due(resumed, 42).cash).toBe(960);
    expect(due(resumed, 49).debtInstallmentPlan?.remaining).toBe(7);
    const cancelled = gameReducer(resumed, { type: 'CANCEL_DEBT_INSTALLMENTS' });
    expect(due(cancelled, 49).debtInstallmentPlan?.status).toBe('CANCELLED');
    expect(gameReducer(cancelled, { type: 'RESUME_DEBT_INSTALLMENTS' })).toBe(cancelled);
  });

  it('does not consume a period when the player has no cash for the due payment', () => {
    const state = due(signedInstallments({ cash: 330 }));
    expect(state.debtInstallmentPlan).toMatchObject({ status: 'PAUSED', remaining: 8,
      lastReceipt: { due: 300, paid: 0, shortfall: 300 } });
    expect(state.cash).toBe(0);
  });

  it('ends after eight fully paid periods while retaining residual debt and the crisis', () => {
    let state = signedInstallments({ cash: 30000 });
    for (let index = 0; index < 8; index += 1) state = due(state, 35 + index * 7);
    expect(state.debtInstallmentPlan).toMatchObject({ status: 'FINISHED', remaining: 0 });
    expect(state.debt).toBeGreaterThan(0);
    expect(state.debtCrisisStarted).toBe(true);
    expect(due(state, 91).debtInstallmentPlan).toEqual(state.debtInstallmentPlan);
  });

  it('clears a small debt automatically and supports early voluntary repayment', () => {
    const state = due(signedInstallments({ debt: 100 }));
    expect(state.debt).toBe(0);
    expect(state.debtCrisisStarted).toBe(false);
    expect(state.debtInstallmentPlan?.status).toBe('DEBT_CLEARED');
    expect(state.debtInstallmentPlan?.lastReceipt?.paid).toBe(100.5);
    const voluntary = gameReducer({ ...signedInstallments({ debt: 100 }), activeActivity: null, phase: 'NIGHT' }, { type: 'REPAY_DEBT', amount: 100 });
    expect(voluntary.debtInstallmentPlan?.status).toBe('DEBT_CLEARED');
    expect(due(voluntary).debtInstallmentPlan?.lastReceipt).toBeNull();
  });

  it('preview exposes shortfall and suspension without mutating state or applying manual payments', () => {
    const signed = signedInstallments({ cash: 760 });
    const state = { ...signed, debtInstallmentPlan: null, debtNegotiationCompleted: false,
      activeActivity: { id: 'JIUGE_NEGOTIATION', day: 30, status: 'ACTIVE', step: 2,
        decisions: [{ step: 0, choice: 'SHOW_LEDGER' }, { step: 1, choice: 'PROVE_INCOME' }] } } satisfies GameState;
    const before = structuredClone(state);
    const preview = previewDebtOffers(state, { weeklyWorkIncome: 0, weeklyRepayment: 10000 })[3]!;
    expect(preview.weeks[0]).toMatchObject({ repaid: 100, repaymentShortfall: 200,
      installmentStatus: { status: 'PAUSED', remaining: 8 } });
    expect(preview.weeks.slice(1).every((week) => week.repaid === 0)).toBe(true);
    expect(state).toEqual(before);
  });

  it('reconciles automatic and voluntary repayments across 32 long-run strategy scenarios', () => {
    for (const strategy of ['WORK', 'WORK_CASH', 'WORK_STREAM', 'CAFE'] as const) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        for (const seed of [4, 17]) {
          for (const reserve of [undefined, 1000]) {
            const result = simulateEconomy({ strategy, gender, seed, days: 90, ticksPerDay: 0,
              deliveryRoute: ['ALLEY', 'MAIN', 'RUSH'], negotiationOffer: 'INSTALLMENTS',
              repayment: reserve === undefined ? undefined : { cashReserve: reserve } });
            let debt = 18000;
            for (const day of result.daily) {
              expect(day.debt).toBeCloseTo(debt + day.borrowed + day.interest + day.operatingCostsDeferred - day.repaid, 2);
              debt = day.debt;
            }
            expect(result.totals.repaid).toBeGreaterThan(0);
            expect(result.finalState.debtInstallmentPlan).not.toBeNull();
          }
        }
      }
    }
  });

  it('models a missed settlement during a work interruption and deliberate resumption', () => {
    const result = simulateEconomy({
      strategy: 'CAFE', gender: 'MALE', seed: 42, days: 50, ticksPerDay: 0,
      deliveryRoute: ['ALLEY', 'MAIN', 'RUSH'], negotiationOffer: 'INSTALLMENTS',
      cafe: { mistakesPerShift: 0, skipEveryDays: 5 },
      repayment: { cashReserve: 0, throughDay: 35 },
      resumeInstallmentsOnDays: [42],
    });
    const missedPayment = result.daily.find((day) => day.day === 35);
    const nextPayment = result.daily.find((day) => day.day === 49);
    expect(missedPayment).toMatchObject({ installmentDue: 300, installmentPaid: 0, installmentShortfall: 300 });
    expect(result.daily.find((day) => day.day === 42)?.installmentDue).toBe(0);
    expect(nextPayment).toMatchObject({ installmentDue: 300, installmentPaid: 300, installmentShortfall: 0 });
    expect(result.totals.installmentShortfalls).toBe(1);
    expect(result.totals.installmentPaid).toBe(300);
    expect(result.finalState.debtInstallmentPlan).toMatchObject({ status: 'ACTIVE', remaining: 7 });

    let debt = 18000;
    for (const day of result.daily) {
      expect(day.debt).toBeCloseTo(debt + day.borrowed + day.interest + day.operatingCostsDeferred - day.repaid, 2);
      debt = day.debt;
    }
  });
});
