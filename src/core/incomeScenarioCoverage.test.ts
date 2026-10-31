import { describe, expect, it } from 'vitest';
import { activityContracts, type ActivityId } from './activityContracts';
import { streamScenarioFor } from './streamScenarios';
import { stallMarketDayFor } from './marketStallScenarios';
import { cafeScenarioFor } from './systems/cafeShift';
import { deliveryStopsFor } from './systems/deliveryRun';
import { factoryInspectionForDay } from './systems/factoryShift';
import { bikeRepairCaseFor } from './systems/zhengBikeRepair';
import { phoneLotBriefFor } from './systems/phoneFlip';

type IncomeActivityId = {
  [Id in ActivityId]: typeof activityContracts[Id]['purpose'] extends 'income' ? Id : never;
}[ActivityId];

type DailyScenarioSource = (day: number, seed: number) => unknown;
const scenarioCoverageDays = 10000;
const firstChapterDays = 30;

const incomeScenarioSources: Record<IncomeActivityId, DailyScenarioSource> = {
  WANG_DELIVERY: (day, seed) => deliveryStopsFor(day, 3, seed),
  WANG_FACTORY: (day, seed) => [0, 1, 2].map((step) => factoryInspectionForDay(day, step, 5, seed)),
  SUJIE_CAFE_SHIFT: (day, seed) => [0, 1, 2].map((step) => cafeScenarioFor(day, step as 0 | 1 | 2, 4, seed)),
  LAOLIANG_MARKET_STALL: (day, seed) => stallMarketDayFor(day, seed, 3),
  ZHENG_BIKE_REPAIR: (day, seed) => [0, 1, 2].map((step) => bikeRepairCaseFor(day, step as 0 | 1 | 2, 5, seed)),
  PHONE_FLIP: (day, seed) => [0, 1, 2].map((step) => phoneLotBriefFor(day, step as 0 | 1 | 2, 5, seed)),
  XIAOLIAN_STREAM: (day, seed) => streamScenarioFor(day, 3, seed),
};

const returnScenarioSources: Partial<Record<IncomeActivityId, DailyScenarioSource>> = {
  WANG_DELIVERY: (day, seed) => deliveryStopsFor(day, 3, seed, day > 1
    ? { previousDay: day - 1, kind: 'RELIABLE' }
    : null),
  SUJIE_CAFE_SHIFT: (day, seed) => [0, 1, 2].map((step) => cafeScenarioFor(
    day,
    step as 0 | 1 | 2,
    4,
    seed,
    day > 1 ? { previousDay: day - 1, customerName: '熟客', previousChoice: 'SUGAR_FREE_LATTE' } : null,
  )),
  ZHENG_BIKE_REPAIR: (day, seed) => [0, 1, 2].map((step) => bikeRepairCaseFor(
    day,
    step as 0 | 1 | 2,
    5,
    seed,
    day > 1 ? {
      previousDay: day - 1,
      customerName: '周师傅',
      issueTitle: '刹车偏磨',
      faultPart: 'BATTERY',
      kind: 'MISSED_REPAIR',
    } : null,
  )),
  PHONE_FLIP: (day, seed) => [0, 1, 2].map((step) => phoneLotBriefFor(
    day,
    step as 0 | 1 | 2,
    5,
    seed,
    day > 1 ? { previousDay: day - 1, phoneName: '轻薄旗舰机', loss: 150 } : null,
  )),
};

const metadataKeys = new Set(['id', 'day', 'step', 'scenarioSeed', 'scenarioVersion']);

const identityOnlyFields: Partial<Record<IncomeActivityId, ReadonlySet<string>>> = {
  WANG_FACTORY: new Set(['managerLine']),
  SUJIE_CAFE_SHIFT: new Set(['name', 'avatar', 'sujieLine']),
  LAOLIANG_MARKET_STALL: new Set(['ownerLine']),
  ZHENG_BIKE_REPAIR: new Set(['customerName', 'customerContext', 'workshopLine']),
  PHONE_FLIP: new Set(['sellerName', 'appraiserLine']),
  XIAOLIAN_STREAM: new Set(['xiaolianLine']),
};

function contentSignature(value: unknown): string {
  return JSON.stringify(value, (key, nestedValue: unknown) => metadataKeys.has(key) ? undefined : nestedValue) ?? '';
}

function coreScenarioSignature(activity: IncomeActivityId, value: unknown): string {
  const omittedFields = identityOnlyFields[activity];
  return JSON.stringify(value, (key, nestedValue: unknown) => {
    if (metadataKeys.has(key) || omittedFields?.has(key)) return undefined;
    if (activity === 'WANG_DELIVERY' && ['description', 'outcome', 'income', 'energyCost'].includes(key)) return undefined;
    return nestedValue;
  }) ?? '';
}

function signaturesFor(activity: IncomeActivityId, seed: number): string[] {
  return Array.from({ length: scenarioCoverageDays }, (_, index) => contentSignature(incomeScenarioSources[activity](index + 1, seed)));
}

describe('long-term income scenario coverage', () => {
  it('requires every registered income activity to supply a scenario source', () => {
    const registeredIncomeIds = Object.entries(activityContracts)
      .filter(([, contract]) => contract.purpose === 'income')
      .map(([id]) => id)
      .sort();
    expect(Object.keys(incomeScenarioSources).sort()).toEqual(registeredIncomeIds);
  });

  it('keeps serialized daily scenario outputs unique and reproducible across 10000 days', () => {
    const activities = Object.keys(incomeScenarioSources) as IncomeActivityId[];
    activities.forEach((activity) => {
      for (const seed of [4, 47, 65535]) {
        const firstRun = signaturesFor(activity, seed);
        const repeatedRun = signaturesFor(activity, seed);
        const seen = new Map<string, number>();
        const repeatedDays = firstRun.flatMap((signature, index) => {
          const previousDay = seen.get(signature);
          if (previousDay !== undefined) return [`${index + 1}=${previousDay}`];
          seen.set(signature, index + 1);
          return [];
        });

        expect.soft(new Set(firstRun).size, `${activity} seed ${seed} repeated days: ${repeatedDays.slice(0, 20).join(',')}`).toBe(scenarioCoverageDays);
        expect.soft(repeatedRun, `${activity} seed ${seed} replay`).toEqual(firstRun);
      }
      expect.soft(signaturesFor(activity, 48), activity + ' alternate seed').not.toEqual(signaturesFor(activity, 47));
    });
  }, 30000);

  it('keeps first-chapter core income events unique without counting identity-only flavor', () => {
    const activities = Object.keys(incomeScenarioSources) as IncomeActivityId[];
    for (const activity of activities) {
      for (let seed = 0; seed < 256; seed += 1) {
        const seen = new Map<string, number>();
        const repeatedDays: string[] = [];
        for (let day = 1; day <= firstChapterDays; day += 1) {
          const signature = coreScenarioSignature(activity, incomeScenarioSources[activity](day, seed));
          const previousDay = seen.get(signature);
          if (previousDay !== undefined) repeatedDays.push(`${day}=${previousDay}`);
          else seen.set(signature, day);
        }

        expect(repeatedDays, `${activity} seed ${seed}`).toEqual([]);
      }
    }
  });

  it('keeps first-chapter event cores unique when recent NPC memories alter their presentation', () => {
    const activities = Object.keys(returnScenarioSources) as IncomeActivityId[];
    for (const activity of activities) {
      const source = returnScenarioSources[activity]!;
      for (let seed = 0; seed < 256; seed += 1) {
        const seen = new Map<string, number>();
        const repeatedDays: string[] = [];
        for (let day = 1; day <= firstChapterDays; day += 1) {
          const signature = coreScenarioSignature(activity, source(day, seed));
          const previousDay = seen.get(signature);
          if (previousDay !== undefined) repeatedDays.push(`${day}=${previousDay}`);
          else seen.set(signature, day);
        }

        expect(repeatedDays, `${activity} return memory seed ${seed}`).toEqual([]);
      }
    }
  });

  it('keeps all seven cash activity cores unique from the first chapter through 10000 continuation days', () => {
    const activities = Object.keys(incomeScenarioSources) as IncomeActivityId[];
    for (const activity of activities) {
      for (const seed of [4, 47, 65535]) {
        const seen = new Map<string, number>();
        const repeatedDays: string[] = [];
        for (let day = 1; day <= firstChapterDays + scenarioCoverageDays; day += 1) {
          const signature = coreScenarioSignature(activity, incomeScenarioSources[activity](day, seed));
          const previousDay = seen.get(signature);
          if (previousDay !== undefined) repeatedDays.push(`${day}=${previousDay}`);
          else seen.set(signature, day);
        }

        expect(repeatedDays, `${activity} continuation seed ${seed}`).toEqual([]);
      }
    }
  }, 30000);

  it('keeps four NPC memory branches unique across the first chapter and 10000 continuation days', () => {
    const activities = Object.keys(returnScenarioSources) as IncomeActivityId[];
    for (const activity of activities) {
      const source = returnScenarioSources[activity]!;
      for (const seed of [4, 47, 65535]) {
        const seen = new Map<string, number>();
        const repeatedDays: string[] = [];
        for (let day = 1; day <= firstChapterDays + scenarioCoverageDays; day += 1) {
          const signature = coreScenarioSignature(activity, source(day, seed));
          const previousDay = seen.get(signature);
          if (previousDay !== undefined) repeatedDays.push(`${day}=${previousDay}`);
          else seen.set(signature, day);
        }

        expect(repeatedDays, `${activity} return continuation seed ${seed}`).toEqual([]);
      }
    }
  }, 30000);

  it('keeps v4 cafe continuation event cores unique for 10000 days with returning-customer memory', () => {
    const previousChoices = ['SUGAR_FREE_LATTE', 'CARAMEL_MOCHA', 'SWEET_TEA'] as const;
    for (const seed of [4, 47, 65535]) {
      const seen = new Map<string, number>();
      const repeatedDays: string[] = [];
      for (let day = 1; day <= scenarioCoverageDays; day += 1) {
        const returnContext = day > 1 ? {
          previousDay: day - 1,
          customerName: '熟客',
          previousChoice: previousChoices[day % previousChoices.length]!,
        } : null;
        const scenarios = [0, 1, 2].map((step) => cafeScenarioFor(
          day, step as 0 | 1 | 2, 4, seed, returnContext,
        ));
        const signature = coreScenarioSignature('SUJIE_CAFE_SHIFT', scenarios);
        const previousDay = seen.get(signature);
        if (previousDay !== undefined) repeatedDays.push(`${day}=${previousDay}`);
        else seen.set(signature, day);
      }

      expect(repeatedDays, `SUJIE_CAFE_SHIFT v4 seed ${seed}`).toEqual([]);
    }
  }, 30000);
});
