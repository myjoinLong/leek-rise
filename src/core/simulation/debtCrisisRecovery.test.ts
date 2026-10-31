import { describe, expect, it } from 'vitest';
import { prototypeExperiment, simulateEconomy } from './economySimulation';

type Offer = {
  name: 'STANDARD' | 'INTEREST_GRACE' | 'RATE_RESTRUCTURE' | 'INSTALLMENTS';
  negotiationOffer?: 'INTEREST_GRACE' | 'RATE_RESTRUCTURE' | 'INSTALLMENTS';
};

describe('debt crisis recovery contract comparison', () => {
  it('keeps stressed cash routes recoverable and records the cost of each offer', () => {
    const offers: Offer[] = [
      { name: 'STANDARD' },
      { name: 'INTEREST_GRACE', negotiationOffer: 'INTEREST_GRACE' },
      { name: 'RATE_RESTRUCTURE', negotiationOffer: 'RATE_RESTRUCTURE' },
      { name: 'INSTALLMENTS', negotiationOffer: 'INSTALLMENTS' },
    ];
    const rows: {
      strategy: 'CAFE_CASH' | 'BIKE_REPAIR_CASH';
      offer: Offer['name'];
      recoveryCount: number;
      recoveryDayRange: number[];
      debtFreeCount: number;
      finalDebtRange: number[];
      contractFee: number;
      installmentShortfalls: number;
    }[] = [];

    for (const strategy of ['CAFE_CASH', 'BIKE_REPAIR_CASH'] as const) {
      for (const offer of offers) {
        const outcomes = [4, 17, 42, 2026, 65535].flatMap((seed) =>
          (['MALE', 'FEMALE'] as const).map((gender) => {
            const stress = strategy === 'CAFE_CASH'
              ? { cafe: { mistakesPerShift: 1, skipEveryDays: 14 } }
              : { bikeRepair: { mistakesPerShift: 1, skipEveryDays: 14 } };
            const result = simulateEconomy({
              strategy,
              days: 90,
              ticksPerDay: 0,
              seed,
              gender,
              deliveryRoute: prototypeExperiment.deliveryRoute,
              repayment: { cashReserve: 1000 },
              ...stress,
              ...(offer.negotiationOffer ? { negotiationOffer: offer.negotiationOffer } : {}),
            });
            const crisisStart = result.daily.findIndex((day) => day.debtCrisisStarted);
            const recoveryDay = crisisStart < 0
              ? null
              : result.daily.find((day, index) => index > crisisStart
                && !day.debtCrisisStarted && day.debt <= 3000)?.day ?? null;
            return {
              crisisDay: crisisStart < 0 ? null : result.daily[crisisStart]?.day ?? null,
              recoveryDay,
              debtFree: result.firstDebtFreeDay !== null,
              finalDebt: result.finalState.debt,
              contractFee: result.totals.contractFees,
              installmentShortfalls: result.totals.installmentShortfalls,
            };
          }),
        );
        const recoveredDays = outcomes.flatMap((outcome) =>
          outcome.recoveryDay === null ? [] : [outcome.recoveryDay],
        );
        const range = (values: number[]): number[] => [Math.min(...values), Math.max(...values)];
        rows.push({
          strategy,
          offer: offer.name,
          recoveryCount: recoveredDays.length,
          recoveryDayRange: range(recoveredDays),
          debtFreeCount: outcomes.filter((outcome) => outcome.debtFree).length,
          finalDebtRange: range(outcomes.map((outcome) => outcome.finalDebt)),
          contractFee: outcomes[0]?.contractFee ?? 0,
          installmentShortfalls: outcomes.reduce((total, outcome) => total + outcome.installmentShortfalls, 0),
        });
        expect(outcomes.every((outcome) => outcome.crisisDay === 31)).toBe(true);
      }
    }

    expect(rows).toEqual([
      { strategy: 'CAFE_CASH', offer: 'STANDARD', recoveryCount: 10, recoveryDayRange: [83, 89], debtFreeCount: 0, finalDebtRange: [2750.3, 2847.83], contractFee: 0, installmentShortfalls: 0 },
      { strategy: 'CAFE_CASH', offer: 'INTEREST_GRACE', recoveryCount: 10, recoveryDayRange: [83, 83], debtFreeCount: 0, finalDebtRange: [2725.95, 2823], contractFee: 0, installmentShortfalls: 0 },
      { strategy: 'CAFE_CASH', offer: 'RATE_RESTRUCTURE', recoveryCount: 10, recoveryDayRange: [90, 90], debtFreeCount: 0, finalDebtRange: [2877.21, 2972.81], contractFee: 200, installmentShortfalls: 0 },
      { strategy: 'CAFE_CASH', offer: 'INSTALLMENTS', recoveryCount: 10, recoveryDayRange: [83, 89], debtFreeCount: 0, finalDebtRange: [2748.61, 2846.14], contractFee: 0, installmentShortfalls: 10 },
      { strategy: 'BIKE_REPAIR_CASH', offer: 'STANDARD', recoveryCount: 10, recoveryDayRange: [53, 53], debtFreeCount: 0, finalDebtRange: [499.56, 597.07], contractFee: 0, installmentShortfalls: 0 },
      { strategy: 'BIKE_REPAIR_CASH', offer: 'INTEREST_GRACE', recoveryCount: 10, recoveryDayRange: [53, 53], debtFreeCount: 0, finalDebtRange: [479.56, 576.59], contractFee: 0, installmentShortfalls: 0 },
      { strategy: 'BIKE_REPAIR_CASH', offer: 'RATE_RESTRUCTURE', recoveryCount: 10, recoveryDayRange: [54, 54], debtFreeCount: 0, finalDebtRange: [655.86, 751.47], contractFee: 200, installmentShortfalls: 0 },
      { strategy: 'BIKE_REPAIR_CASH', offer: 'INSTALLMENTS', recoveryCount: 10, recoveryDayRange: [49, 49], debtFreeCount: 0, finalDebtRange: [499.56, 597.07], contractFee: 0, installmentShortfalls: 0 },
    ]);
  }, 15000);
});
