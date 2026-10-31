import { describe, expect, it } from 'vitest';
import { prototypeExperiment, simulateEconomy } from './economySimulation';
import type { EconomyScenario } from './economySimulation';
import { runRepaymentEconomyMatrix } from './repaymentExperiment';
import { deliveryStopsFor } from '../systems/deliveryRun';

const scenario: EconomyScenario = {
  strategy: 'WORK', days: 30, ticksPerDay: 0, gender: 'MALE',
  deliveryRoute: prototypeExperiment.deliveryRoute,
};

describe('repayment experiment', () => {
  it('keeps repayment separate from profit, borrowing, and work income', () => {
    const baseline = simulateEconomy(scenario);
    const paid = simulateEconomy({ ...scenario, repayment: { cashReserve: 1000 } });
    expect(paid.totals.repaid).toBe(6835);
    expect(paid.totals.borrowed).toBe(0);
    expect(paid.totals.interest).toBeLessThan(baseline.totals.interest);
    expect(paid.totals.equityChange).toBeGreaterThan(baseline.totals.equityChange);
    expect(paid.totals.workIncome).toBe(baseline.totals.workIncome);
    expect(paid.daily.at(-1)?.cash).toBe(1000);
    expect(paid.daily.filter((day) => day.repaid > 0).every((day) => day.cash >= 1000)).toBe(true);
    expect(paid.daily.some((day) => day.operatingCostsPaid > 0 && day.cash < 1000)).toBe(true);
    expect(paid.firstDebtFreeDay).toBeNull();
  });

  it('counts borrowing and repayment separately even on the same day', () => {
    const result = simulateEconomy({ ...scenario, strategy: 'BORROW_WORK', days: 1, repayment: { cashReserve: 1000 } });
    expect(result.daily[0]?.borrowed).toBe(1000);
    expect(result.daily[0]?.repaid).toBe(3384);
    expect(result.totals.borrowed).toBe(1000);
    expect(result.finalState.debt).toBe(15616);
    expect(result.totals.equityChange).toBe(184);
  });

  it('caps payment at principal, stops at zero debt, and continues after payoff', () => {
    const result = simulateEconomy({ ...scenario, strategy: 'WORK_CASH', days: 90, repayment: { cashReserve: 1000 } });
    expect(result.totals.repaid).toBeCloseTo(18000 + result.totals.interest + result.totals.operatingCostsDeferred, 2);
    expect(result.finalState.debt).toBe(0);
    expect(result.firstDebtFreeDay).toBeGreaterThan(30);
    expect(result.firstDebtFreeDay).toBeLessThan(90);
    const payoffIndex = result.firstDebtFreeDay! - 1;
    const payoff = result.daily[payoffIndex]!;
    expect(payoff.repaid).toBeGreaterThan(0);
    expect(payoff.repaid).toBeLessThan(184);
    expect(result.daily.slice(payoffIndex + 1).every((day) => day.repaid === 0 && day.debt === 0)).toBe(true);
    expect(result.finalState.cash).toBeGreaterThan(payoff.cash);
    expect(result.finalState.day).toBe(90);
  });

  it('does not liquidate stock or invent cash to satisfy a reserve', () => {
    const highReserve = simulateEconomy({ ...scenario, days: 1, repayment: { cashReserve: 5000 } });
    expect(highReserve.totals.repaid).toBe(0);
    expect(highReserve.finalState.cash).toBe(3384);
    expect(highReserve.finalState.stocks.dragon?.holding?.shares).toBe(800);
    const cents = simulateEconomy({ ...scenario, days: 1, repayment: { cashReserve: 1000.29 } });
    expect(cents.finalState.cash).toBe(1000.29);
    expect(cents.totals.repaid).toBe(2383.71);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 0.001, Number.MAX_SAFE_INTEGER])(
    'rejects invalid cash reserve %s', (cashReserve) => {
      expect(() => simulateEconomy({ ...scenario, repayment: { cashReserve } })).toThrow();
    },
  );

  it('reconciles all 1320 scenarios and reproduces a sample of each strategy and gender', () => {
    const results = runRepaymentEconomyMatrix();
    expect(results).toHaveLength(1320);
    const factoryPaths = results.filter((entry) => entry.scenario.strategy === 'FACTORY'
      && entry.scenario.repayment?.cashReserve === 1000);
    expect(factoryPaths).toHaveLength(30);
    for (const factory of factoryPaths) {
      const delivery = results.find((entry) => entry.scenario.seed === factory.scenario.seed
        && entry.scenario.days === factory.scenario.days
        && entry.scenario.gender === factory.scenario.gender
        && entry.scenario.repayment?.cashReserve === 1000
        && entry.scenario.strategy === 'WORK');
      expect(factory.totals.workIncome).toBe(factory.scenario.days * 120);
      expect(factory.totals.repaid).toBeGreaterThan(0);
      expect(factory.daily.every((day) => {
        const minimumSpent = day.day <= 30 ? 19 : 17;
        const maximumSpent = day.day <= 30 ? 23 : 27;
        return day.energy <= factory.finalState.energyMax - minimumSpent
          && day.energy >= factory.finalState.energyMax - maximumSpent;
      })).toBe(true);
      const expectedDeliveryIncome = Array.from({ length: factory.scenario.days }, (_, dayIndex) => {
        const priorDeliveryContext = dayIndex === 0 ? null
          : prototypeExperiment.deliveryRoute.includes('RUSH')
            ? { previousDay: dayIndex, kind: 'RUSH' as const }
            : prototypeExperiment.deliveryRoute.every((choice: string) => choice === 'MAIN' || choice === 'STEADY')
              ? { previousDay: dayIndex, kind: 'RELIABLE' as const }
              : null;
        const stops = deliveryStopsFor(dayIndex + 1, 3, delivery?.scenario.seed ?? 4, priorDeliveryContext);
        return prototypeExperiment.deliveryRoute.reduce((income, choice, stopIndex) => {
          const option = stops[stopIndex]?.options.find((candidate) => candidate.choice === choice);
          return income + (option?.income ?? 0);
        }, 0);
      }).reduce((total, income) => total + income, 0);
      expect(delivery?.totals.workIncome).toBe(expectedDeliveryIncome);
      expect(delivery?.totals.workIncome).toBeGreaterThan(factory.totals.workIncome);
    }
    const cafePaths = results.filter((entry) => entry.scenario.strategy === 'CAFE'
      && entry.scenario.repayment?.cashReserve === 1000);
    expect(cafePaths).toHaveLength(30);
    for (const cafe of cafePaths) {
      expect(cafe.totals.workIncome).toBe(cafe.scenario.days * 177);
      expect(cafe.totals.repaid).toBeGreaterThan(0);
      expect(cafe.daily.every((day) => day.energy === cafe.finalState.energyMax - 15)).toBe(true);
    }
    const cafeCashPaths = results.filter((entry) => entry.scenario.strategy === 'CAFE_CASH'
      && entry.scenario.repayment?.cashReserve === 1000);
    expect(cafeCashPaths).toHaveLength(30);
    for (const cafeCash of cafeCashPaths) {
      expect(cafeCash.totals.workIncome).toBe(cafeCash.scenario.days * 177);
      expect(cafeCash.totals.repaid).toBeGreaterThan(0);
      expect(cafeCash.daily.every((day) => day.portfolio === 0)).toBe(true);
      expect(cafeCash.daily[0]?.assetSaleProceeds).toBeGreaterThan(0);
      expect(cafeCash.daily.slice(1).every((day) => day.assetSaleProceeds === 0)).toBe(true);
    }
    for (const result of results.filter((entry) => entry.scenario.seed === 4
      && entry.scenario.days === 90 && entry.scenario.repayment?.cashReserve === 1000)) {
      expect(simulateEconomy(result.scenario)).toEqual(result);
    }
    for (const result of results) {
      let debt = 18000;
      let cash = 3200;
      let repaid = 0;
      for (const day of result.daily) {
        expect(day.debt).toBeCloseTo(debt + day.borrowed + day.interest + day.operatingCostsDeferred - day.repaid, 2);
        if (result.scenario.strategy !== 'HEAVY') {
          expect(day.cash).toBeCloseTo(cash + day.workIncome + day.activityIncome + day.assetSaleProceeds + day.borrowed - day.repaid - day.operatingCostsPaid - day.fees - day.contractFees, 2);
        }
        expect(day.repaid).toBeGreaterThanOrEqual(0);
        expect(day.debt).toBeGreaterThanOrEqual(0);
        expect(day.cash).toBeGreaterThanOrEqual(0);
        const reserve = result.scenario.repayment?.cashReserve;
        if (reserve !== undefined && day.repaid > 0) expect(day.cash).toBeGreaterThanOrEqual(reserve);
        debt = day.debt;
        cash = day.cash;
        repaid += day.repaid;
      }
      expect(result.totals.repaid).toBeCloseTo(repaid, 2);
      expect(result.finalState.debt).toBeCloseTo(
        18000 + result.totals.borrowed + result.totals.interest + result.totals.operatingCostsDeferred - result.totals.repaid,
        2,
      );
      expect(result.totals.equityChange).toBeCloseTo(result.daily.at(-1)!.equity - result.initialEquity, 2);
    }
  }, 120000);
});
