import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import { bikeRepairCanTest, bikeRepairCaseFor, zhengRepairMinimumEnergy } from './zhengBikeRepair';
import { zhengBikeRepairSchema } from '../../save/zhengBikeRepairSchema';

function daytime(energy = 100) {
  return { ...createInitialState(), phase: 'DAYTIME' as const, energy, energyMax: 120 };
}

describe('Zheng bike repair activity', () => {
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
    expect(gameReducer(state, { type: 'START_CAFE_SHIFT' })).toBe(state);
    expect(gameReducer(state, { type: 'ABANDON_ZHENG_BIKE_REPAIR' }).workedToday).toBe(true);
  });

  it('charges optional diagnostics once and protects energy reserved for the remaining repairs', () => {
    let state = gameReducer(daytime(17), { type: 'START_ZHENG_BIKE_REPAIR' });
    const run = state.activeActivity;
    if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') throw new Error('Repair activity did not start.');
    expect(bikeRepairCanTest(state, run, 'BATTERY')).toBe(true);
    state = gameReducer(state, { type: 'TEST_BIKE_PART', part: 'BATTERY' });
    expect(state.energy).toBe(15);
    expect(state.activeActivity).toMatchObject({ tests: [{ step: 0, part: 'BATTERY', foundFault: true }], energySpent: 2 });
    expect(gameReducer(state, { type: 'TEST_BIKE_PART', part: 'BATTERY' })).toBe(state);
    expect(gameReducer(state, { type: 'TEST_BIKE_PART', part: 'BRAKES' })).toBe(state);
    expect(zhengBikeRepairSchema.safeParse(state.activeActivity).success).toBe(true);
  });

  it('pays base wage on a wrong repair without deducting cash or adding debt', () => {
    let state = gameReducer(daytime(), { type: 'START_ZHENG_BIKE_REPAIR' });
    state = gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part: 'BRAKES' });
    expect(state.cash).toBe(3218);
    expect(state.debt).toBe(18000);
    expect(state.dailyWorkIncome).toBe(18);
    expect(state.energy).toBe(95);
    expect(state.activeActivity).toMatchObject({ income: 18, qualityBonus: 0, decisions: [{ correct: false, qualityBonus: 0 }] });
  });

  it('settles all three correct repairs once and round-trips the receipt schema', () => {
    let state = gameReducer(daytime(), { type: 'START_ZHENG_BIKE_REPAIR' });
    for (const part of ['BATTERY', 'BRAKES', 'CONTROLLER'] as const) {
      state = gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part });
    }
    expect(state.cash).toBe(3290);
    expect(state.dailyWorkIncome).toBe(90);
    expect(state.energy).toBe(85);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 90, qualityBonus: 36 });
    expect(zhengBikeRepairSchema.safeParse(state.activeActivity).success).toBe(true);
    expect(gameReducer(state, { type: 'REPAIR_BIKE_FAULT', part: 'BATTERY' })).toBe(state);
  });
});
