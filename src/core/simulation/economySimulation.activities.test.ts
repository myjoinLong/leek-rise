import { describe, expect, it } from 'vitest';
import { prototypeExperiment, runPrototypeEconomyMatrix, simulateEconomy } from './economySimulation';
import type { EconomyScenario } from './economySimulation';
import { bikeRepairCaseFor, zhengRepairTestEnergy } from '../systems/zhengBikeRepair';

const scenario: EconomyScenario = {
  strategy: 'WORK', days: 30, ticksPerDay: 0, gender: 'MALE',
  deliveryRoute: prototypeExperiment.deliveryRoute,
};

describe('prototype economy simulation', () => {
  it('repeats the complete reducer-driven matrix deterministically', () => {
    const results = runPrototypeEconomyMatrix();
    expect(results).toHaveLength(360);
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
    expect(result.totals.workIncome).toBe(184 + 199 * 29);
    expect(result.totals.equityChange).toBeCloseTo(
      result.totals.workIncome - result.totals.interest - result.totals.operatingCostsPaid - result.totals.operatingCostsDeferred,
      2,
    );
    expect(result.daily.filter((day) => day.operatingCostsPaid > 0)).toHaveLength(4);
    expect(result.totals.equityChange).toBeGreaterThan(0);
    expect(result.daily[0]).toMatchObject({ energy: 74, workIncome: 184 });
    expect(result.daily.slice(1).every((day) => day.energy === 71 && day.workIncome === 199)).toBe(true);
    const femaleDays = simulateEconomy({ ...scenario, gender: 'FEMALE' }).daily;
    expect(femaleDays[0]?.energy).toBe(54);
    expect(femaleDays.slice(1).every((day) => day.energy === 51)).toBe(true);
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
    expect(cafe.totals.workIncome).toBe(177 * 30);
    expect(cafe.daily.every((day) => day.energy === 105 && day.workIncome === 177)).toBe(true);
    expect(combined.daily.every((day) => day.workIncome === 177 && day.activityIncome > 0)).toBe(true);
    expect(combined.finalState.energy).toBe(70);
    expect(combined.finalState.workedToday).toBe(true);
    expect(combined.finalState.streamedToday).toBe(true);
  });

  it('models bike repair as a distinct stable work route with optional streaming synergy', () => {
    const repair = simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR', days: 30 });
    const combined = simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_STREAM', days: 1, gender: 'FEMALE' });
    expect(repair.totals.workIncome).toBe(180 * 30);
    expect(repair.daily.every((day) => day.workIncome === 180 && day.energy === 105)).toBe(true);
    expect(combined.daily[0]?.workIncome).toBe(180);
    expect(combined.daily[0]?.activityIncome).toBeGreaterThan(0);
    expect(combined.finalState.energy).toBe(70);
    expect(combined.finalState.workedToday).toBe(true);
    expect(combined.finalState.streamedToday).toBe(true);
  });

  it('models phone appraisal as an inspect-and-resell route with visible daily profit', () => {
    const male = simulateEconomy({ ...scenario, strategy: 'PHONE_FLIP', days: 30 });
    const female = simulateEconomy({ ...scenario, strategy: 'PHONE_FLIP', days: 1, gender: 'FEMALE' });
    expect(male.totals.workIncome).toBe(332 * 30);
    expect(male.daily.every((day) => day.workIncome === 332 && day.energy === 111)).toBe(true);
    expect(female.daily[0]).toMatchObject({ workIncome: 332, energy: 91 });
    expect(male.totals.equityChange).toBeGreaterThan(0);
  });

  it('can clear starting debt through disclosed phone resale without market exposure', () => {
    for (const seed of [4, 17, 42]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        const result = simulateEconomy({ ...scenario, strategy: 'PHONE_FLIP_CASH', days: 365, ticksPerDay: 0,
          seed, gender, repayment: { cashReserve: 1000 } });
        expect(result.daily.every((day) => day.workIncome === 332 && day.portfolio === 0 && day.cash >= 0)).toBe(true);
        expect(result.firstDebtFreeDay).not.toBeNull();
        expect(result.finalState.debt).toBe(0);
        expect(result.finalState.cash).toBeGreaterThan(1000);
        if (seed === 4 && gender === 'MALE') {
          expect(simulateEconomy({ ...scenario, strategy: 'PHONE_FLIP_CASH', days: 365, ticksPerDay: 0,
            seed, gender, repayment: { cashReserve: 1000 } })).toEqual(result);
        }
      }
    }
  }, 15000);

  it('keeps the phone resale route recoverable with a bad buy every ten days and a missed shift every fourteen days', () => {
    for (const seed of [4, 17, 42]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        const stressScenario = { ...scenario, strategy: 'PHONE_FLIP_CASH' as const, days: 365, ticksPerDay: 60,
          seed, gender, phoneFlip: { mistakeEveryDays: 10, skipEveryDays: 14 }, repayment: { cashReserve: 1000 } };
        const result = simulateEconomy(stressScenario);
        if (seed === 4 && gender === 'MALE') expect(simulateEconomy(stressScenario)).toEqual(result);
        expect(result.daily.every((day, index) => {
          const dayNumber = index + 1;
          const expectedIncome = dayNumber % 14 === 0 ? 0 : dayNumber % 10 === 0 ? 134 : 332;
          const energyMax = gender === 'MALE' ? 120 : 100;
          const expectedEnergy = energyMax - (dayNumber % 14 === 0 ? 0 : dayNumber % 10 === 0 ? 6 : 9);
          return day.workIncome === expectedIncome && day.energy === expectedEnergy && day.portfolio === 0 && day.cash >= 0;
        })).toBe(true);
        expect(result.firstDebtFreeDay).not.toBeNull();
        expect(result.finalState.debt).toBe(0);
        expect(result.finalState.cash).toBeGreaterThan(1000);
      }
    }
  }, 15000);

  it('keeps bike repair recoverable under one wrong repair and a fortnightly missed shift', () => {
    for (const seed of [4, 17, 42, 2026, 65535]) {
      for (const gender of ['MALE', 'FEMALE'] as const) {
        const result = simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_CASH', days: 365, ticksPerDay: 60,
          seed, gender, bikeRepair: { mistakesPerShift: 1, skipEveryDays: 14 }, repayment: { cashReserve: 1000 } });
        if (seed === 4 && gender === 'MALE') {
          expect(simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_CASH', days: 365, ticksPerDay: 60,
            seed, gender, bikeRepair: { mistakesPerShift: 1, skipEveryDays: 14 }, repayment: { cashReserve: 1000 } })).toEqual(result);
        }
        expect(result.daily.every((day, index) => day.workIncome === ((index + 1) % 14 === 0 ? 0 : 168))).toBe(true);
        expect(result.daily.every((day) => day.cash >= 0)).toBe(true);
        const energyMax = gender === 'MALE' ? 120 : 100;
        expect(result.daily.every((day, index) => {
          const dayNumber = index + 1;
          const missedShift = dayNumber % 14 === 0;
          const diagnosticEnergy = dayNumber <= 30 || missedShift ? 0 : [1, 2].reduce((energy, step) => {
            const repairCase = bikeRepairCaseFor(dayNumber, step as 0 | 1 | 2, 5, seed);
            return energy + (repairCase.warrantyProofRequired ? zhengRepairTestEnergy : 0);
          }, 0);
          return day.energy === energyMax - (missedShift ? 0 : 15 + diagnosticEnergy);
        })).toBe(true);
        expect(result.daily.every((day) => day.portfolio === 0)).toBe(true);
        expect(result.daily[0]?.assetSaleProceeds).toBeGreaterThan(0);
        expect(result.firstDebtFreeDay).not.toBeNull();
        expect(result.finalState.debt).toBe(0);
        expect(result.totals.equityChange).toBeGreaterThan(0);
      }
    }
  }, 30000);

  it('allows bike repair to recover from three wrong repairs per shift and weekly absence', () => {
    const results = [4, 17, 42, 2026, 65535].flatMap((seed) => (['MALE', 'FEMALE'] as const).map((gender) => {
      const stressScenario = { ...scenario, strategy: 'BIKE_REPAIR_CASH' as const, days: 365, ticksPerDay: 60,
        seed, gender, bikeRepair: { mistakesPerShift: 3, skipEveryDays: 7 }, repayment: { cashReserve: 1000 } };
      const result = simulateEconomy(stressScenario);
      expect(simulateEconomy(stressScenario)).toEqual(result);
      expect(result.daily).toHaveLength(365);
      expect(result.daily.every((day, index) => day.workIncome === ((index + 1) % 7 === 0 ? 0 : 144))).toBe(true);
      expect(result.daily.every((day) => day.cash > 0 && day.portfolio === 0)).toBe(true);
      expect(result.totals.workIncome).toBe(45072);
      expect(result.firstDebtFreeDay).not.toBeNull();
      expect(result.finalState.debt).toBe(0);
      expect(result.finalState.cash).toBeGreaterThan(1000);
      return result;
    }));
    for (let index = 0; index < results.length; index += 2) {
      expect(results[index]?.finalState.debt).toBe(results[index + 1]?.finalState.debt);
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
        expect(result.totals.workIncome).toBe(180 * 365);
        expect(result.daily.every((day) => day.workIncome === 180 && day.portfolio === 0 && day.cash >= 0)).toBe(true);
        expect(result.firstDebtFreeDay).not.toBeNull();
        expect(result.finalState.debt).toBe(0);
        expect(result.totals.equityChange).toBeGreaterThan(0);
      }
    }
  }, 15000);

});
