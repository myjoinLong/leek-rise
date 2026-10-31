import { describe, expect, it } from 'vitest';
import { simulateMixedIncomeRoute } from './mixedIncomeRoute';

describe('mixed income and trading simulation', () => {
  it('captures a deterministic delivery and trading comparison sample', () => {
    const strategies = [undefined, 'LOW_FREQUENCY', 'HEAVY'] as const;
    const seeds = [4, 17, 42, 47, 2026] as const;
    const genders = ['MALE', 'FEMALE'] as const;
    const summary = strategies.map((tradingStrategy) => {
      const outcomes = seeds.flatMap((seed) => genders.map((gender) => simulateMixedIncomeRoute({
        days: 30,
        gender,
        seed,
        cashReserve: 1000,
        activities: ['DELIVERY'],
        ...(tradingStrategy ? { tradingStrategy } : {}),
      })));
      const netChanges = outcomes.map((result) => result.totalTradingEquityChange).sort((a, b) => a - b);
      const fees = outcomes.map((result) => result.totalTradingFees).sort((a, b) => a - b);
      const debts = outcomes.map((result) => result.finalState.debt).sort((a, b) => a - b);
      const cash = outcomes.map((result) => result.finalState.cash).sort((a, b) => a - b);
      return {
        strategy: tradingStrategy ?? 'NONE',
        sampleCount: outcomes.length,
        medianTradingEquityChange: netChanges[Math.floor(netChanges.length / 2)],
        tradingEquityChangeRange: [netChanges[0], netChanges.at(-1)],
        medianTradingFees: fees[Math.floor(fees.length / 2)],
        finalDebtRange: [debts[0], debts.at(-1)],
        targetPasses: outcomes.filter((result) => result.targetMet).length,
        belowReserve: outcomes.filter((result) => result.finalState.cash < 1000).length,
        medianCash: cash[Math.floor(cash.length / 2)],
        activityIncome: outcomes[0]?.totalActivityIncome,
      };
    });
    expect(summary).toEqual([
      {
        strategy: 'NONE', sampleCount: 10, activityIncome: 5955,
        medianTradingEquityChange: -20.93, tradingEquityChangeRange: [-31.87, -20.01], medianTradingFees: 11.93,
        finalDebtRange: [3270.52, 3364.22], targetPasses: 0, belowReserve: 0, medianCash: 1000,
      },
      {
        strategy: 'LOW_FREQUENCY', sampleCount: 10, activityIncome: 5955,
        medianTradingEquityChange: -7.39, tradingEquityChangeRange: [-113.1, 83.1], medianTradingFees: 182.79,
        finalDebtRange: [3193.12, 3733.6], targetPasses: 0, belowReserve: 0, medianCash: 1000,
      },
      {
        strategy: 'HEAVY', sampleCount: 10, activityIncome: 5955,
        medianTradingEquityChange: 129.52, tradingEquityChangeRange: [-238.67, 407.4], medianTradingFees: 272.72,
        finalDebtRange: [2911.87, 3545.13], targetPasses: 2, belowReserve: 0, medianCash: 1000,
      },
    ]);
  });

  it('replays real low-frequency orders and keeps their trading ledger separate', () => {
    const options = {
      days: 30,
      gender: 'MALE' as const,
      seed: 47,
      cashReserve: 1000,
      activities: ['DELIVERY'] as const,
      tradingStrategy: 'LOW_FREQUENCY' as const,
    };
    const result = simulateMixedIncomeRoute(options);
    const replay = simulateMixedIncomeRoute(options);

    expect(result.daily).toEqual(replay.daily);
    expect(result.finalState.cash).toBeGreaterThanOrEqual(0);
    expect(result.daily.every((day) => day.cash >= 0)).toBe(true);
    expect(result.totalTradingFees).toBeGreaterThan(0);
    expect(result.totalTradingFees).toBe(Number(result.daily.reduce((total, day) => total + day.tradingFees, 0).toFixed(2)));
    expect(result.totalTradingEquityChange).toBe(Number(result.daily.reduce((total, day) => total + day.tradingEquityChange, 0).toFixed(2)));
  });

  it('keeps the same work earnings when a high-turnover market strategy is added', () => {
    const base = {
      days: 30,
      gender: 'FEMALE' as const,
      seed: 2026,
      cashReserve: 1000,
      activities: ['DELIVERY'] as const,
    };
    const incomeOnly = simulateMixedIncomeRoute(base);
    const combined = simulateMixedIncomeRoute({ ...base, tradingStrategy: 'HEAVY' });

    expect(combined.totalActivityIncome).toBe(incomeOnly.totalActivityIncome);
    expect(combined.totalTradingFees).toBeGreaterThanOrEqual(incomeOnly.totalTradingFees);
    expect(combined.finalState.orderSequence).toBeGreaterThan(incomeOnly.finalState.orderSequence);
  });

  it('captures phone inventory and market strategy comparisons', () => {
    const scenarios = [
      { label: 'NONE_CLEAN', tradingStrategy: undefined, mistakesPerShift: 0 as const },
      { label: 'NONE_MISTAKE', tradingStrategy: undefined, mistakesPerShift: 1 as const },
      { label: 'LOW_CLEAN', tradingStrategy: 'LOW_FREQUENCY' as const, mistakesPerShift: 0 as const },
      { label: 'LOW_MISTAKE', tradingStrategy: 'LOW_FREQUENCY' as const, mistakesPerShift: 1 as const },
      { label: 'HEAVY_CLEAN', tradingStrategy: 'HEAVY' as const, mistakesPerShift: 0 as const },
      { label: 'HEAVY_MISTAKE', tradingStrategy: 'HEAVY' as const, mistakesPerShift: 1 as const },
    ] as const;
    const summary = scenarios.map(({ label, tradingStrategy, mistakesPerShift }) => {
      const outcomes = [4, 17, 42, 47, 2026].flatMap((seed) => (['MALE', 'FEMALE'] as const).map((gender) => simulateMixedIncomeRoute({
        days: 30,
        gender,
        seed,
        cashReserve: 1000,
        stress: { mistakesPerShift },
        activities: ['PHONE_FLIP'],
        ...(tradingStrategy ? { tradingStrategy } : {}),
      })));
      const incomes = outcomes.map((result) => result.totalActivityIncome).sort((a, b) => a - b);
      const debts = outcomes.map((result) => result.finalState.debt).sort((a, b) => a - b);
      return {
        scenario: label,
        medianIncome: incomes[Math.floor(incomes.length / 2)],
        incomeRange: [incomes[0], incomes.at(-1)],
        medianTradingChange: outcomes.map((result) => result.totalTradingEquityChange).sort((a, b) => a - b)[5],
        medianFees: outcomes.map((result) => result.totalTradingFees).sort((a, b) => a - b)[5],
        debtRange: [debts[0], debts.at(-1)],
        targetPasses: outcomes.filter((result) => result.targetMet).length,
        medianCash: outcomes.map((result) => result.finalState.cash).sort((a, b) => a - b)[5],
      };
    });
    expect(summary).toEqual([
      {
        scenario: 'NONE_CLEAN', medianIncome: 9960, incomeRange: [9960, 9960], medianTradingChange: -20.94, medianFees: 11.94,
        debtRange: [0, 0], targetPasses: 10, medianCash: 1728.67,
      },
      {
        scenario: 'NONE_MISTAKE', medianIncome: 4020, incomeRange: [4020, 4020], medianTradingChange: -20.93, medianFees: 11.93,
        debtRange: [5226.77, 5320.48], targetPasses: 0, medianCash: 1000,
      },
      {
        scenario: 'LOW_CLEAN', medianIncome: 6972, incomeRange: [6308, 7636], medianTradingChange: -164.39, medianFees: 199.95,
        debtRange: [2121.57, 3924.51], targetPasses: 8, medianCash: 1000,
      },
      {
        scenario: 'LOW_MISTAKE', medianIncome: 1818, incomeRange: [1352, 2016], medianTradingChange: -15.45, medianFees: 161.08,
        debtRange: [7030.46, 7550.26], targetPasses: 0, medianCash: 1000,
      },
      {
        scenario: 'HEAVY_CLEAN', medianIncome: 5312, incomeRange: [4648, 7092], medianTradingChange: -49.03, medianFees: 279.22,
        debtRange: [2193.95, 4747.86], targetPasses: 4, medianCash: 1000,
      },
      {
        scenario: 'HEAVY_MISTAKE', medianIncome: 2080, incomeRange: [1740, 2214], medianTradingChange: 18.88, medianFees: 261.33,
        debtRange: [6512.38, 7374], targetPasses: 0, medianCash: 1000,
      },
    ]);
  });
});
