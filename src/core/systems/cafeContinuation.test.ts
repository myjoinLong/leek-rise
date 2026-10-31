import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import { cafeChoicesFor, cafeChoicesForScenario, cafeCustomerFor, cafeReturnContextFor, cafeScenarioFor, createCafeShift, serveCafeOrder } from './cafeShift';
import { cafeShiftSchema } from '../../save/cafeShiftSchema';
import { cafeContinuationScenarioCount } from '../cafeContinuationScenarios';

function daytime(day = 4) {
  return { ...createInitialState(17), day, phase: 'DAYTIME' as const, gender: 'MALE' as const, energy: 120, energyMax: 120 };
}

function completeShift(answers: readonly boolean[], day = 4) {
  let state = gameReducer(daytime(day), { type: 'START_CAFE_SHIFT' });
  for (let step = 0; step < 3; step += 1) {
    const run = state.activeActivity;
    if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Cafe shift did not start.');
    const scenario = cafeScenarioFor(state.day, step as 0 | 1 | 2, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const correct = scenario.correctChoice;
    const wrong = cafeChoicesForScenario(scenario).find((choice) => choice !== correct)!;
    state = gameReducer(state, {
      type: 'SERVE_CAFE_ORDER',
      choice: answers[step] === true ? correct : wrong,
    });
  }
  return state;
}

describe('Su Jie cafe continuation scenarios', () => {
  it('keeps the first chapter unchanged when new shifts move to scenario version 4', () => {
    for (let day = 1; day <= 30; day += 1) {
      for (const step of [0, 1, 2] as const) {
        expect(cafeScenarioFor(day, step, 3, 47)).toEqual(cafeScenarioFor(day, step, 2, 47));
        expect(cafeScenarioFor(day, step, 4, 47)).toEqual(cafeScenarioFor(day, step, 2, 47));
      }
    }
    expect(createCafeShift(31, 47).scenarioVersion).toBe(4);
  });

  it('turns a saved regular order into a visible returning-customer service challenge', () => {
    let state = gameReducer(daytime(8), { type: 'START_CAFE_SHIFT' });
    for (const step of [0, 1, 2] as const) {
      const run = state.activeActivity;
      if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Cafe shift did not start.');
      const scenario = cafeScenarioFor(state.day, step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
      state = gameReducer(state, { type: 'SERVE_CAFE_ORDER', choice: scenario.correctChoice });
    }

    const previousTrace = state.npcActivityMemory.sujie.lastTrace;
    if (!previousTrace?.sujieRegularCustomerName || previousTrace.scenarioVersion !== 4) {
      throw new Error('Completed cafe shift did not retain its regular customer facts.');
    }
    const previousRegularStep = ([0, 1, 2] as const).find((step) =>
      cafeCustomerFor(8, step, 4, state.scenarioSeed) === 'REGULAR');
    if (previousRegularStep === undefined) throw new Error('Cafe shift must include one regular customer.');
    const previousChoice = previousTrace.choiceKeys[previousRegularStep];

    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    state = {
      ...state, day: 9, phase: 'DAYTIME', workedToday: false, energy: 120,
      dailyWorkIncome: 0, activeActivity: null,
    };
    state = gameReducer(state, { type: 'START_CAFE_SHIFT' });
    const returningRun = state.activeActivity;
    if (!returningRun || returningRun.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Returning shift did not start.');
    expect(returningRun.returnContext).toEqual({
      previousDay: 8,
      customerName: previousTrace.sujieRegularCustomerName,
      previousChoice,
    });

    const returningStep = ([0, 1, 2] as const).find((step) =>
      cafeCustomerFor(9, step, 4, state.scenarioSeed) === 'REGULAR');
    if (returningStep === undefined) throw new Error('Returning shift must include the regular customer.');
    const returningScenario = cafeScenarioFor(9, returningStep, 4, state.scenarioSeed, returningRun.returnContext ?? null);
    expect(returningScenario.name).toBe(previousTrace.sujieRegularCustomerName);
    expect(returningScenario.correctChoice).not.toBe(previousChoice);
    expect(returningScenario.sujieLine).toContain('第 8 天');
    expect(returningScenario.sujieLine).toContain('答错不扣现金');
    expect(returningScenario.availableChoices).toContain(returningScenario.correctChoice);
    expect(cafeShiftSchema.safeParse(returningRun).success).toBe(true);

    const startingCash = state.cash;
    for (const step of [0, 1, 2] as const) {
      const run = state.activeActivity;
      if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Returning shift did not remain active.');
      const scenario = cafeScenarioFor(state.day, step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
      const choice = step === returningStep
        ? scenario.availableChoices.find((option) => option === previousChoice)
          ?? scenario.availableChoices.find((option) => option !== scenario.correctChoice)!
        : scenario.correctChoice;
      state = gameReducer(state, { type: 'SERVE_CAFE_ORDER', choice });
    }
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 142, tips: 70 });
    expect(cafeShiftSchema.safeParse(state.activeActivity).success).toBe(true);
    expect(state.cash - startingCash).toBe(142);
  });

  it('does not infer a returning customer from a legacy trace without scenario provenance', () => {
    const state = daytime(9);
    state.npcActivityMemory.sujie = {
      completedRuns: 1,
      lastCompletedDay: 8,
      lastTrace: {
        activityId: 'SUJIE_CAFE_SHIFT', choiceKeys: ['SUGAR_FREE_LATTE'], outcomeCode: null, cashDelta: 107, score: 1,
      },
      recentTraces: [],
    };

    expect(cafeReturnContextFor(state)).toBeNull();
  });

  it('generates reproducible continuation scenarios with valid returning-customer menus', () => {
    expect(cafeContinuationScenarioCount).toBe(61440);
    const firstRun: ReturnType<typeof cafeScenarioFor>[] = [];
    for (let day = 31; day < 5031; day += 1) {
      for (const step of [0, 1, 2] as const) {
        const returnContext = day > 31
          ? { previousDay: day - 1, customerName: '熟客', previousChoice: 'SUGAR_FREE_LATTE' as const }
          : null;
        const scenario = cafeScenarioFor(day, step, 3, 47, returnContext);
        expect(scenario.availableChoices).toContain(scenario.correctChoice);
        expect(scenario.availableChoices.length).toBeGreaterThanOrEqual(2);
        if (day === 31) firstRun.push(scenario);
        expect(cafeScenarioFor(day, step, 3, 47, returnContext)).toEqual(scenario);
      }
    }
    const differentSeed = cafeScenarioFor(31, 0, 3, 48);
    expect(differentSeed).not.toEqual(firstRun[0]);
    expect(firstRun[0]?.scene).toBeDefined();
    expect(firstRun[0]?.sujieLine).toBeDefined();
    for (let day = 31; day < 41; day += 1) {
      const advice = [0, 1, 2].map((step) => cafeScenarioFor(day, step as 0 | 1 | 2, 3, 47).sujieLine);
      expect(new Set(advice).size).toBe(3);
    }
  });

  it('keeps v3 saved continuation data stable while v4 gives each customer an independent stream', () => {
    const legacyRun = { ...createCafeShift(72, 4), scenarioVersion: 3 as const };
    for (const step of [0, 1, 2] as const) {
      const legacy = cafeScenarioFor(72, step, 3, 4, {
        previousDay: 71, customerName: '熟客', previousChoice: 'SUGAR_FREE_LATTE',
      });
      expect(legacy.id).toContain('cafe-v3-');
      const current = cafeScenarioFor(72, step, 4, 4, {
        previousDay: 71, customerName: '熟客', previousChoice: 'SUGAR_FREE_LATTE',
      });
      expect(current.availableChoices).toContain(current.correctChoice);
      expect(current.id).toContain('cafe-v4-');
    }
    const legacyScenario = cafeScenarioFor(72, 0, 3, 4, legacyRun.returnContext ?? null);
    expect(serveCafeOrder(legacyRun, legacyScenario.correctChoice)).toMatchObject({ scenarioVersion: 3, step: 1 });
    expect(cafeShiftSchema.safeParse({
      ...createCafeShift(72, 4), scenarioVersion: 4,
    }).success).toBe(true);
  });

  it('rejects a menu option that the visible stock notice says is unavailable', () => {
    let caseWithShortage: ReturnType<typeof cafeScenarioFor> | undefined;
    let shortageDay = 31;
    for (; shortageDay < 34; shortageDay += 1) {
      const scenario = cafeScenarioFor(shortageDay, 0, 4, 47);
      if (scenario.availableChoices.length < cafeChoicesFor(scenario.customer).length) {
        caseWithShortage = scenario;
        break;
      }
    }
    expect(caseWithShortage).toBeDefined();
    if (!caseWithShortage) throw new Error('Continuation test seed must include a stock shortage.');
    const unavailable = cafeChoicesFor(caseWithShortage.customer).find((choice) =>
      !cafeChoicesForScenario(caseWithShortage).includes(choice));
    expect(unavailable).toBeDefined();
    const run = createCafeShift(shortageDay, 47);
    expect(serveCafeOrder(run, unavailable!)).toBeNull();
  });

  it('keeps the established wage and tip rules for continuation shifts', () => {
    const state = completeShift([true, true, true], 31);
    expect(state.activeActivity).toMatchObject({ scenarioVersion: 4, status: 'RESULT', basePay: 72, tips: 105, income: 177 });
    expect(state.cash).toBe(3377);
    expect(state.energy).toBe(105);
    expect(cafeShiftSchema.safeParse(state.activeActivity).success).toBe(true);
  });

});
