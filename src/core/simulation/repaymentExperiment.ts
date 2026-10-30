import { prototypeExperiment, simulateEconomy } from './economySimulation';
import type { EconomySimulation } from './economySimulation';

export const repaymentExperiment = {
  seeds: [4, 17, 42, 2026, 65535],
  strategies: ['WORK', 'FACTORY', 'CAFE', 'STREAM', 'WORK_STREAM', 'FACTORY_STREAM', 'CAFE_STREAM', 'CAFE_CASH', 'WORK_CASH', 'HEAVY', 'BORROW_WORK'],
  cashReserves: [null, 0, 1000, 3200],
  ticksPerDay: 60,
} as const;

export const negotiationExperiment = {
  strategies: repaymentExperiment.strategies,
  horizons: prototypeExperiment.horizons,
  genders: prototypeExperiment.genders,
  seeds: repaymentExperiment.seeds,
  offers: ['INTEREST_GRACE', 'RATE_RESTRUCTURE', 'INSTALLMENTS'],
  cashReserve: 1000,
  ticksPerDay: repaymentExperiment.ticksPerDay,
} as const;

export function runRepaymentEconomyMatrix(): EconomySimulation[] {
  return repaymentExperiment.seeds.flatMap((seed) => prototypeExperiment.horizons.flatMap((days) =>
    prototypeExperiment.genders.flatMap((gender) => repaymentExperiment.strategies.flatMap((strategy) =>
      repaymentExperiment.cashReserves.map((cashReserve) => simulateEconomy({
        strategy, days, gender, seed, ticksPerDay: repaymentExperiment.ticksPerDay,
        deliveryRoute: prototypeExperiment.deliveryRoute,
        ...(cashReserve === null ? {} : { repayment: { cashReserve } }),
      })),
    )),
  ));
}

export function runNegotiationEconomyMatrix(): EconomySimulation[] {
  return negotiationExperiment.seeds.flatMap((seed) => negotiationExperiment.horizons.flatMap((days) =>
    negotiationExperiment.genders.flatMap((gender) => negotiationExperiment.strategies.flatMap((strategy) =>
      [null, ...negotiationExperiment.offers].map((negotiationOffer) => simulateEconomy({
        strategy, days, gender, seed, ticksPerDay: negotiationExperiment.ticksPerDay,
        deliveryRoute: prototypeExperiment.deliveryRoute,
        repayment: { cashReserve: negotiationExperiment.cashReserve },
        ...(negotiationOffer ? { negotiationOffer } : {}),
      })),
    )),
  ));
}
