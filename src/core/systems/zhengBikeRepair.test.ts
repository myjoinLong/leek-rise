import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { bikeRepairCanTest, bikeRepairCaseFor, zhengBikeRepairScenarioCount, zhengBikeRepairScenarios, zhengRepairJobs, zhengRepairMinimumEnergy } from './zhengBikeRepair';
import { zhengBikeRepairSchema } from '../../save/zhengBikeRepairSchema';

function daytime(energy = 100) {
  return { ...createInitialState(), phase: 'DAYTIME' as const, energy, energyMax: 120 };
}

describe('Zheng bike repair activity', () => {
  it('offers 90 unique first-chapter tickets in a reproducible, seed-specific order', () => {
    const firstChapter = Array.from({ length: 30 }, (_, day) =>
      [0, 1, 2].map((step) => bikeRepairCaseFor(day + 1, step as 0 | 1 | 2, 2, 4917)),
    ).flat();
    const sameSeed = Array.from({ length: 30 }, (_, day) =>
      [0, 1, 2].map((step) => bikeRepairCaseFor(day + 1, step as 0 | 1 | 2, 2, 4917).id),
    ).flat();
    const otherSeed = Array.from({ length: 30 }, (_, day) =>
      [0, 1, 2].map((step) => bikeRepairCaseFor(day + 1, step as 0 | 1 | 2, 2, 9123).id),
    ).flat();

    expect(zhengBikeRepairScenarioCount).toBe(90);
    expect(zhengBikeRepairScenarios).toHaveLength(90);
    expect(new Set(firstChapter.map((ticket) => ticket.id)).size).toBe(90);
    expect(new Set(firstChapter.map((ticket) => `${ticket.faultyPart}:${ticket.symptom}`)).size).toBe(90);
    expect(['BATTERY', 'BRAKES', 'CONTROLLER'].map((part) =>
      zhengBikeRepairScenarios.filter((ticket) => ticket.faultyPart === part).length,
    )).toEqual([30, 30, 30]);
    expect(sameSeed).toEqual(firstChapter.map((ticket) => ticket.id));
    expect(otherSeed).not.toEqual(sameSeed);
  });

  it('preserves the first 30 days and supplies 240 continuation days without repeating a ticket', () => {
    const seed = 4917;
    const firstChapterMatches = Array.from({ length: 30 }, (_, day) =>
      [0, 1, 2].every((step) => bikeRepairCaseFor(day + 1, step as 0 | 1 | 2, 3, seed).id === bikeRepairCaseFor(day + 1, step as 0 | 1 | 2, 2, seed).id),
    );
    const continuation = Array.from({ length: 240 }, (_, day) =>
      [0, 1, 2].map((step) => bikeRepairCaseFor(day + 31, step as 0 | 1 | 2, 3, seed)),
    ).flat();
    const repeat = Array.from({ length: 240 }, (_, day) =>
      [0, 1, 2].map((step) => bikeRepairCaseFor(day + 31, step as 0 | 1 | 2, 3, seed).id),
    ).flat();

    expect(firstChapterMatches.every(Boolean)).toBe(true);
    expect(continuation).toHaveLength(720);
    expect(new Set(continuation.map((ticket) => ticket.id)).size).toBe(720);
    expect(['BATTERY', 'BRAKES', 'CONTROLLER'].map((part) =>
      continuation.filter((ticket) => ticket.faultyPart === part).length,
    )).toEqual([240, 240, 240]);
    expect(new Set(repeat).size).toBe(720);
  });

  it('keeps the saved v3 continuation cycle intact after the v4 pool expands', () => {
    const seed = 4917;
    const ticketsForDay = (day: number) => [0, 1, 2]
      .map((step) => bikeRepairCaseFor(day, step as 0 | 1 | 2, 3, seed).id)
      .sort();

    expect(ticketsForDay(271)).toEqual(ticketsForDay(31));
  });

  it('rotates three repair cases by day and covers all three parts', () => {
    const cases = [0, 1, 2].map((step) => bikeRepairCaseFor(4, step as 0 | 1 | 2));
    expect(cases.map((repairCase) => repairCase.faultyPart)).toEqual(['BATTERY', 'BRAKES', 'CONTROLLER']);
    expect(bikeRepairCaseFor(5, 0)).not.toEqual(cases[0]);
  });

  it('requires enough energy for all repairs and locks the daily work slot at entry', () => {
    const tooTired = { ...daytime(), energy: zhengRepairMinimumEnergy - 1 };
    expect(gameReducer(tooTired, { type: 'START_ZHENG_BIKE_REPAIR' })).toBe(tooTired);
    const state = gameReducer(daytime(), { type: 'START_ZHENG_BIKE_REPAIR' });
    expect(state.workedToday).toBe(true);
    expect(state.activeActivity).toMatchObject({ scenarioVersion: 5, scenarioSeed: state.scenarioSeed });
    expect(gameReducer(state, { type: 'START_CAFE_SHIFT' })).toBe(state);
    expect(gameReducer(state, { type: 'ABANDON_ZHENG_BIKE_REPAIR' }).workedToday).toBe(true);
  });

  it('charges optional diagnostics once and protects energy reserved for the remaining repairs', () => {
    let state = gameReducer(daytime(17), { type: 'START_ZHENG_BIKE_REPAIR' });
    const run = state.activeActivity;
    if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') throw new Error('Repair activity did not start.');
    const currentCase = bikeRepairCaseFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
    expect(bikeRepairCanTest(state, run, currentCase.faultyPart)).toBe(true);
    state = gameReducer(state, { type: 'TEST_BIKE_PART', part: currentCase.faultyPart });
    expect(state.energy).toBe(15);
    expect(state.activeActivity).toMatchObject({ tests: [{ step: 0, part: currentCase.faultyPart, foundFault: true }], energySpent: 2 });
    expect(gameReducer(state, { type: 'TEST_BIKE_PART', part: currentCase.faultyPart })).toBe(state);
    expect(gameReducer(state, { type: 'TEST_BIKE_PART', part: 'BRAKES' })).toBe(state);
    expect(zhengBikeRepairSchema.safeParse(state.activeActivity).success).toBe(true);
  });

  it('pays base wage on a wrong repair without deducting cash or adding debt', () => {
    let state = gameReducer(daytime(), { type: 'START_ZHENG_BIKE_REPAIR' });
    state = gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part: 'BRAKES' });
    expect(state.cash).toBe(3248);
    expect(state.debt).toBe(18000);
    expect(state.dailyWorkIncome).toBe(48);
    expect(state.energy).toBe(95);
    expect(state.activeActivity).toMatchObject({ income: 48, qualityBonus: 0, decisions: [{ correct: false, qualityBonus: 0 }] });
  });

  it('requires evidence for a continuation warranty bonus and enforces that ticket’s test limit', () => {
    const proofSeed = Array.from({ length: 100 }, (_, seed) => seed).find((seed) => {
      const repairCase = bikeRepairCaseFor(31, 0, 3, seed);
      return repairCase.warrantyProofRequired && repairCase.testLimit === 1;
    });
    if (proofSeed === undefined) throw new Error('No one-test warranty case was generated.');
    const start = { ...daytime(), day: 31, scenarioSeed: proofSeed };
    let unverified = gameReducer(start, { type: 'START_ZHENG_BIKE_REPAIR' });
    let run = unverified.activeActivity;
    if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') throw new Error('Repair activity did not start.');
    const repairCase = bikeRepairCaseFor(31, 0, 3, proofSeed);
    unverified = gameReducer(unverified, { type: 'REPAIR_BIKE_FAULT', part: repairCase.faultyPart });
    expect(unverified.activeActivity).toMatchObject({ income: 48, qualityBonus: 0, decisions: [{ correct: true, verified: false }] });

    let verified = gameReducer(start, { type: 'START_ZHENG_BIKE_REPAIR' });
    verified = gameReducer(verified, { type: 'TEST_BIKE_PART', part: repairCase.faultyPart });
    run = verified.activeActivity;
    if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') throw new Error('Repair activity ended during testing.');
    const afterOneTest = verified;
    verified = gameReducer(verified, { type: 'TEST_BIKE_PART', part: repairCase.faultyPart === 'BATTERY' ? 'BRAKES' : 'BATTERY' });
    expect(verified).toBe(afterOneTest);
    verified = gameReducer(verified, { type: 'REPAIR_BIKE_FAULT', part: repairCase.faultyPart });
    expect(verified.activeActivity).toMatchObject({ income: 60, qualityBonus: 12, decisions: [{ correct: true, verified: true }] });
    expect(zhengBikeRepairSchema.safeParse(verified.activeActivity).success).toBe(true);
  });

  it('settles all three correct repairs once and round-trips the receipt schema', () => {
    let state = gameReducer(daytime(), { type: 'START_ZHENG_BIKE_REPAIR' });
    for (let step = 0; step < zhengRepairJobs; step += 1) {
      const run = state.activeActivity;
      if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') throw new Error('Repair ticket did not advance.');
      const currentCase = bikeRepairCaseFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
      state = gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part: currentCase.faultyPart });
    }
    expect(state.cash).toBe(3380);
    expect(state.dailyWorkIncome).toBe(180);
    expect(state.energy).toBe(85);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 180, qualityBonus: 36 });
    expect(zhengBikeRepairSchema.safeParse(state.activeActivity).success).toBe(true);
    expect(gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part: 'BATTERY' })).toBe(state);
  });

  it('continues an older saved shift and accepts its mixed-rate settlement', () => {
    let state: GameState = {
      ...daytime(115),
      cash: 3230,
      dailyWorkIncome: 30,
      workedToday: true,
      activeActivity: {
        id: 'ZHENG_BIKE_REPAIR' as const,
        day: 1,
        status: 'ACTIVE' as const,
        step: 1 as const,
        energySpent: 5,
        income: 30,
        qualityBonus: 12,
        tests: [],
        decisions: [{ step: 0 as const, repairedPart: 'BATTERY' as const, correct: true, qualityBonus: 12 }],
      },
    };
    expect(zhengBikeRepairSchema.safeParse(state.activeActivity).success).toBe(true);
    state = gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part: 'BRAKES' });
    state = gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part: 'CONTROLLER' });

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 150, qualityBonus: 36 });
    expect(zhengBikeRepairSchema.safeParse(state.activeActivity).success).toBe(true);
  });
});
