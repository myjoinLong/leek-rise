import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import type { BikeRepairPart } from '../zhengBikeRepairTypes';
import { zhengRepairReturnContextFor } from '../zhengBikeRepairMemory';
import { bikeRepairCaseFor } from './zhengBikeRepair';
import { gameStateSchema } from '../../save/schemas';
import { zhengBikeRepairSchema } from '../../save/zhengBikeRepairSchema';

function daytime(day: number): GameState {
  return { ...createInitialState(49), day, phase: 'DAYTIME', energy: 120, energyMax: 120 };
}

function finishShift(state: GameState, missFirstRepair: boolean): GameState {
  state = gameReducer(state, { type: 'START_ZHENG_BIKE_REPAIR' });
  for (let step = 0; step < 3; step += 1) {
    const run = state.activeActivity;
    if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') throw new Error('Repair shift did not start.');
    const repairCase = bikeRepairCaseFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const part = missFirstRepair && step === 0
      ? (['BATTERY', 'BRAKES', 'CONTROLLER'] as const).find((candidate) => candidate !== repairCase.faultyPart)!
      : repairCase.faultyPart;
    if (part === repairCase.faultyPart && repairCase.warrantyProofRequired) {
      state = gameReducer(state, { type: 'TEST_BIKE_PART', part });
    }
    state = gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part });
  }
  return state;
}

function nextDay(state: GameState, day: number): GameState {
  return {
    ...state,
    day,
    phase: 'DAYTIME',
    activeActivity: null,
    workedToday: false,
    dailyWorkIncome: 0,
    energy: 120,
  };
}

describe('Zheng repair memory branch', () => {
  it('brings back the customer after a missed repair and makes the new proof rule visible', () => {
    const previous = finishShift(daytime(8), true);
    const trace = previous.npcActivityMemory.zheng.lastTrace;
    const context = trace?.zhengRepairReturnContext;
    expect(context).toMatchObject({ previousDay: 8, kind: 'MISSED_REPAIR' });
    if (!context) throw new Error('A missed repair must leave a return context.');

    const next = nextDay(previous, 9);
    expect(zhengRepairReturnContextFor(next)).toEqual(context);
    const started = gameReducer(next, { type: 'START_ZHENG_BIKE_REPAIR' });
    const run = started.activeActivity;
    if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') throw new Error('Return shift did not start.');
    expect(run.returnContext).toEqual(context);
    const repairCase = bikeRepairCaseFor(run.day, 0, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    expect(repairCase.customerName).toBe(context.customerName);
    expect(repairCase.title).toContain('熟客返修');
    expect(repairCase.workshopLine).toContain('第 8 天');
    expect(repairCase.testLimit).toBe(1);
    expect(repairCase.warrantyProofRequired).toBe(true);
    expect(zhengBikeRepairSchema.safeParse(run).success).toBe(true);
    expect(gameStateSchema.safeParse(started).success).toBe(true);

    const withoutProof = gameReducer(started, { type: 'REPAIR_BIKE_FAULT', part: repairCase.faultyPart });
    expect(withoutProof.activeActivity).toMatchObject({
      decisions: [{ step: 0, correct: true, verified: false, qualityBonus: 0 }],
      income: 48,
    });
    expect(withoutProof.cash - started.cash).toBe(48);
  });

  it('awards the posted quality bonus when the returning repair is tested and correct', () => {
    const previous = finishShift(daytime(8), true);
    const started = gameReducer(nextDay(previous, 9), { type: 'START_ZHENG_BIKE_REPAIR' });
    const run = started.activeActivity;
    if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') throw new Error('Return shift did not start.');
    const repairCase = bikeRepairCaseFor(run.day, 0, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const tested = gameReducer(started, { type: 'TEST_BIKE_PART', part: repairCase.faultyPart });
    const repaired = gameReducer(tested, { type: 'REPAIR_BIKE_FAULT', part: repairCase.faultyPart });
    expect(repaired.activeActivity).toMatchObject({ income: 60, qualityBonus: 12, decisions: [{ verified: true, qualityBonus: 12 }] });
    expect(repaired.cash - started.cash).toBe(60);
  });

  it('does not create an unresolved return after a fully verified shift', () => {
    const successful = finishShift(daytime(8), false);
    expect(zhengRepairReturnContextFor(nextDay(successful, 9))).toBeNull();
  });

  it('does not infer a return from old memory or a case more than seven days old', () => {
    const base = daytime(9);
    const oldContext = {
      previousDay: 8,
      customerName: '旧车主',
      issueTitle: '旧工单',
      faultPart: 'BATTERY' as BikeRepairPart,
      kind: 'MISSED_REPAIR' as const,
    };
    const legacy = {
      ...base,
      npcActivityMemory: {
        ...base.npcActivityMemory,
        zheng: {
          completedRuns: 1,
          lastCompletedDay: 8,
          lastTrace: { activityId: 'ZHENG_BIKE_REPAIR' as const, choiceKeys: [], outcomeCode: null, cashDelta: 48, score: 0 },
          recentTraces: [],
        },
      },
    };
    expect(zhengRepairReturnContextFor(legacy)).toBeNull();
    expect(zhengRepairReturnContextFor({
      ...base,
      npcActivityMemory: {
        ...base.npcActivityMemory,
        zheng: {
          completedRuns: 1,
          lastCompletedDay: 1,
          lastTrace: { day: 1, activityId: 'ZHENG_BIKE_REPAIR', choiceKeys: [], outcomeCode: null, cashDelta: 48, score: 0, zhengRepairReturnContext: oldContext },
          recentTraces: [],
        },
      },
    })).toBeNull();
  });
});
