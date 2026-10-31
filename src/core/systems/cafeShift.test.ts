import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import { cafeChoicesFor, cafeChoicesForScenario, cafeCustomerFor, cafeScenarioFor, correctCafeChoiceFor, minimumCafeShiftEnergy } from './cafeShift';
import type { CafeCustomerId } from '../cafeShiftTypes';
import { cafeShiftSchema } from '../../save/cafeShiftSchema';

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

describe('Su Jie cafe shift', () => {
  it('provides a deterministic customer mix without repeating a complete encounter in the first 30 days', () => {
    const signatures = new Set<string>();
    for (let day = 1; day <= 30; day += 1) {
      const dailyCustomers = new Set<CafeCustomerId>();
      for (const step of [0, 1, 2] as const) {
        const scenario = cafeScenarioFor(day, step, 2, 47);
        const signature = `${scenario.customer}/${scenario.name}/${scenario.request}`;
        expect(signatures.has(signature)).toBe(false);
        signatures.add(signature);
        dailyCustomers.add(scenario.customer);
        expect(cafeChoicesFor(scenario.customer)).toContain(scenario.correctChoice);
        expect(cafeScenarioFor(day, step, 2, 47)).toEqual(scenario);
      }
      expect(dailyCustomers.size).toBe(3);
    }
    expect(signatures.size).toBe(90);
  });

  it('changes the shuffled schedule with campaign seed while remaining repeatable', () => {
    const first = cafeScenarioFor(1, 0, 2, 47);
    const sameSeed = cafeScenarioFor(1, 0, 2, 47);
    const otherSeed = cafeScenarioFor(1, 0, 2, 48);
    expect(sameSeed).toEqual(first);
    expect(otherSeed.id).toBe(first.id);
    expect(`${otherSeed.customer}/${otherSeed.name}/${otherSeed.request}`).not.toBe(`${first.customer}/${first.name}/${first.request}`);
  });

  it('keeps repeated archetypes distinct with a new return context after the first chapter', () => {
    const firstChapter = cafeScenarioFor(1, 0, 2, 47);
    const nextCycle = cafeScenarioFor(31, 0, 2, 47);
    expect(`${nextCycle.name}/${nextCycle.request}`).not.toBe(`${firstChapter.name}/${firstChapter.request}`);
  });
  it('keeps legacy active shifts on their original stable customer and answer rules', () => {
    expect(cafeCustomerFor(4, 0, 1)).toBe('RIDER');
    expect(cafeScenarioFor(4, 0, 1)).toMatchObject({
      name: '赶单骑手',
      correctChoice: correctCafeChoiceFor('RIDER'),
    });
    expect(cafeShiftSchema.safeParse({
      id: 'SUJIE_CAFE_SHIFT', day: 4, status: 'ACTIVE', step: 0,
      decisions: [], energySpent: 0, tips: 0,
    }).success).toBe(true);
  });

  it('pays transparent base wage and a capped tip for each correct service', () => {
    const state = completeShift([true, true, true]);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', basePay: 72, tips: 105, income: 177, energySpent: 15 });
    expect(state.cash).toBe(3377);
    expect(state.dailyWorkIncome).toBe(177);
    expect(state.energy).toBe(105);
    expect(state.workedToday).toBe(true);
    expect(cafeShiftSchema.safeParse(state.activeActivity).success).toBe(true);
  });

  it('keeps base wage after mistakes and charges only the per-order energy', () => {
    const state = completeShift([false, true, false]);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', basePay: 72, tips: 35, income: 107 });
    expect(state.cash).toBe(3307);
    expect(state.dailyWorkIncome).toBe(107);
  });

  it('requires enough energy and prevents a second completed work shift', () => {
    const lowEnergy = { ...daytime(), energy: minimumCafeShiftEnergy - 1 };
    expect(gameReducer(lowEnergy, { type: 'START_CAFE_SHIFT' })).toBe(lowEnergy);
    const completed = completeShift([true, true, true]);
    const hub = gameReducer(completed, { type: 'RETURN_FROM_ACTIVITY' });
    expect(gameReducer(hub, { type: 'START_CAFE_SHIFT' })).toBe(hub);
    expect(hub.workedToday).toBe(true);
  });

  it('keeps spent energy but pays no wage when the player leaves early', () => {
    const start = gameReducer(daytime(), { type: 'START_CAFE_SHIFT' });
    const run = start.activeActivity;
    if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Cafe shift did not start.');
    const scenario = cafeScenarioFor(start.day, 0, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const served = gameReducer(start, { type: 'SERVE_CAFE_ORDER', choice: scenario.correctChoice });
    const hub = gameReducer(served, { type: 'ABANDON_CAFE_SHIFT' });
    expect(hub.activeActivity).toBeNull();
    expect(hub.energy).toBe(start.energy - 5);
    expect(hub.cash).toBe(start.cash);
    expect(hub.dailyWorkIncome).toBe(0);
    expect(hub.workedToday).toBe(false);
  });

  it('continues to accept legacy saved tip rates while a shift is in progress', () => {
    const legacyShift = {
      id: 'SUJIE_CAFE_SHIFT', day: 4, status: 'ACTIVE', step: 1,
      decisions: [{ step: 0, customer: 'RIDER', choice: 'BLACK_COFFEE', correct: true }],
      energySpent: 5, tips: 16,
    };
    expect(cafeShiftSchema.safeParse(legacyShift).success).toBe(true);
  });

  it('records the wage in the shared night work ledger exactly once', () => {
    const state = completeShift([true, true, true]);
    const hub = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    const trading = gameReducer(hub, { type: 'ADVANCE_PHASE' });
    const night = gameReducer(trading, { type: 'ADVANCE_PHASE' });
    expect(night.dailyWorkIncome).toBe(177);
    expect(night.phase).toBe('NIGHT');
  });
});
