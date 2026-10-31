import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { factoryShiftSchema } from '../../save/factoryShiftSchema';
import { gameStateSchema } from '../../save/schemas';
import { factoryInspectionForDay, factoryShiftBonusPerCorrectCheck, factoryShiftEnergyCost, factoryShiftMinimumEnergy } from './factoryShift';
import { factoryContinuationCasesPerProfile } from '../factoryContinuationScenarios';

function daytime(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState(),
    phase: 'DAYTIME',
    gender: 'MALE',
    energy: 120,
    energyMax: 120,
    ...overrides,
  };
}

describe('factory inspection shift', () => {
  it('draws 90 distinct first-chapter inspections deterministically and preserves legacy active saves', () => {
    const firstChapter = Array.from({ length: 30 }, (_, day) => [0, 1, 2].map((step) =>
      factoryInspectionForDay(day + 1, step, 3, 811)));
    const inspections = firstChapter.flat();
    expect(inspections).toHaveLength(90);
    expect(new Set(inspections.map((inspection) => inspection.id)).size).toBe(90);
    expect(new Set(inspections.map((inspection) => `${inspection.title}|${inspection.clue}`)).size).toBe(90);
    expect(inspections.filter((inspection) => inspection.correctChoice === 'REWORK')).toHaveLength(44);
    expect(inspections.reduce((energy, inspection) => energy + (inspection.correctChoice === 'REWORK' ? 9 : 5), 0)).toBe(626);
    for (const dailyCases of firstChapter) {
      expect(dailyCases.some((inspection) => inspection.id.includes('-trace-'))).toBe(true);
      expect(dailyCases.some((inspection) => inspection.id.includes('-pack-'))).toBe(true);
      expect(dailyCases.some((inspection) => inspection.id.includes('-func-'))).toBe(true);
    }
    expect(firstChapter).toEqual(Array.from({ length: 30 }, (_, day) => [0, 1, 2].map((step) =>
      factoryInspectionForDay(day + 1, step, 2, 811))));
    expect(firstChapter[0]).not.toEqual([0, 1, 2].map((step) => factoryInspectionForDay(1, step, 2, 812)));

    const active = gameReducer(daytime(), { type: 'START_FACTORY_SHIFT' }).activeActivity;
    expect(active).toMatchObject({ scenarioVersion: 5, scenarioSeed: 4 });
    expect(factoryShiftSchema.safeParse(active).success).toBe(true);
    expect(factoryShiftSchema.safeParse({
      ...active,
      priorReview: {
        previousDay: 1,
        step: 0,
        caseTitle: '旧工单',
        choice: 'PASS',
        correctChoice: 'PASS',
        qualityBonusMissed: 20,
      },
    }).success).toBe(false);
    const legacy = { id: 'WANG_FACTORY' as const, day: 1, status: 'ACTIVE' as const, step: 0 as const,
      qualityBonus: 0, energySpent: 0, decisions: [] };
    expect(factoryShiftSchema.safeParse(legacy).success).toBe(true);
  });

  it('keeps saved v3 shifts stable and gives new v4 shifts 360 unique events per profile', () => {
    expect(factoryContinuationCasesPerProfile).toBe(360);
    const continuation = Array.from({ length: factoryContinuationCasesPerProfile }, (_, index) =>
      [0, 1, 2].map((step) => factoryInspectionForDay(index + 31, step, 4, 811)));
    const ids = continuation.flatMap((day) => day.map((inspection) => inspection.id));
    expect(new Set(ids).size).toBe(factoryContinuationCasesPerProfile * 3);
    expect(continuation[0]).not.toEqual([0, 1, 2].map((step) => factoryInspectionForDay(1, step, 2, 811)));
    expect(continuation).toEqual(Array.from({ length: factoryContinuationCasesPerProfile }, (_, index) =>
      [0, 1, 2].map((step) => factoryInspectionForDay(index + 31, step, 4, 811))));
    expect([0, 1, 2].map((step) => factoryInspectionForDay(31, step, 3, 811).id).sort())
      .toEqual([0, 1, 2].map((step) => factoryInspectionForDay(271, step, 3, 811).id).sort());
    expect([0, 1, 2].map((step) => factoryInspectionForDay(271, step, 4, 811).id).sort())
      .not.toEqual(continuation[0]!.map((inspection) => inspection.id).sort());

    const otherSeed = [0, 1, 2].map((step) => factoryInspectionForDay(31, step, 4, 812));
    expect(otherSeed).not.toEqual(continuation[0]);
    expect(factoryShiftEnergyCost('PASS')).toBe(5);
    expect(factoryShiftEnergyCost('HOLD')).toBe(7);
    expect(factoryShiftEnergyCost('REWORK')).toBe(9);
    expect(continuation.flat().some((inspection) => inspection.correctChoice === 'HOLD')).toBe(true);
  });

  it('settles a continuation isolation choice and rejects it for a legacy shift', () => {
    let holdDay = 31;
    while (![0, 1, 2].some((step) => factoryInspectionForDay(holdDay, step, 3, 4).correctChoice === 'HOLD')) holdDay += 1;
    let state = gameReducer(daytime({ day: holdDay }), { type: 'START_FACTORY_SHIFT' });
    for (let step = 0; step < 3; step += 1) {
      const run = state.activeActivity;
      if (!run || run.id !== 'WANG_FACTORY') throw new Error('Factory run was not started.');
      const inspection = factoryInspectionForDay(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: inspection.correctChoice });
    }
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 120, qualityBonus: 60 });
    if (state.activeActivity?.id !== 'WANG_FACTORY' || state.activeActivity.status !== 'RESULT') throw new Error('Factory result is missing.');
    expect(state.activeActivity.decisions.some((decision) => decision.choice === 'HOLD' && decision.energyCost === 7)).toBe(true);
    expect(factoryShiftSchema.safeParse(state.activeActivity).success).toBe(true);

    const started = gameReducer(daytime({ day: 31 }), { type: 'START_FACTORY_SHIFT' });
    if (!started.activeActivity || started.activeActivity.id !== 'WANG_FACTORY') throw new Error('Factory run was not started.');
    const legacy = { ...started, activeActivity: { ...started.activeActivity, scenarioVersion: 2 as const } };
    expect(gameReducer(legacy, { type: 'CHOOSE_FACTORY_CHECK', choice: 'HOLD' })).toBe(legacy);
  });

  it('pays the disclosed base wage and correct-check bonuses once after three stations', () => {
    let state = gameReducer(daytime(), { type: 'START_FACTORY_SHIFT' });
    const startingCash = state.cash;

    for (let step = 0; step < 3; step += 1) {
      const run = state.activeActivity;
      if (!run || run.id !== 'WANG_FACTORY') throw new Error('Factory run was not started.');
      const inspection = factoryInspectionForDay(state.day, step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: inspection.correctChoice });
    }

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 120, qualityBonus: 60 });
    expect(state.cash).toBe(startingCash + 120);
    expect(state.dailyWorkIncome).toBe(120);
    if (state.activeActivity?.id !== 'WANG_FACTORY' || state.activeActivity.status !== 'RESULT') throw new Error('Factory shift did not settle.');
    expect(state.energy).toBe(120 - state.activeActivity.energySpent);
    expect(state.workedToday).toBe(true);

    const hub = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(hub.activeActivity).toBeNull();
    expect(gameReducer(hub, { type: 'START_FACTORY_SHIFT' })).toBe(hub);
  });

  it('reserves minimum energy for the remaining stations and preserves base pay after mistakes', () => {
    let state = gameReducer(daytime({ energy: factoryShiftMinimumEnergy }), { type: 'START_FACTORY_SHIFT' });
    const blockedRework = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: 'REWORK' });
    expect(blockedRework).toBe(state);

    state = gameReducer(daytime({ energy: 27 }), { type: 'START_FACTORY_SHIFT' });
    let expectedEnergySpent = 0;
    for (let step = 0; step < 3; step += 1) {
      const run = state.activeActivity;
      if (!run || run.id !== 'WANG_FACTORY') throw new Error('Factory run was not started.');
      const inspection = factoryInspectionForDay(state.day, step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
      const choice = step === 0 ? (inspection.correctChoice === 'PASS' ? 'REWORK' : 'PASS') : inspection.correctChoice;
      expectedEnergySpent += choice === 'REWORK' ? 9 : 5;
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice });
    }

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 100, qualityBonus: 40, energySpent: expectedEnergySpent });
    expect(state.energy).toBe(27 - expectedEnergySpent);
    expect(state.cash).toBe(3300);
    expect(state.dailyWorkIncome).toBe(100);
  });

  it('remembers the first missed inspection for the next shift without changing its outcome', () => {
    let state = gameReducer(daytime({ day: 4 }), { type: 'START_FACTORY_SHIFT' });
    const firstInspection = factoryInspectionForDay(4, 0, 5, state.scenarioSeed);
    const firstChoice = firstInspection.correctChoice === 'PASS' ? 'REWORK' : 'PASS';

    for (let step = 0; step < 3; step += 1) {
      const run = state.activeActivity;
      if (!run || run.id !== 'WANG_FACTORY') throw new Error('Factory run was not started.');
      const inspection = factoryInspectionForDay(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
      const choice = step === 0 ? firstChoice : inspection.correctChoice;
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice });
    }

    expect(state.npcActivityMemory.wang.lastTrace).toMatchObject({
      day: 4,
      activityId: 'WANG_FACTORY',
      factoryReturnContext: {
        previousDay: 4,
        step: 0,
        caseTitle: firstInspection.title,
        choice: firstChoice,
        correctChoice: firstInspection.correctChoice,
        qualityBonusMissed: factoryShiftBonusPerCorrectCheck,
      },
    });
    expect(gameStateSchema.safeParse(state).success).toBe(true);

    const nextDay = {
      ...state,
      day: 5,
      phase: 'DAYTIME' as const,
      activeActivity: null,
      workedToday: false,
      energy: 120,
    };
    const cashBeforeNextShift = nextDay.cash;
    const nextShift = gameReducer(nextDay, { type: 'START_FACTORY_SHIFT' });

    expect(nextShift.activeActivity).toMatchObject({
      id: 'WANG_FACTORY',
      day: 5,
      priorReview: {
        previousDay: 4,
        caseTitle: firstInspection.title,
        choice: firstChoice,
        correctChoice: firstInspection.correctChoice,
        qualityBonusMissed: factoryShiftBonusPerCorrectCheck,
      },
    });
    expect(nextShift.cash).toBe(cashBeforeNextShift);
    expect(factoryShiftSchema.safeParse(nextShift.activeActivity).success).toBe(true);
  });

  it('does not create a factory review when every inspection was correct', () => {
    let state = gameReducer(daytime({ day: 4 }), { type: 'START_FACTORY_SHIFT' });
    for (let step = 0; step < 3; step += 1) {
      const run = state.activeActivity;
      if (!run || run.id !== 'WANG_FACTORY') throw new Error('Factory run was not started.');
      const inspection = factoryInspectionForDay(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: inspection.correctChoice });
    }

    expect(state.npcActivityMemory.wang.lastTrace?.factoryReturnContext).toBeUndefined();
  });

  it('lets the player abandon without a wage, while keeping already spent energy', () => {
    let state = gameReducer(daytime(), { type: 'START_FACTORY_SHIFT' });
    state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: 'PASS' });
    const cashBeforeExit = state.cash;
    const energyBeforeExit = state.energy;

    const hub = gameReducer(state, { type: 'ABANDON_FACTORY_SHIFT' });

    expect(hub.activeActivity).toBeNull();
    expect(hub.cash).toBe(cashBeforeExit);
    expect(hub.dailyWorkIncome).toBe(0);
    expect(hub.energy).toBe(energyBeforeExit);
    expect(hub.workedToday).toBe(false);
    expect(gameReducer(hub, { type: 'START_FACTORY_SHIFT' }).activeActivity?.id).toBe('WANG_FACTORY');
  });

  it('rejects entry with insufficient energy and ignores exit outside an active daytime shift', () => {
    const lowEnergy = daytime({ energy: factoryShiftMinimumEnergy - 1 });
    expect(gameReducer(lowEnergy, { type: 'START_FACTORY_SHIFT' })).toBe(lowEnergy);

    const active = gameReducer(daytime(), { type: 'START_FACTORY_SHIFT' });
    const outsideDay = { ...active, phase: 'TRADING' as const };
    expect(gameReducer(outsideDay, { type: 'ABANDON_FACTORY_SHIFT' })).toBe(outsideDay);
  });
});
