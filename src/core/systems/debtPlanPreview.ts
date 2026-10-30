import { gameReducer } from '../reducer';
import type { GameState } from '../types';
import { periodicCostPolicy } from './periodicCosts';

export interface DebtPreviewAssumptions {
  weeklyWorkIncome: number;
  weeklyRepayment: number;
}

export interface DebtPreviewWeek {
  day: number;
  cash: number;
  debt: number;
  interest: number;
  operatingCosts: number;
  deferred: number;
  repaid: number;
  repaymentShortfall: number;
  installmentStatus: GameState['debtInstallmentPlan'];
}

export interface DebtOfferPreview {
  choice: 'SIGN_STANDARD' | 'ASK_INTEREST_GRACE' | 'SIGN_RATE_RESTRUCTURE' | 'SIGN_INSTALLMENTS';
  available: boolean;
  contractFee: number;
  weeks: DebtPreviewWeek[];
  cashMinusDebtChange: number;
}

const offers = [
  { choice: 'SIGN_STANDARD', outcome: 'STANDARD_TERMS' },
  { choice: 'ASK_INTEREST_GRACE', outcome: 'INTEREST_GRACE' },
  { choice: 'SIGN_RATE_RESTRUCTURE', outcome: 'RATE_RESTRUCTURE' },
  { choice: 'SIGN_INSTALLMENTS', outcome: 'INSTALLMENTS' },
] as const;
const money = (value: number): number => Number(value.toFixed(2));

export function previewDebtOffers(state: GameState, assumptions: DebtPreviewAssumptions): DebtOfferPreview[] {
  for (const amount of [assumptions.weeklyWorkIncome, assumptions.weeklyRepayment]) {
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000 || money(amount) !== amount) {
      throw new RangeError('Preview amounts must be between 0 and 1000000 with at most two decimals.');
    }
  }
  const run = state.activeActivity;
  if (run?.id !== 'JIUGE_NEGOTIATION' || run.status !== 'ACTIVE' || run.step !== 2) return [];
  return offers.map(({ choice, outcome }) => {
    let projected = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice });
    const result = projected.activeActivity;
    const available = result?.id === 'JIUGE_NEGOTIATION' && result.status === 'RESULT' && result.outcome === outcome;
    const preview: DebtOfferPreview = { choice, available, contractFee: 0, weeks: [], cashMinusDebtChange: 0 };
    if (!available) return preview;
    preview.contractFee = money(state.cash - projected.cash);
    projected = gameReducer(projected, { type: 'RETURN_FROM_ACTIVITY' });
    const interval = periodicCostPolicy.intervalDays;
    const dueDay = Math.ceil(state.day / interval) * interval;
    const firstDueDay = dueDay === state.lastPeriodicSettlementDay ? dueDay + interval : dueDay;
    for (let week = 0; week < periodicCostPolicy.restructuringWeeks; week += 1) {
      // This is a user-defined cashflow scenario, not a simulation of earning that income.
      projected = {
        ...projected,
        day: firstDueDay + week * interval,
        phase: 'TRADING',
        cash: money(projected.cash + assumptions.weeklyWorkIncome),
      };
      projected = gameReducer(projected, { type: 'ADVANCE_PHASE' });
      const receipt = projected.debtInstallmentPlan?.lastReceipt;
      const automatic = choice === 'SIGN_INSTALLMENTS';
      const due = automatic ? receipt?.day === projected.day ? receipt.due : 0 : Math.min(assumptions.weeklyRepayment, projected.debt);
      const repaid = automatic ? receipt?.day === projected.day ? receipt.paid : 0 : money(Math.min(due, projected.cash));
      if (!automatic) projected = gameReducer(projected, { type: 'REPAY_DEBT', amount: repaid });
      const ledger = projected.periodicCostLedger;
      preview.weeks.push({
        day: projected.day,
        cash: projected.cash,
        debt: projected.debt,
        interest: ledger.interest,
        operatingCosts: money(ledger.rent + ledger.membership + ledger.equipment + ledger.platformShare),
        deferred: ledger.deferred,
        repaid,
        repaymentShortfall: money(due - repaid),
        installmentStatus: projected.debtInstallmentPlan,
      });
    }
    preview.cashMinusDebtChange = money(projected.cash - projected.debt - (state.cash - state.debt));
    return preview;
  });
}
