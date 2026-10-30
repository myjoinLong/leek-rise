import type { GameState } from '../types';
import type { DebtInstallmentAction, DebtInstallmentPlan } from '../debtInstallmentTypes';

export const debtInstallmentPolicy = { periods: 8, weeklyPayment: 300 } as const;
const money = (value: number): number => Number(value.toFixed(2));

export function createDebtInstallmentPlan(): DebtInstallmentPlan {
  return { status: 'ACTIVE', remaining: debtInstallmentPolicy.periods, weeklyPayment: debtInstallmentPolicy.weeklyPayment, lastReceipt: null };
}

export function settleDebtInstallments(state: GameState): GameState {
  const plan = state.debtInstallmentPlan;
  if (!plan || plan.status !== 'ACTIVE' || plan.remaining <= 0 || plan.lastReceipt?.day === state.day) return state;
  const due = money(Math.min(plan.weeklyPayment, state.debt));
  const paid = money(Math.min(due, Math.max(0, state.cash)));
  const shortfall = money(due - paid);
  const remaining = plan.remaining - (shortfall === 0 ? 1 : 0);
  const debt = money(state.debt - paid);
  return {
    ...state,
    cash: money(state.cash - paid),
    debt,
    debtCrisisStarted: debt === 0 ? false : state.debtCrisisStarted,
    debtInstallmentPlan: {
      ...plan,
      remaining,
      status: debt === 0 ? 'DEBT_CLEARED' : shortfall > 0 ? 'PAUSED' : remaining === 0 ? 'FINISHED' : 'ACTIVE',
      lastReceipt: { day: state.day, due, paid, shortfall },
    },
  };
}

export function reduceDebtInstallmentAction(state: GameState, action: DebtInstallmentAction): GameState {
  const plan = state.debtInstallmentPlan;
  if (state.phase !== 'NIGHT' || !plan || state.debt <= 0 || plan.remaining <= 0) return state;
  if (action.type === 'RESUME_DEBT_INSTALLMENTS') {
    return plan.status === 'PAUSED' ? { ...state, debtInstallmentPlan: { ...plan, status: 'ACTIVE' } } : state;
  }
  return plan.status === 'ACTIVE' || plan.status === 'PAUSED'
    ? { ...state, debtInstallmentPlan: { ...plan, status: 'CANCELLED' } }
    : state;
}
