import type { GameState, PeriodicCostLedger } from '../types';
import { settleDebtInstallments } from './debtInstallments';
import { fixedOperatingCostMultiplierForDay } from '../chapterRules';

export const periodicCostPolicy = {
  intervalDays: 7,
  weeklyInterestRate: 0.005,
  restructuredWeeklyInterestRate: 0.0025,
  restructuringWeeks: 8,
  restructuringFee: 200,
  rent: 240,
  membership: 30,
  equipment: 60,
  streamPlatformShareRate: 0.05,
} as const;

const money = (value: number): number => Number(value.toFixed(2));

export function isPeriodicSettlementDay(day: number): boolean {
  return day > 0 && day % periodicCostPolicy.intervalDays === 0;
}

export function settlePeriodicCosts(state: GameState): GameState {
  if (!isPeriodicSettlementDay(state.day) || state.lastPeriodicSettlementDay === state.day) return state;

  const interestGraceApplied = state.debt > 0 && state.debtInterestGraceWeeksRemaining > 0;
  const rateRestructureApplied = state.debt > 0 && !interestGraceApplied && state.debtRatePlanWeeksRemaining > 0;
  const weeklyInterestRate = rateRestructureApplied
    ? periodicCostPolicy.restructuredWeeklyInterestRate
    : periodicCostPolicy.weeklyInterestRate;
  const interest = interestGraceApplied ? 0 : money(state.debt * weeklyInterestRate);
  const fixedCostMultiplier = fixedOperatingCostMultiplierForDay(state.day);
  const rent = money(periodicCostPolicy.rent * fixedCostMultiplier);
  const membership = money(periodicCostPolicy.membership * fixedCostMultiplier);
  const equipment = money(periodicCostPolicy.equipment * fixedCostMultiplier);
  const platformShare = money(state.weeklyStreamIncome * periodicCostPolicy.streamPlatformShareRate);
  const fixedCosts = money(
    rent + membership + equipment + platformShare,
  );
  const fixedCostsPaid = Math.min(Math.max(0, state.cash), fixedCosts);
  const deferred = money(fixedCosts - fixedCostsPaid);
  const periodicCostLedger: PeriodicCostLedger = {
    interest,
    rent,
    membership,
    equipment,
    platformShare,
    deferred,
    interestGraceApplied,
    rateRestructureApplied,
  };

  return settleDebtInstallments({
    ...state,
    cash: money(Math.max(0, state.cash - fixedCostsPaid)),
    debt: money(state.debt + interest + deferred),
    weeklyStreamIncome: 0,
    debtInterestGraceWeeksRemaining: interestGraceApplied ? state.debtInterestGraceWeeksRemaining - 1 : state.debtInterestGraceWeeksRemaining,
    debtRatePlanWeeksRemaining: rateRestructureApplied
      ? state.debtRatePlanWeeksRemaining - 1
      : state.debt > 0 ? state.debtRatePlanWeeksRemaining : 0,
    periodicCostLedger,
    lastPeriodicSettlementDay: state.day,
  });
}
