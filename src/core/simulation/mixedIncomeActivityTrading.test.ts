import { describe, expect, it } from 'vitest';
import { mixedIncomeActivities, simulateMixedIncomeRoute } from './mixedIncomeRoute';

const seeds = [4, 17, 42, 47, 2026] as const;
const genders = ['MALE', 'FEMALE'] as const;
const strategies = [
  { label: 'NONE', tradingStrategy: undefined },
  { label: 'LOW', tradingStrategy: 'LOW_FREQUENCY' as const },
  { label: 'HEAVY', tradingStrategy: 'HEAVY' as const },
] as const;

function matrixRow(
  route: string, medianIncome: number, incomeMin: number, incomeMax: number,
  medianTradingChange: number, medianFees: number, debtMin: number, debtMax: number,
  targetPasses: number, belowReserve: number, medianCash: number,
) {
  return {
    route, medianIncome, incomeRange: [incomeMin, incomeMax], medianTradingChange, medianFees,
    debtRange: [debtMin, debtMax], targetPasses, belowReserve, medianCash,
  };
}

describe('income activities combined with market trading', () => {
  it('captures a paired first-chapter matrix for all seven activities and a deterministic adverse policy', () => {
    const summary = mixedIncomeActivities.flatMap((activity) => strategies.flatMap(({ label, tradingStrategy }) => [0, 1].map((mistakesPerShift) => {
      const outcomes = seeds.flatMap((seed) => genders.map((gender) => simulateMixedIncomeRoute({
        days: 30,
        gender,
        seed,
        cashReserve: 1000,
        activities: [activity],
        stress: { mistakesPerShift: mistakesPerShift as 0 | 1 },
        ...(tradingStrategy ? { tradingStrategy } : {}),
      })));
      const incomes = outcomes.map((result) => result.totalActivityIncome).sort((left, right) => left - right);
      const tradingChanges = outcomes.map((result) => result.totalTradingEquityChange).sort((left, right) => left - right);
      const fees = outcomes.map((result) => result.totalTradingFees).sort((left, right) => left - right);
      const debts = outcomes.map((result) => result.finalState.debt).sort((left, right) => left - right);
      const cash = outcomes.map((result) => result.finalState.cash).sort((left, right) => left - right);
      return {
        route: `${activity}_${label}_${mistakesPerShift === 1 ? 'STRESS' : 'CLEAN'}`,
        medianIncome: incomes[5], incomeRange: [incomes[0], incomes.at(-1)],
        medianTradingChange: tradingChanges[5], medianFees: fees[5],
        debtRange: [debts[0], debts.at(-1)], targetPasses: outcomes.filter((result) => result.targetMet).length,
        belowReserve: outcomes.filter((result) => result.finalState.cash < 1000).length, medianCash: cash[5],
      };
    })));

    expect(summary).toEqual([
      matrixRow('DELIVERY_NONE_CLEAN', 5955, 5955, 5955, -20.93, 11.93, 3270.52, 3364.22, 0, 0, 1000),
      matrixRow('DELIVERY_NONE_STRESS', 5145, 5145, 5145, -20.94, 11.94, 4089.47, 4183.18, 0, 0, 1000),
      matrixRow('DELIVERY_LOW_CLEAN', 5955, 5955, 5955, -7.39, 182.79, 3193.12, 3733.6, 0, 0, 1000),
      matrixRow('DELIVERY_LOW_STRESS', 5145, 5145, 5145, 6.41, 179.99, 4084.01, 4190.11, 0, 0, 1000),
      matrixRow('DELIVERY_HEAVY_CLEAN', 5955, 5955, 5955, 129.52, 272.72, 2911.87, 3545.13, 2, 0, 1000),
      matrixRow('DELIVERY_HEAVY_STRESS', 5145, 5145, 5145, 101.25, 252.93, 3837.18, 4084.53, 0, 0, 1000),
      matrixRow('STREAM_NONE_CLEAN', 3912, 3220, 4086, -20.94, 11.94, 5350.99, 6236.32, 0, 4, 1000),
      matrixRow('STREAM_NONE_STRESS', 5172, 4245, 5316, -20.94, 11.94, 4166.15, 5291.6, 0, 0, 1000),
      matrixRow('STREAM_LOW_CLEAN', 3912, 3220, 4086, -33.6, 179.03, 5587.63, 6424.99, 0, 2, 1000),
      matrixRow('STREAM_LOW_STRESS', 5172, 4245, 5316, -5.01, 186.19, 4154.39, 5407.49, 0, 0, 1000),
      matrixRow('STREAM_HEAVY_CLEAN', 3912, 3220, 4086, 170.78, 255.16, 5097.81, 6187.28, 0, 1, 1000),
      matrixRow('STREAM_HEAVY_STRESS', 5172, 4245, 5316, 118.17, 267.18, 4013.35, 5256.07, 0, 0, 1000),
      matrixRow('FACTORY_NONE_CLEAN', 3600, 3600, 3600, -20.93, 11.93, 5651.41, 5745.12, 0, 0, 1000),
      matrixRow('FACTORY_NONE_STRESS', 3000, 3000, 3000, -20.94, 11.94, 6228.04, 6321.75, 0, 10, 970),
      matrixRow('FACTORY_LOW_CLEAN', 3600, 3600, 3600, -25.7, 176.19, 5631.57, 5773.93, 0, 0, 1000),
      matrixRow('FACTORY_LOW_STRESS', 3000, 3000, 3000, -133.44, 177.84, 6193.76, 6490.96, 0, 0, 1000),
      matrixRow('FACTORY_HEAVY_CLEAN', 3600, 3600, 3600, 123.55, 261.81, 5260.92, 5857.69, 0, 2, 1000),
      matrixRow('FACTORY_HEAVY_STRESS', 3000, 3000, 3000, 300.14, 247.78, 5843.93, 6374.18, 0, 4, 1000),
      matrixRow('CAFE_NONE_CLEAN', 5310, 5310, 5310, -20.94, 11.94, 3922.5, 4016.23, 0, 0, 1000),
      matrixRow('CAFE_NONE_STRESS', 4260, 4260, 4260, -20.94, 11.94, 4984.1, 5077.83, 0, 0, 1000),
      matrixRow('CAFE_LOW_CLEAN', 5310, 5310, 5310, -39.36, 186.99, 3916.75, 4286.31, 0, 2, 1000),
      matrixRow('CAFE_LOW_STRESS', 4260, 4260, 4260, -92.53, 199.42, 5025.34, 5254.28, 0, 0, 1000),
      matrixRow('CAFE_HEAVY_CLEAN', 5310, 5310, 5310, 248.15, 258.43, 3559.56, 3869.55, 0, 0, 1000),
      matrixRow('CAFE_HEAVY_STRESS', 4260, 4260, 4260, 70.47, 289.14, 4898.68, 5051.97, 0, 0, 1000),
      matrixRow('STALL_NONE_CLEAN', 4359, 4342, 4371, -20.94, 11.94, 4871.09, 4977.57, 0, 0, 1000),
      matrixRow('STALL_NONE_STRESS', 3426, 3372, 3434, -20.94, 11.94, 5807.43, 5909.43, 0, 4, 1000),
      matrixRow('STALL_LOW_CLEAN', 4359, 4342, 4371, -33.62, 189.28, 4799.71, 5184.53, 0, 2, 1000),
      matrixRow('STALL_LOW_STRESS', 3426, 3372, 3434, -30.6, 172.18, 5798.34, 6034.26, 0, 2, 1000),
      matrixRow('STALL_HEAVY_CLEAN', 4359, 4342, 4371, 141.78, 262.83, 4350.02, 4949.45, 0, 0, 1000),
      matrixRow('STALL_HEAVY_STRESS', 3426, 3372, 3434, 50.43, 274.07, 5565.84, 6038.59, 0, 0, 1000),
      matrixRow('BIKE_REPAIR_NONE_CLEAN', 5400, 5400, 5400, -20.94, 11.94, 3831.51, 3925.22, 0, 0, 1000),
      matrixRow('BIKE_REPAIR_NONE_STRESS', 5040, 5040, 5040, -20.94, 11.94, 4195.49, 4289.19, 0, 0, 1000),
      matrixRow('BIKE_REPAIR_LOW_CLEAN', 5400, 5400, 5400, -52.88, 189.31, 3852.33, 4035.85, 0, 2, 1000),
      matrixRow('BIKE_REPAIR_LOW_STRESS', 5040, 5040, 5040, -3.78, 180.02, 4174.88, 4336.74, 0, 0, 1000),
      matrixRow('BIKE_REPAIR_HEAVY_CLEAN', 5400, 5400, 5400, 249.46, 263.19, 3584.91, 3888.01, 0, 0, 1000),
      matrixRow('BIKE_REPAIR_HEAVY_STRESS', 5040, 5040, 5040, 149.61, 271.53, 3896.35, 4537.16, 0, 4, 1000),
      matrixRow('PHONE_FLIP_NONE_CLEAN', 9960, 9960, 9960, -20.94, 11.94, 0, 0, 10, 0, 1728.67),
      matrixRow('PHONE_FLIP_NONE_STRESS', 4020, 4020, 4020, -20.93, 11.93, 5226.77, 5320.48, 0, 0, 1000),
      matrixRow('PHONE_FLIP_LOW_CLEAN', 6972, 6308, 7636, -164.39, 199.95, 2121.57, 3924.51, 8, 0, 1000),
      matrixRow('PHONE_FLIP_LOW_STRESS', 1818, 1352, 2016, -15.45, 161.08, 7030.46, 7550.26, 0, 4, 1000),
      matrixRow('PHONE_FLIP_HEAVY_CLEAN', 5312, 4648, 7092, -49.03, 279.22, 2193.95, 4747.86, 4, 0, 1000),
      matrixRow('PHONE_FLIP_HEAVY_STRESS', 2080, 1740, 2214, 18.88, 261.33, 6512.38, 7374, 0, 4, 1000),
    ]);
  }, 30000);

  it('measures the cash and fame trade-off of hype-first streaming', () => {
    const policies = [0, 1] as const;
    const summary = policies.map((mistakesPerShift) => {
      const outcomes = seeds.flatMap((seed) => genders.map((gender) => simulateMixedIncomeRoute({
        days: 30, gender, seed, cashReserve: 1000, activities: ['STREAM'], stress: { mistakesPerShift },
      })));
      const incomes = outcomes.map((result) => result.totalActivityIncome).sort((left, right) => left - right);
      const debts = outcomes.map((result) => result.finalState.debt).sort((left, right) => left - right);
      const fame = outcomes.map((result) => result.finalState.fame).sort((left, right) => left - right);
      return {
        policy: mistakesPerShift === 1 ? 'HYPE_FIRST' : 'TRANSPARENT_FIRST',
        medianIncome: incomes[5], incomeRange: [incomes[0], incomes.at(-1)],
        fameRange: [fame[0], fame.at(-1)], debtRange: [debts[0], debts.at(-1)],
      };
    });
    expect(summary).toEqual([
      { policy: 'TRANSPARENT_FIRST', medianIncome: 3912, incomeRange: [3220, 4086], fameRange: [100, 100], debtRange: [5350.99, 6236.32] },
      { policy: 'HYPE_FIRST', medianIncome: 5172, incomeRange: [4245, 5316], fameRange: [46, 61], debtRange: [4166.15, 5291.6] },
    ]);
  });
});
