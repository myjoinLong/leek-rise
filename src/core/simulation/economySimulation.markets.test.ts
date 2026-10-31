import { describe, expect, it } from 'vitest';
import { prototypeExperiment, simulateEconomy } from './economySimulation';
import type { EconomyScenario } from './economySimulation';
import { firstChapterStartingDebt } from '../timeRules';

const scenario: EconomyScenario = {
  strategy: 'WORK', days: 30, ticksPerDay: 0, gender: 'MALE',
  deliveryRoute: prototypeExperiment.deliveryRoute,
};

describe('prototype economy simulation', () => {
  it('can clear starting debt through a disclosed cash exit and long-term cafe work', () => {
    for (const seed of [4, 17, 42, 2026, 65535]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        const result = simulateEconomy({ ...scenario, strategy: 'CAFE_CASH', days: 365, ticksPerDay: 0,
          seed, gender, repayment: { cashReserve: 1000 } });
        expect(result.firstDebtFreeDay).not.toBeNull();
        expect(result.finalState.debt).toBe(0);
        expect(result.finalState.cash).toBeGreaterThan(1000);
        expect(result.daily.every((day) => day.portfolio === 0 && day.workIncome === 177 && day.cash >= 0)).toBe(true);
        expect(result.finalState.workedToday).toBe(true);
      }
    }
  });

  it('keeps cash positive and reduces debt after one wrong order and fortnightly absences with a live market', () => {
    for (const seed of [4, 17, 42, 2026, 65535]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        for (const strategy of ['CAFE', 'CAFE_CASH'] as const) {
          const stressScenario = { ...scenario, strategy, days: 365, ticksPerDay: 60,
            seed, gender, cafe: { mistakesPerShift: 1, skipEveryDays: 14 }, repayment: { cashReserve: 1000 } };
          const result = simulateEconomy(stressScenario);
          if (seed === 4 && gender === 'MALE') expect(simulateEconomy(stressScenario)).toEqual(result);
          expect(result.finalState.debt).toBeLessThan(firstChapterStartingDebt);
          expect(result.finalState.cash).toBeGreaterThan(0);
          expect(result.daily.every((day, index) => day.workIncome === ((index + 1) % 14 === 0 ? 0 : 142))).toBe(true);
          if (strategy === 'CAFE_CASH') {
            expect(result.daily.every((day) => day.portfolio === 0)).toBe(true);
            expect(result.daily[0]?.assetSaleProceeds).toBeGreaterThan(0);
          } else {
            expect(result.daily.every((day) => day.portfolio > 0 && day.assetSaleProceeds === 0)).toBe(true);
          }
        }
      }
    }
  }, 30_000);

  it('keeps loan principal separate from profit', () => {
    const work = simulateEconomy(scenario);
    const loan = simulateEconomy({ ...scenario, strategy: 'BORROW_WORK' });
    expect(loan.totals.borrowed).toBe(1000);
    expect(loan.finalState.cash - work.finalState.cash).toBe(1000);
    expect(loan.finalState.debt - work.finalState.debt).toBeGreaterThan(1000);
    expect(loan.totals.interest).toBeGreaterThan(work.totals.interest);
    expect(loan.totals.equityChange).toBeLessThan(work.totals.equityChange);
  });

  it('exits through real fills and exposes liquidation fees', () => {
    const result = simulateEconomy({ ...scenario, strategy: 'EXIT', ticksPerDay: 60 });
    expect(result.totals.fees).toBeGreaterThan(0);
    expect(result.daily.every((day) => day.portfolio === 0)).toBe(true);
    expect(result.daily.at(-1)!.cash).toBeCloseTo(
      result.daily[0]!.cash - result.daily.slice(1).reduce((sum, day) => sum + day.operatingCostsPaid, 0),
      2,
    );
  });

  it('measures route choice rather than assuming fixed wages', () => {
    const slower = simulateEconomy({ ...scenario, deliveryRoute: ['MAIN', 'ALLEY', 'STEADY'] });
    expect(slower.totals.workIncome).toBe(108 * 30);
    expect(slower.daily.every((day) => day.energy === 90)).toBe(true);
  });

  it('separates labor earnings from the initial inherited market exposure', () => {
    const result = simulateEconomy({ ...scenario, strategy: 'WORK_CASH', ticksPerDay: 60 });
    expect(result.totals.workIncome).toBe(5955);
    expect(result.totals.equityChange).toBeGreaterThan(3500);
    expect(result.daily.every((day) => day.portfolio === 0)).toBe(true);
    expect(result.finalState.debt).toBeCloseTo(18000 + result.totals.interest + result.totals.operatingCostsDeferred, 2);
  });

  it('compares live operating choices and preserves the female streamer bonus in the ledger', () => {
    const male = simulateEconomy({ ...scenario, strategy: 'STREAM', days: 1, ticksPerDay: 0 });
    const female = simulateEconomy({ ...scenario, strategy: 'STREAM', days: 1, ticksPerDay: 0, gender: 'FEMALE' });
    const combined = simulateEconomy({ ...scenario, strategy: 'WORK_STREAM', days: 1, ticksPerDay: 0 });
    const maleFactoryStream = simulateEconomy({ ...scenario, strategy: 'FACTORY_STREAM', days: 1, ticksPerDay: 0 });
    const factoryStream = simulateEconomy({ ...scenario, strategy: 'FACTORY_STREAM', days: 1, ticksPerDay: 0, gender: 'FEMALE' });

    expect(male.totals.activityIncome).toBeGreaterThan(0);
    expect(female.totals.activityIncome).toBeGreaterThan(male.totals.activityIncome * 1.2);
    expect(male.daily[0]?.activityIncome).toBe(male.totals.activityIncome);
    expect(combined.daily[0]?.workIncome).toBe(184);
    expect(combined.daily[0]?.activityIncome).toBeGreaterThan(0);
    expect(combined.finalState.energy).toBe(59);
    expect(combined.finalState.streamedToday).toBe(true);
    expect(factoryStream.daily[0]?.workIncome).toBe(120);
    expect(factoryStream.totals.activityIncome).toBeGreaterThan(maleFactoryStream.totals.activityIncome * 1.2);
    expect(factoryStream.finalState.energy).toBe(62);
  });

  it('records 90-day v3 livestream outcomes across transparent and hype routes', () => {
    const routes = [
      { name: 'transparent', choices: ['HONEST_REVIEW', 'ANSWER_QUESTIONS', 'TRANSPARENT_DEAL'] as const },
      { name: 'hype', choices: ['HYPE_CLAIM', 'REPEAT_CTA', 'FAKE_SCARCITY'] as const },
    ];
    const summary = (['STREAM', 'WORK_STREAM'] as const).flatMap((strategy) =>
      (['MALE', 'FEMALE'] as const).flatMap((gender) => routes.map((route) => {
        const outcomes = [4, 17, 42, 2026, 65535].map((seed) => simulateEconomy({ ...scenario, strategy, days: 90,
          ticksPerDay: 0, gender, seed, streamRoute: route.choices }));
        const longTailIncome = outcomes.map((result) => result.daily.slice(37).reduce((total, day) => total + day.activityIncome, 0));
        const equityChange = outcomes.map((result) => result.totals.equityChange);
        const endingCash = outcomes.map((result) => result.finalState.cash);
        const endingDebt = outcomes.map((result) => result.finalState.debt);
        const endingFame = outcomes.map((result) => result.finalState.fame);
        const stats = (values: number[]): { min: number; median: number; max: number } => {
          const sorted = [...values].sort((left, right) => left - right);
          return { min: sorted[0]!, median: sorted[Math.floor(sorted.length / 2)]!, max: sorted.at(-1)! };
        };
        return { strategy, gender, route: route.name, longTailIncome: stats(longTailIncome), equityChange: stats(equityChange),
          endingCash: stats(endingCash), endingDebt: stats(endingDebt), endingFame: stats(endingFame) };
      })),
    );
    expect(summary).toEqual([
      { strategy: 'STREAM', gender: 'MALE', route: 'transparent', longTailIncome: { min: 4905, median: 5695, max: 6795 }, equityChange: { min: 826.31, median: 1585.06, max: 2641.06 }, endingCash: { min: 5136.5, median: 5895.25, max: 6951.25 }, endingDebt: { min: 19110.19, median: 19110.19, max: 19110.19 }, endingFame: { min: 100, median: 100, max: 100 } },
      { strategy: 'STREAM', gender: 'MALE', route: 'hype', longTailIncome: { min: 9985, median: 10885, max: 12805 }, equityChange: { min: 8987.56, median: 9839.31, max: 11672.31 }, endingCash: { min: 13297.75, median: 14149.5, max: 15982.5 }, endingDebt: { min: 19110.19, median: 19110.19, max: 19110.19 }, endingFame: { min: 0, median: 0, max: 0 } },
      { strategy: 'STREAM', gender: 'FEMALE', route: 'transparent', longTailIncome: { min: 5886, median: 6834, max: 8154 }, equityChange: { min: 2596.31, median: 3489.71, max: 4762.61 }, endingCash: { min: 6906.5, median: 7799.9, max: 9072.8 }, endingDebt: { min: 19110.19, median: 19110.19, max: 19110.19 }, endingFame: { min: 100, median: 100, max: 100 } },
      { strategy: 'STREAM', gender: 'FEMALE', route: 'hype', longTailIncome: { min: 11982, median: 13062, max: 15366 }, equityChange: { min: 12338.51, median: 13372.01, max: 15554.51 }, endingCash: { min: 16648.7, median: 17682.2, max: 19864.7 }, endingDebt: { min: 19110.19, median: 19110.19, max: 19110.19 }, endingFame: { min: 0, median: 0, max: 0 } },
      { strategy: 'WORK_STREAM', gender: 'MALE', route: 'transparent', longTailIncome: { min: 4905, median: 5695, max: 6795 }, equityChange: { min: 19141.31, median: 20560.06, max: 21074.56 }, endingCash: { min: 23451.5, median: 24870.25, max: 25384.75 }, endingDebt: { min: 19110.19, median: 19110.19, max: 19110.19 }, endingFame: { min: 100, median: 100, max: 100 } },
      { strategy: 'WORK_STREAM', gender: 'MALE', route: 'hype', longTailIncome: { min: 9985, median: 10885, max: 12805 }, equityChange: { min: 27302.56, median: 28439.31, max: 29798.31 }, endingCash: { min: 31612.75, median: 32749.5, max: 34108.5 }, endingDebt: { min: 19110.19, median: 19110.19, max: 19110.19 }, endingFame: { min: 0, median: 0, max: 0 } },
      { strategy: 'WORK_STREAM', gender: 'FEMALE', route: 'transparent', longTailIncome: { min: 5886, median: 6834, max: 8154 }, equityChange: { min: 20911.31, median: 22464.71, max: 23190.11 }, endingCash: { min: 25221.5, median: 26774.9, max: 27500.3 }, endingDebt: { min: 19110.19, median: 19110.19, max: 19110.19 }, endingFame: { min: 100, median: 100, max: 100 } },
      { strategy: 'WORK_STREAM', gender: 'FEMALE', route: 'hype', longTailIncome: { min: 11982, median: 13062, max: 15366 }, equityChange: { min: 30653.51, median: 31891.31, max: 33630.11 }, endingCash: { min: 34963.7, median: 36201.5, max: 37940.3 }, endingDebt: { min: 19110.19, median: 19110.19, max: 19110.19 }, endingFame: { min: 0, median: 0, max: 0 } },
    ]);
  }, 30000);

  it('rejects invalid experiment settings and incomplete or illegal work routes', () => {
    for (const days of [0, 1.5, 366, Number.NaN]) expect(() => simulateEconomy({ ...scenario, days })).toThrow();
    for (const ticksPerDay of [-1, 0.5, 61]) expect(() => simulateEconomy({ ...scenario, ticksPerDay })).toThrow();
    expect(() => simulateEconomy({ ...scenario, deliveryRoute: ['RUSH'] })).toThrow();
    expect(() => simulateEconomy({ ...scenario, deliveryRoute: ['ALLEY'] })).toThrow();
    expect(() => simulateEconomy({ ...scenario, strategy: 'CAFE_CASH', cafe: { mistakesPerShift: 4 } })).toThrow();
    expect(() => simulateEconomy({ ...scenario, cafe: { mistakesPerShift: 1 } })).toThrow();
    expect(() => simulateEconomy({ ...scenario, strategy: 'CAFE_CASH', cafe: { mistakesPerShift: 1, skipEveryDays: 366 } })).toThrow();
    expect(() => simulateEconomy({ ...scenario, strategy: 'CAFE', bikeRepair: { mistakesPerShift: 1 } })).toThrow();
    expect(() => simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR', bikeRepair: { mistakesPerShift: 4 } })).toThrow();
    expect(() => simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR', bikeRepair: { mistakesPerShift: 1, skipEveryDays: 366 } })).toThrow();
  });
});
