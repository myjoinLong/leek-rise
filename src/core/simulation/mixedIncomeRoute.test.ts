import { describe, expect, it } from 'vitest';
import { mixedIncomeActivities, simulateMixedIncomeRoute } from './mixedIncomeRoute';
import type { MixedIncomeActivity } from './mixedIncomeRoute';
import { firstChapterStartingDebt } from '../timeRules';

const seeds = [4, 42, 104, 2026, 8675309] as const;
const genders = ['MALE', 'FEMALE'] as const;
const reserve = 1000;

function weightedSchedule(phoneEvery: number): (typeof mixedIncomeActivities[number])[] {
  const otherActivities = mixedIncomeActivities.filter((activity) => activity !== 'PHONE_FLIP');
  let otherIndex = 0;
  return Array.from({ length: 30 }, (_, day) => day % phoneEvery === 0
    ? 'PHONE_FLIP'
    : otherActivities[otherIndex++ % otherActivities.length]!);
}

describe('mixed income route debt target', () => {
  it('rotates all seven income subgames and records 30 real reducer-driven days', () => {
    const result = simulateMixedIncomeRoute({ days: 30, gender: 'MALE', seed: 4, cashReserve: reserve });
    expect(result.daily).toHaveLength(30);
    expect(new Set(result.daily.map((day) => day.activity))).toEqual(new Set(mixedIncomeActivities));
    expect(result.daily[0]).toMatchObject({ day: 1, activity: 'DELIVERY' });
    expect(result.daily[29]).toMatchObject({ day: 30, activity: 'STREAM' });
    expect(result.finalState.phase).toBe('NIGHT');
    expect(result.daily.every((day) => day.interest >= 0 && day.repaid >= 0)).toBe(true);
  });

  it('counts streaming income and its current female character multiplier', () => {
    const male = simulateMixedIncomeRoute({ days: 7, gender: 'MALE', seed: 4, activities: ['STREAM'], ticksPerDay: 0 });
    const female = simulateMixedIncomeRoute({ days: 7, gender: 'FEMALE', seed: 4, activities: ['STREAM'], ticksPerDay: 0 });
    expect(male.totalActivityIncome).toBeGreaterThan(0);
    expect(female.totalActivityIncome).toBeGreaterThan(male.totalActivityIncome);
  });

  it('shows diverse rotation misses the target while high-capital routes recover it across tested seeds', () => {
    let phoneThirdPasses = 0;
    const phoneThirdDebts: number[] = [];
    const phoneHalfDebts: number[] = [];
    for (const seed of seeds) {
      for (const gender of genders) {
        const balanced = simulateMixedIncomeRoute({ days: 30, gender, seed, cashReserve: reserve });
        expect(balanced.targetMet).toBe(false);
        expect(balanced.finalState.debt).toBeGreaterThan(3700);
        expect(balanced.finalState.debt).toBeLessThan(4200);

        const phoneThird = simulateMixedIncomeRoute({
          days: 30, gender, seed, cashReserve: reserve, activities: weightedSchedule(3),
        });
        if (phoneThird.targetMet) phoneThirdPasses += 1;
        phoneThirdDebts.push(phoneThird.finalState.debt);

        const phoneHalf = simulateMixedIncomeRoute({
          days: 30, gender, seed, cashReserve: reserve, activities: weightedSchedule(2),
        });
        expect(phoneHalf.targetMet).toBe(true);
        phoneHalfDebts.push(phoneHalf.finalState.debt);
      }
    }
    expect(phoneThirdPasses).toBe(10);
    expect(Math.min(...phoneThirdDebts)).toBe(2677.62);
    expect(Math.max(...phoneThirdDebts)).toBe(2971.93);
    expect(Math.min(...phoneHalfDebts)).toBe(1899.91);
    expect(Math.max(...phoneHalfDebts)).toBe(2121.9);
  });

  it('keeps several non-phone first-chapter routes viable when all available cash goes to repayment', () => {
    const routes: readonly (readonly MixedIncomeActivity[])[] = [
      ['DELIVERY'],
      ['CAFE'],
      ['BIKE_REPAIR'],
      ['DELIVERY', 'CAFE', 'BIKE_REPAIR'],
    ];

    for (const activities of routes) {
      for (const seed of seeds) {
        for (const gender of genders) {
          const result = simulateMixedIncomeRoute({
            days: 30,
            gender,
            seed,
            cashReserve: 0,
            activities,
          });

          expect(result.targetMet, `${activities.join('/')} / ${gender} / seed ${seed}`).toBe(true);
          expect(result.finalState.debt).toBeLessThanOrEqual(3000);
          expect(result.daily.every((day) => day.cash >= 0)).toBe(true);
        }
      }
    }
  });

  it('records that shift mistakes and fortnightly absences miss the first chapter target', () => {
    const results = seeds.map((seed) => {
      const result = simulateMixedIncomeRoute({
        days: 30, gender: 'MALE', seed, cashReserve: reserve,
        activities: weightedSchedule(2), stress: { mistakesPerShift: 1, skipEveryDays: 14 },
      });
      return {
        seed, debt: result.finalState.debt, targetMet: result.targetMet,
        totalActivityIncome: result.totalActivityIncome,
        missedShifts: result.daily.filter((day) => day.missedShift).length,
      };
    });
    expect(results.every((result) => result.missedShifts === 2)).toBe(true);
    expect(results.every((result) => !result.targetMet)).toBe(true);
    expect(Math.min(...results.map((result) => result.debt))).toBeGreaterThan(5000);
    expect(Math.max(...results.map((result) => result.debt))).toBeLessThan(6000);
  });

  it('keeps every clean non-market income path cash-positive and below starting debt over a year', () => {
    for (const activity of mixedIncomeActivities) {
      for (const seed of seeds) {
        for (const gender of genders) {
          const result = simulateMixedIncomeRoute({
            days: 365,
            gender,
            seed,
            ticksPerDay: 0,
            cashReserve: reserve,
            activities: [activity],
          });

          expect(result.finalState.debt, `${activity} / ${gender} / seed ${seed}`).toBeLessThan(firstChapterStartingDebt);
          expect(result.finalState.cash, `${activity} / ${gender} / seed ${seed}`).toBeGreaterThan(0);
          expect(result.daily.every((day) => day.cash >= 0), `${activity} / ${gender} / seed ${seed}`).toBe(true);
        }
      }
    }
  });

  it('keeps six routes other than phone flipping cash-positive and below starting debt after mistakes and fortnightly absences', () => {
    const activities = mixedIncomeActivities.filter((activity) => activity !== 'PHONE_FLIP');
    for (const activity of activities) {
      for (const seed of seeds) {
        for (const gender of genders) {
          const result = simulateMixedIncomeRoute({
            days: 365,
            gender,
            seed,
            ticksPerDay: 0,
            cashReserve: reserve,
            activities: [activity],
            stress: { mistakesPerShift: 1, skipEveryDays: 14 },
          });

          expect(result.finalState.debt, `${activity} / ${gender} / seed ${seed}`).toBeLessThan(firstChapterStartingDebt);
          expect(result.finalState.cash, `${activity} / ${gender} / seed ${seed}`).toBeGreaterThan(0);
          expect(result.daily.every((day) => day.cash >= 0), `${activity} / ${gender} / seed ${seed}`).toBe(true);
        }
      }
    }
  });
});
