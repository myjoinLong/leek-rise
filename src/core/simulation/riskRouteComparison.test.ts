import { describe, expect, it } from 'vitest';
import { prototypeExperiment, simulateEconomy } from './economySimulation';
import type { EconomyStrategy } from './strategies';

const strategies: readonly EconomyStrategy[] = [
  'WORK_CASH', 'CAFE_CASH', 'BIKE_REPAIR_CASH', 'PHONE_FLIP_CASH', 'LOW_FREQUENCY', 'HEAVY',
];
const seeds = [4, 17, 42, 2026, 65535] as const;
const horizons = [30, 90] as const;
const expectedMedianEquity: Readonly<Record<string, number>> = {
  'WORK_CASH:30': 4511.58, 'WORK_CASH:90': 11564.82,
  'CAFE_CASH:30': 3859.59, 'CAFE_CASH:90': 9144.15,
  'BIKE_REPAIR_CASH:30': 3950.58, 'BIKE_REPAIR_CASH:90': 9419.83,
  'PHONE_FLIP_CASH:30': 8560.67, 'PHONE_FLIP_CASH:90': 23200.67,
  'LOW_FREQUENCY:30': -1528.94, 'LOW_FREQUENCY:90': -7242.66,
  'HEAVY:30': -1408.87, 'HEAVY:90': -7118.96,
};

describe('matched cash-route and market-risk comparison', () => {
  it('replays each strategy on matching seeds, roles, horizons, and repayment reserve', () => {
    const results = horizons.flatMap((days) => strategies.flatMap((strategy) => seeds.flatMap((seed) =>
      prototypeExperiment.genders.map((gender) => simulateEconomy({
        strategy, days, ticksPerDay: 60, gender, seed,
        deliveryRoute: prototypeExperiment.deliveryRoute,
        repayment: { cashReserve: 1000 },
      })),
    )));
    expect(results).toHaveLength(120);

    for (const strategy of strategies) {
      for (const days of horizons) {
        const group = results.filter((result) => result.scenario.strategy === strategy && result.scenario.days === days);
        expect(group).toHaveLength(10);
        expect(group.every((result) => result.daily.every((day) => day.cash >= 0))).toBe(true);
        const medianEquity = group.map((result) => result.totals.equityChange).sort((a, b) => a - b)[5];
        expect(medianEquity).toBeCloseTo(expectedMedianEquity[`${strategy}:${days}`]!, 2);
        if (strategy.endsWith('_CASH')) {
          expect(group.every((result) => result.totals.equityChange > 0)).toBe(true);
        } else {
          expect(group.every((result) => result.totals.equityChange < 0)).toBe(true);
          expect(group.every((result) => result.totals.maxDrawdown > 1500)).toBe(true);
        }
      }
    }

    for (const days of horizons) {
      const phoneFlip = results.filter((result) => result.scenario.strategy === 'PHONE_FLIP_CASH' && result.scenario.days === days);
      expect(phoneFlip.every((result) => (result.daily[29]?.debt ?? Infinity) <= 3000)).toBe(true);
      for (const strategy of ['WORK_CASH', 'CAFE_CASH', 'BIKE_REPAIR_CASH'] as const) {
        const group = results.filter((result) => result.scenario.strategy === strategy && result.scenario.days === days);
        expect(group.every((result) => (result.daily[29]?.debt ?? Infinity) > 3000)).toBe(true);
      }
    }

    const first = results[0];
    expect(first).toBeDefined();
    expect(simulateEconomy(first!.scenario)).toEqual(first);
  }, 60000);
});
