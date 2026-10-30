import { describe, expect, it } from 'vitest';
import { prototypeExperiment, runPrototypeEconomyMatrix, simulateEconomy } from './economySimulation';
import type { EconomyScenario } from './economySimulation';

const scenario: EconomyScenario = {
  strategy: 'WORK', days: 30, ticksPerDay: 0, gender: 'MALE',
  deliveryRoute: prototypeExperiment.deliveryRoute,
};

describe('prototype economy simulation', () => {
  it('repeats the complete reducer-driven matrix deterministically', () => {
    const results = runPrototypeEconomyMatrix();
    expect(results).toHaveLength(324);
    expect(runPrototypeEconomyMatrix()).toEqual(results);
    for (const result of results) {
      expect(result.daily).toHaveLength(result.scenario.days);
      expect(result.finalState.day).toBe(result.scenario.days);
      expect(result.finalState.phase).toBe('NIGHT');
      expect(result.finalState.activeActivity).toBeNull();
      expect(result.finalState.cash).toBeGreaterThanOrEqual(0);
      const last = result.daily.at(-1)!;
      expect(last.equity).toBeCloseTo(last.cash + last.portfolio - last.debt, 2);
      expect(result.totals.equityChange).toBeCloseTo(last.equity - result.initialEquity, 2);
      expect(result.daily.reduce((sum, day) => sum + day.equityChange, 0)).toBeCloseTo(result.totals.equityChange, 2);
    }
  }, 45000);

  it('earns route income once per day and restores energy only between days', () => {
    const result = simulateEconomy(scenario);
    expect(result.totals.workIncome).toBe(184 * 30);
    expect(result.totals.equityChange).toBeCloseTo(
      result.totals.workIncome - result.totals.interest - result.totals.operatingCostsPaid - result.totals.operatingCostsDeferred,
      2,
    );
    expect(result.daily.filter((day) => day.operatingCostsPaid > 0)).toHaveLength(4);
    expect(result.totals.equityChange).toBeGreaterThan(0);
    expect(result.daily.every((day) => day.energy === 74 && day.workIncome === 184)).toBe(true);
    expect(simulateEconomy({ ...scenario, gender: 'FEMALE' }).daily.every((day) => day.energy === 54)).toBe(true);
  });

  it('models factory quality bonuses as a separate stable work route', () => {
    const result = simulateEconomy({ ...scenario, strategy: 'FACTORY', days: 30 });
    expect(result.totals.workIncome).toBe(120 * 30);
    expect(result.daily.every((day) => day.workIncome === 120 && day.energy >= 97 && day.energy <= 101)).toBe(true);
    expect(result.daily.filter((day) => day.operatingCostsPaid > 0)).toHaveLength(4);
    expect(result.daily.every((day) => day.cash >= 0)).toBe(true);
    expect(result.totals.equityChange).toBeGreaterThan(0);
  });

  it('models cafe tips as earned work income and allows combining the shift with streaming', () => {
    const cafe = simulateEconomy({ ...scenario, strategy: 'CAFE', days: 30 });
    const combined = simulateEconomy({ ...scenario, strategy: 'CAFE_STREAM', days: 30, gender: 'FEMALE' });
    expect(cafe.totals.workIncome).toBe(120 * 30);
    expect(cafe.daily.every((day) => day.energy === 105 && day.workIncome === 120)).toBe(true);
    expect(combined.daily.every((day) => day.workIncome === 120 && day.activityIncome > 0)).toBe(true);
    expect(combined.finalState.energy).toBe(70);
    expect(combined.finalState.workedToday).toBe(true);
    expect(combined.finalState.streamedToday).toBe(true);
  });

  it('models bike repair as a distinct stable work route with optional streaming synergy', () => {
    const repair = simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR', days: 30 });
    const combined = simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_STREAM', days: 1, gender: 'FEMALE' });
    expect(repair.totals.workIncome).toBe(90 * 30);
    expect(repair.daily.every((day) => day.workIncome === 90 && day.energy === 105)).toBe(true);
    expect(combined.daily[0]?.workIncome).toBe(90);
    expect(combined.daily[0]?.activityIncome).toBeGreaterThan(0);
    expect(combined.finalState.energy).toBe(70);
    expect(combined.finalState.workedToday).toBe(true);
    expect(combined.finalState.streamedToday).toBe(true);
  });

  it('keeps bike repair recoverable under one wrong repair and a fortnightly missed shift', () => {
    for (const seed of [4, 17, 42, 2026, 65535]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        const result = simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_CASH', days: 365, ticksPerDay: 60,
          seed, gender, bikeRepair: { mistakesPerShift: 1, skipEveryDays: 14 }, repayment: { cashReserve: 1000 } });
        if (seed === 4 && gender === 'MALE') {
          expect(simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_CASH', days: 365, ticksPerDay: 60,
            seed, gender, bikeRepair: { mistakesPerShift: 1, skipEveryDays: 14 }, repayment: { cashReserve: 1000 } })).toEqual(result);
        }
        expect(result.daily.every((day, index) => day.workIncome === ((index + 1) % 14 === 0 ? 0 : 78))).toBe(true);
        expect(result.daily.every((day) => day.cash >= 0)).toBe(true);
        const energyMax = gender === 'MALE' ? 120 : 100;
        expect(result.daily.every((day, index) => day.energy === ((index + 1) % 14 === 0 ? energyMax : energyMax - 15))).toBe(true);
        expect(result.daily.every((day) => day.portfolio === 0)).toBe(true);
        expect(result.daily[0]?.assetSaleProceeds).toBeGreaterThan(0);
        expect(result.firstDebtFreeDay).not.toBeNull();
        expect(result.finalState.debt).toBe(0);
        expect(result.totals.equityChange).toBeGreaterThan(0);
      }
    }
  }, 30000);

  it('compares the no-market bike repair path across seeds and roles', () => {
    for (const seed of [4, 17, 42, 2026, 65535]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        const result = simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_CASH', days: 365, ticksPerDay: 0,
          seed, gender, repayment: { cashReserve: 1000 } });
        if (seed === 4 && gender === 'MALE') {
          expect(simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_CASH', days: 365, ticksPerDay: 0,
            seed, gender, repayment: { cashReserve: 1000 } })).toEqual(result);
        }
        expect(result.totals.workIncome).toBe(90 * 365);
        expect(result.daily.every((day) => day.workIncome === 90 && day.portfolio === 0 && day.cash >= 0)).toBe(true);
        expect(result.firstDebtFreeDay).not.toBeNull();
        expect(result.finalState.debt).toBe(0);
        expect(result.totals.equityChange).toBeGreaterThan(0);
      }
    }
  }, 15000);

  it('can clear starting debt through a disclosed cash exit and long-term cafe work', () => {
    for (const seed of [4, 17, 42, 2026, 65535]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        const result = simulateEconomy({ ...scenario, strategy: 'CAFE_CASH', days: 365, ticksPerDay: 0,
          seed, gender, repayment: { cashReserve: 1000 } });
        expect(result.firstDebtFreeDay).not.toBeNull();
        expect(result.finalState.debt).toBe(0);
        expect(result.finalState.cash).toBeGreaterThan(1000);
        expect(result.daily.every((day) => day.portfolio === 0 && day.workIncome === 120 && day.cash >= 0)).toBe(true);
        expect(result.finalState.workedToday).toBe(true);
      }
    }
  });

  it('survives one wrong order and a fortnightly missed shift with a live 60-tick market', () => {
    for (const seed of [4, 17, 42, 2026, 65535]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        for (const strategy of ['CAFE', 'CAFE_CASH'] as const) {
          const stressScenario = { ...scenario, strategy, days: 365, ticksPerDay: 60,
            seed, gender, cafe: { mistakesPerShift: 1, skipEveryDays: 14 }, repayment: { cashReserve: 1000 } };
          const result = simulateEconomy(stressScenario);
          if (seed === 4 && gender === 'MALE') expect(simulateEconomy(stressScenario)).toEqual(result);
          expect(result.firstDebtFreeDay).not.toBeNull();
          expect(result.finalState.debt).toBe(0);
          expect(result.finalState.cash).toBeGreaterThan(1000);
          expect(result.daily.every((day, index) => day.workIncome === ((index + 1) % 14 === 0 ? 0 : 104))).toBe(true);
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
    expect(result.totals.workIncome).toBe(5520);
    expect(result.totals.equityChange).toBeGreaterThan(3500);
    expect(result.daily.every((day) => day.portfolio === 0)).toBe(true);
    expect(result.finalState.debt).toBeCloseTo(18000 + result.totals.interest + result.totals.operatingCostsDeferred, 2);
  });

  it('compares live operating choices and preserves the female streamer bonus in the ledger', () => {
    const male = simulateEconomy({ ...scenario, strategy: 'STREAM', days: 1, ticksPerDay: 0 });
    const female = simulateEconomy({ ...scenario, strategy: 'STREAM', days: 1, ticksPerDay: 0, gender: 'FEMALE' });
    const combined = simulateEconomy({ ...scenario, strategy: 'WORK_STREAM', days: 1, ticksPerDay: 0 });
    const factoryStream = simulateEconomy({ ...scenario, strategy: 'FACTORY_STREAM', days: 1, ticksPerDay: 0, gender: 'FEMALE' });

    expect(male.totals.activityIncome).toBeGreaterThan(0);
    expect(female.totals.activityIncome).toBe(114);
    expect(female.totals.activityIncome).toBeGreaterThan(male.totals.activityIncome * 1.2);
    expect(male.daily[0]?.activityIncome).toBe(male.totals.activityIncome);
    expect(combined.daily[0]?.workIncome).toBe(184);
    expect(combined.daily[0]?.activityIncome).toBeGreaterThan(0);
    expect(combined.finalState.energy).toBe(59);
    expect(combined.finalState.streamedToday).toBe(true);
    expect(factoryStream.daily[0]?.workIncome).toBe(120);
    expect(factoryStream.daily[0]?.activityIncome).toBe(114);
    expect(factoryStream.finalState.energy).toBe(66);
  });

  it('rejects invalid experiment settings and incomplete or illegal work routes', () => {
    for (const days of [0, 1.5, 366, Number.NaN]) expect(() => simulateEconomy({ ...scenario, days })).toThrow();
    for (const ticksPerDay of [-1, 0.5, 601]) expect(() => simulateEconomy({ ...scenario, ticksPerDay })).toThrow();
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
