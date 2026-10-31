import type { DeliveryChoice, GameState, PlayerGender, StreamChoice } from '../types';
import type { EconomyStrategy } from './strategies';

export interface EconomyScenario {
  strategy: EconomyStrategy;
  days: number;
  ticksPerDay: number;
  gender: PlayerGender;
  deliveryRoute: readonly DeliveryChoice[];
  streamRoute?: readonly StreamChoice[];
  cafe?: { mistakesPerShift: number; skipEveryDays?: number };
  bikeRepair?: { mistakesPerShift: number; skipEveryDays?: number };
  phoneFlip?: { mistakeEveryDays?: number; skipEveryDays?: number };
  seed?: number;
  repayment?: { cashReserve: number; throughDay?: number };
  resumeInstallmentsOnDays?: readonly number[];
  negotiationOffer?: 'INTEREST_GRACE' | 'RATE_RESTRUCTURE' | 'INSTALLMENTS';
}

export interface EconomyDay {
  day: number;
  debtCrisisStarted: boolean;
  cash: number;
  debt: number;
  portfolio: number;
  equity: number;
  equityChange: number;
  workIncome: number;
  activityIncome: number;
  assetSaleProceeds: number;
  fees: number;
  contractFees: number;
  interest: number;
  rateRestructureApplied: boolean;
  installmentDue: number;
  installmentPaid: number;
  installmentShortfall: number;
  operatingCostsPaid: number;
  operatingCostsDeferred: number;
  negotiationOutcome: 'INTEREST_GRACE' | 'RATE_RESTRUCTURE' | 'INSTALLMENTS' | 'STANDARD_TERMS' | null;
  interestGraceApplied: boolean;
  borrowed: number;
  repaid: number;
  energy: number;
  price: number;
}

export interface EconomySimulation {
  scenario: EconomyScenario;
  initialEquity: number;
  daily: EconomyDay[];
  totals: {
    workIncome: number;
    activityIncome: number;
    fees: number;
    contractFees: number;
    interest: number;
    operatingCostsPaid: number;
    operatingCostsDeferred: number;
    borrowed: number;
    repaid: number;
    negotiations: number;
    interestGraceEarned: number;
    interestGraceWeeksGranted: number;
    interestGraceApplied: number;
    rateRestructureApplied: number;
    installmentPaid: number;
    installmentShortfalls: number;
    installmentPeriodsCompleted: number;
    equityChange: number;
    maxDrawdown: number;
  };
  firstDebtFreeDay: number | null;
  finalState: GameState;
}
