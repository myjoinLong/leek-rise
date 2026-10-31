import { describe, expect, it } from 'vitest';
import { prototypeExperiment, simulateEconomy } from './economySimulation';
import type { EconomyScenario } from './economySimulation';
import { firstChapterMaximumDebt } from '../timeRules';

const scenario: EconomyScenario = {
  strategy: 'WORK', days: 30, ticksPerDay: 0, gender: 'MALE',
  deliveryRoute: prototypeExperiment.deliveryRoute,
};

describe('prototype economy simulation', () => {
  it('measures the confirmed day-30 debt target across cash recovery routes', () => {
    const summaries = (['WORK_CASH', 'CAFE_CASH', 'BIKE_REPAIR_CASH', 'PHONE_FLIP_CASH'] as const).map((strategy) => {
      const outcomes = [4, 17, 42, 2026, 65535].flatMap((seed) => (['MALE', 'FEMALE'] as const).map((gender) => {
        const result = simulateEconomy({ ...scenario, strategy, days: 30, ticksPerDay: 60, seed, gender,
          repayment: { cashReserve: 1000 } });
        return { debt: result.daily.at(-1)?.debt ?? 0, firstDebtFreeDay: result.firstDebtFreeDay };
      }));
      return { strategy, sampleCount: outcomes.length, withinFirstChapterTarget: outcomes.filter((row) => row.debt <= firstChapterMaximumDebt).length,
        debtFree: outcomes.filter((row) => row.debt === 0).length,
        minDebt: Math.min(...outcomes.map((row) => row.debt)), maxDebt: Math.max(...outcomes.map((row) => row.debt)) };
    });
    expect(summaries).toEqual([
      { strategy: 'WORK_CASH', sampleCount: 10, withinFirstChapterTarget: 0, debtFree: 0, minDebt: 3270.52, maxDebt: 3364.22 },
      { strategy: 'CAFE_CASH', sampleCount: 10, withinFirstChapterTarget: 0, debtFree: 0, minDebt: 3922.5, maxDebt: 4016.23 },
      { strategy: 'BIKE_REPAIR_CASH', sampleCount: 10, withinFirstChapterTarget: 0, debtFree: 0, minDebt: 3831.51, maxDebt: 3925.22 },
      { strategy: 'PHONE_FLIP_CASH', sampleCount: 10, withinFirstChapterTarget: 10, debtFree: 10, minDebt: 0, maxDebt: 0 },
    ]);
  }, 15000);

  it('compares maximum-repayment policies while preserving phone-flip working capital', () => {
    const outcomes = (['WORK_CASH', 'CAFE_CASH', 'BIKE_REPAIR_CASH', 'PHONE_FLIP_CASH'] as const).map((strategy) => {
      const cashReserve = strategy === 'PHONE_FLIP_CASH' ? 558 : 0;
      const debts = [4, 17, 42, 2026, 65535].flatMap((seed) => (['MALE', 'FEMALE'] as const).map((gender) => {
        const result = simulateEconomy({ ...scenario, strategy, days: 30, ticksPerDay: 60, seed, gender,
          repayment: { cashReserve } });
        return result.daily.at(-1)?.debt ?? 0;
      }));
      return { strategy, cashReserve, passCount: debts.filter((debt) => debt <= firstChapterMaximumDebt).length,
        minDebt: Math.min(...debts), maxDebt: Math.max(...debts) };
    });
    expect(outcomes).toEqual([
      { strategy: 'WORK_CASH', cashReserve: 0, passCount: 10, minDebt: 2250.36, maxDebt: 2344.06 },
      { strategy: 'CAFE_CASH', cashReserve: 0, passCount: 10, minDebt: 2902.36, maxDebt: 2996.08 },
      { strategy: 'BIKE_REPAIR_CASH', cashReserve: 0, passCount: 10, minDebt: 2811.35, maxDebt: 2905.07 },
      { strategy: 'PHONE_FLIP_CASH', cashReserve: 558, passCount: 10, minDebt: 0, maxDebt: 0 },
    ]);
  }, 15000);

  it('surveys the first-chapter margin with one wrong decision per shift and fortnightly absence', () => {
    const seeds = [4, 17, 42, 2026, 65535];
    const genders = ['MALE', 'FEMALE'] as const;
    const summaries = [
      {
        strategy: 'CAFE_CASH' as const,
        run: (seed: number, gender: typeof genders[number]) => simulateEconomy({ ...scenario, strategy: 'CAFE_CASH', days: 30,
          ticksPerDay: 60, seed, gender, cafe: { mistakesPerShift: 1, skipEveryDays: 14 }, repayment: { cashReserve: 0 } }),
      },
      {
        strategy: 'BIKE_REPAIR_CASH' as const,
        run: (seed: number, gender: typeof genders[number]) => simulateEconomy({ ...scenario, strategy: 'BIKE_REPAIR_CASH', days: 30,
          ticksPerDay: 60, seed, gender, bikeRepair: { mistakesPerShift: 1, skipEveryDays: 14 }, repayment: { cashReserve: 0 } }),
      },
      {
        strategy: 'PHONE_FLIP_CASH' as const,
        run: (seed: number, gender: typeof genders[number]) => simulateEconomy({ ...scenario, strategy: 'PHONE_FLIP_CASH', days: 30,
          ticksPerDay: 60, seed, gender, phoneFlip: { mistakeEveryDays: 10, skipEveryDays: 14 }, repayment: { cashReserve: 1000 } }),
      },
    ].map(({ strategy, run }) => {
      const reserve = strategy === 'PHONE_FLIP_CASH' ? 1000 : 0;
      const baselineDebts: number[] = [];
      const stressedDebts: number[] = [];
      let cashNonNegative = true;
      for (const seed of seeds) {
        for (const gender of genders) {
          const baseline = simulateEconomy({ ...scenario, strategy, days: 30, ticksPerDay: 60, seed, gender,
            repayment: { cashReserve: reserve } });
          const stressed = run(seed, gender);
          baselineDebts.push(baseline.daily.at(-1)?.debt ?? 0);
          stressedDebts.push(stressed.daily.at(-1)?.debt ?? 0);
          cashNonNegative &&= stressed.daily.every((day) => day.cash >= 0);
          if (seed === 4 && gender === 'MALE') expect(run(seed, gender)).toEqual(stressed);
        }
      }
      return {
        strategy,
        sampleCount: stressedDebts.length,
        baselineTargetPasses: baselineDebts.filter((debt) => debt <= firstChapterMaximumDebt).length,
        stressTargetPasses: stressedDebts.filter((debt) => debt <= firstChapterMaximumDebt).length,
        baselineDebtRange: [Math.min(...baselineDebts), Math.max(...baselineDebts)],
        stressDebtRange: [Math.min(...stressedDebts), Math.max(...stressedDebts)],
        cashNonNegative,
      };
    });

    expect(summaries).toEqual([
      { strategy: 'CAFE_CASH', sampleCount: 10, baselineTargetPasses: 10, stressTargetPasses: 0,
        baselineDebtRange: [2902.36, 2996.08], stressDebtRange: [4249.38, 4343.1], cashNonNegative: true },
      { strategy: 'BIKE_REPAIR_CASH', sampleCount: 10, baselineTargetPasses: 10, stressTargetPasses: 0,
        baselineDebtRange: [2811.35, 2905.07], stressDebtRange: [3513.02, 3606.73], cashNonNegative: true },
      { strategy: 'PHONE_FLIP_CASH', sampleCount: 10, baselineTargetPasses: 10, stressTargetPasses: 10,
        baselineDebtRange: [0, 0], stressDebtRange: [487.41, 581.12], cashNonNegative: true },
    ]);
  }, 30000);

  it('checks whether first-chapter misses can recover from debt crisis by day 90', () => {
    const results = [0, 558, 1000].flatMap((cashReserve) => (['CAFE_CASH', 'BIKE_REPAIR_CASH'] as const).map((strategy) => {
      const outcomes = [4, 17, 42, 2026, 65535].flatMap((seed) => (['MALE', 'FEMALE'] as const).map((gender) => {
        const common = { ...scenario, strategy, days: 90, ticksPerDay: 60, seed, gender, repayment: { cashReserve } };
        const result = strategy === 'CAFE_CASH'
          ? simulateEconomy({ ...common, cafe: { mistakesPerShift: 1, skipEveryDays: 14 } })
          : simulateEconomy({ ...common, bikeRepair: { mistakesPerShift: 1, skipEveryDays: 14 } });
        const firstCrisisIndex = result.daily.findIndex((day) => day.debtCrisisStarted);
        const recoveryDay = result.daily.find((day, index) => index > firstCrisisIndex
          && !day.debtCrisisStarted && day.debt <= firstChapterMaximumDebt)?.day ?? null;
        return { result, firstCrisisDay: firstCrisisIndex < 0 ? null : result.daily[firstCrisisIndex]?.day ?? null, recoveryDay };
      }));
      const finalDebts = outcomes.map(({ result }) => result.finalState.debt);
      const debtFreeByDay90Count = outcomes.filter(({ result }) => result.finalState.debt === 0).length;
      const finalCash = outcomes.map(({ result }) => result.finalState.cash);
      const crisisStartDays = outcomes.map(({ firstCrisisDay }) => firstCrisisDay).filter((day): day is number => day !== null);
      const recoveryDays = outcomes.map(({ recoveryDay }) => recoveryDay).filter((day): day is number => day !== null);
      const cashNonNegative = outcomes.every(({ result }) => result.daily.every((day) => day.cash >= 0));
      return {
        strategy,
        cashReserve,
        sampleCount: outcomes.length,
        enteredCrisisCount: crisisStartDays.length,
        recoveredByDay90Count: recoveryDays.length,
        debtFreeByDay90Count,
        crisisStartDayRange: [Math.min(...crisisStartDays), Math.max(...crisisStartDays)],
        recoveryDayRange: recoveryDays.length === 0 ? [] : [Math.min(...recoveryDays), Math.max(...recoveryDays)],
        finalDebtRange: [Math.min(...finalDebts), Math.max(...finalDebts)],
        finalCashRange: [Math.min(...finalCash), Math.max(...finalCash)],
        cashNonNegative,
      };
    }));
    expect(results).toEqual([
      { strategy: 'CAFE_CASH', cashReserve: 0, sampleCount: 10, enteredCrisisCount: 10, recoveredByDay90Count: 10,
        debtFreeByDay90Count: 0, crisisStartDayRange: [31, 31], recoveryDayRange: [55, 55], finalDebtRange: [1688.6, 1786.14],
        finalCashRange: [0, 0], cashNonNegative: true },
      { strategy: 'BIKE_REPAIR_CASH', cashReserve: 0, sampleCount: 10, enteredCrisisCount: 10, recoveredByDay90Count: 10,
        debtFreeByDay90Count: 10, crisisStartDayRange: [31, 31], recoveryDayRange: [34, 34], finalDebtRange: [0, 0],
        finalCashRange: [464.02, 561.06], cashNonNegative: true },
      { strategy: 'CAFE_CASH', cashReserve: 558, sampleCount: 10, enteredCrisisCount: 10, recoveredByDay90Count: 10,
        debtFreeByDay90Count: 0, crisisStartDayRange: [31, 31], recoveryDayRange: [69, 76], finalDebtRange: [2281.01, 2378.55],
        finalCashRange: [558, 558], cashNonNegative: true },
      { strategy: 'BIKE_REPAIR_CASH', cashReserve: 558, sampleCount: 10, enteredCrisisCount: 10, recoveredByDay90Count: 10,
        debtFreeByDay90Count: 0, crisisStartDayRange: [31, 31], recoveryDayRange: [41, 47], finalDebtRange: [30.3, 127.82],
        finalCashRange: [558, 558], cashNonNegative: true },
      { strategy: 'CAFE_CASH', cashReserve: 1000, sampleCount: 10, enteredCrisisCount: 10, recoveredByDay90Count: 10,
        debtFreeByDay90Count: 0, crisisStartDayRange: [31, 31], recoveryDayRange: [83, 89], finalDebtRange: [2750.3, 2847.83],
        finalCashRange: [1000, 1000], cashNonNegative: true },
      { strategy: 'BIKE_REPAIR_CASH', cashReserve: 1000, sampleCount: 10, enteredCrisisCount: 10, recoveredByDay90Count: 10,
        debtFreeByDay90Count: 0, crisisStartDayRange: [31, 31], recoveryDayRange: [53, 53], finalDebtRange: [499.56, 597.07],
        finalCashRange: [1000, 1000], cashNonNegative: true },
    ]);
  }, 30000);

});
