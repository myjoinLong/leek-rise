import { describe, expect, it } from 'vitest';
import { simulateEconomy } from './economySimulation';
import type { EconomyScenario, EconomySimulation } from './economySimulation';
import { runNegotiationEconomyMatrix } from './repaymentExperiment';

function key(result: EconomySimulation): string {
  const { seed, days, gender, strategy, negotiationOffer } = result.scenario;
  return [seed, days, gender, strategy, negotiationOffer ?? 'NONE'].join(':');
}

describe('Jiuge negotiation economy experiment', () => {
  it('compares relief terms against the same seeded baseline and reconciles charges', () => {
    const results = runNegotiationEconomyMatrix();
    const byKey = new Map(results.map((result) => [key(result), result]));
    expect(results).toHaveLength(1320);

    for (const result of results) {
      const { days, strategy, negotiationOffer } = result.scenario;
      const eligible = Boolean(negotiationOffer) && days > 30 && strategy !== 'HEAVY';
      if (!eligible) {
        expect(result.totals.negotiations).toBe(0);
        expect(result.totals.interestGraceEarned).toBe(0);
        expect(result.totals.contractFees).toBe(0);
        continue;
      }

      expect(result.totals.negotiations).toBe(1);
      expect(result.daily.find((day) => day.negotiationOutcome)?.negotiationOutcome).toBe(negotiationOffer);
      if (negotiationOffer === 'INTEREST_GRACE') {
        expect(result.totals.interestGraceWeeksGranted).toBe(1);
        expect(result.totals.interestGraceApplied).toBe(1);
        expect(result.totals.contractFees).toBe(0);
        expect(result.daily.filter((day) => day.interestGraceApplied).map((day) => day.day)).toEqual([35]);
      } else if (negotiationOffer === 'RATE_RESTRUCTURE') {
        expect(result.totals.interestGraceWeeksGranted).toBe(8);
        expect(result.totals.contractFees).toBe(200);
        expect(result.totals.rateRestructureApplied).toBeGreaterThan(0);
        expect(result.totals.rateRestructureApplied).toBeLessThanOrEqual(8);
        const expectedLastDay = result.firstDebtFreeDay ?? days;
        expect(result.daily.filter((day) => day.rateRestructureApplied).map((day) => day.day))
          .toEqual([35, 42, 49, 56, 63, 70, 77, 84].filter((day) => day <= days && day <= expectedLastDay));
      } else {
        expect(result.finalState.debtInstallmentPlan).not.toBeNull();
        expect(result.totals.contractFees).toBe(0);
        expect(result.totals.interestGraceWeeksGranted).toBe(0);
        const installmentDays = result.daily.filter((day) => day.installmentDue > 0).map((day) => day.day);
        const scheduledDays = [35, 42, 49, 56, 63, 70, 77, 84].filter((day) => day <= days);
        expect(installmentDays).toEqual(scheduledDays.slice(0, installmentDays.length));
        expect(installmentDays.length).toBeLessThanOrEqual(scheduledDays.length);
        expect(result.totals.installmentPaid).toBeCloseTo(
          result.daily.reduce((total, day) => total + day.installmentPaid, 0), 2,
        );
        expect(result.totals.installmentShortfalls).toBe(
          result.daily.filter((day) => day.installmentShortfall > 0).length,
        );
      }
    }

    for (const result of results) {
      let cash = 3200;
      let debt = 18000;
      for (const day of result.daily) {
        expect(day.debt).toBeCloseTo(debt + day.borrowed + day.interest + day.operatingCostsDeferred - day.repaid, 2);
        if (result.scenario.strategy !== 'HEAVY') {
          expect(day.cash).toBeCloseTo(
            cash + day.workIncome + day.activityIncome + day.assetSaleProceeds + day.borrowed - day.repaid
              - day.operatingCostsPaid - day.fees - day.contractFees,
            2,
          );
        }
        cash = day.cash;
        debt = day.debt;
      }
      expect(result.totals.contractFees).toBeCloseTo(result.daily.reduce((total, day) => total + day.contractFees, 0), 2);
    }

    for (const relief of results.filter((result) => result.scenario.negotiationOffer)) {
      const baselineScenario: EconomyScenario = { ...relief.scenario, negotiationOffer: undefined };
      const baseline = byKey.get(key({ ...relief, scenario: baselineScenario }));
      expect(baseline).toBeDefined();
      const netDifference = Number((relief.totals.equityChange - baseline!.totals.equityChange).toFixed(2));
      if (relief.scenario.negotiationOffer === 'INTEREST_GRACE') {
        expect(relief.totals.interest).toBeLessThanOrEqual(baseline!.totals.interest);
        expect(netDifference).toBeGreaterThanOrEqual(0);
        expect(relief.finalState.debt).toBeLessThanOrEqual(baseline!.finalState.debt);
      } else if (relief.scenario.negotiationOffer === 'RATE_RESTRUCTURE') {
        expect(relief.totals.interest).toBeLessThanOrEqual(baseline!.totals.interest);
        expect(netDifference).toBeGreaterThanOrEqual(-200);
      }
    }

    const sample = results.find((result) => result.scenario.seed === 42
      && result.scenario.days === 60 && result.scenario.strategy === 'WORK'
      && result.scenario.negotiationOffer === 'RATE_RESTRUCTURE');
    expect(sample).toBeDefined();
    expect(simulateEconomy(sample!.scenario)).toEqual(sample);
  }, 60000);
});
