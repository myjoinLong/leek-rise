import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import { cafeChoicesFor, cafeCustomerFor, correctCafeChoiceFor, minimumCafeShiftEnergy } from './cafeShift';

function daytime() {
  return { ...createInitialState(17), phase: 'DAYTIME' as const, gender: 'MALE' as const, energy: 120, energyMax: 120 };
}

function completeShift(answers: readonly boolean[]) {
  let state = gameReducer(daytime(), { type: 'START_CAFE_SHIFT' });
  for (let step = 0; step < 3; step += 1) {
    const customer = cafeCustomerFor(state.day, step as 0 | 1 | 2);
    const correct = correctCafeChoiceFor(customer);
    const wrong = cafeChoicesFor(customer).find((choice) => choice !== correct)!;
    state = gameReducer(state, {
      type: 'SERVE_CAFE_ORDER',
      choice: answers[step] === true ? correct : wrong,
    });
  }
  return state;
}

describe('Su Jie cafe shift', () => {
  it('pays transparent base wage and a capped tip for each correct service', () => {
    const state = completeShift([true, true, true]);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', basePay: 72, tips: 48, income: 120, energySpent: 15 });
    expect(state.cash).toBe(3320);
    expect(state.dailyWorkIncome).toBe(120);
    expect(state.energy).toBe(105);
    expect(state.workedToday).toBe(true);
  });

  it('keeps base wage after mistakes and charges only the per-order energy', () => {
    const state = completeShift([false, true, false]);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', basePay: 72, tips: 16, income: 88 });
    expect(state.cash).toBe(3288);
    expect(state.dailyWorkIncome).toBe(88);
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
    const customer = cafeCustomerFor(start.day, 0);
    const served = gameReducer(start, { type: 'SERVE_CAFE_ORDER', choice: correctCafeChoiceFor(customer) });
    const hub = gameReducer(served, { type: 'ABANDON_CAFE_SHIFT' });
    expect(hub.activeActivity).toBeNull();
    expect(hub.energy).toBe(start.energy - 5);
    expect(hub.cash).toBe(start.cash);
    expect(hub.dailyWorkIncome).toBe(0);
    expect(hub.workedToday).toBe(false);
  });

  it('records the wage in the shared night work ledger exactly once', () => {
    const state = completeShift([true, true, true]);
    const hub = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    const trading = gameReducer(hub, { type: 'ADVANCE_PHASE' });
    const night = gameReducer(trading, { type: 'ADVANCE_PHASE' });
    expect(night.dailyWorkIncome).toBe(120);
    expect(night.phase).toBe('NIGHT');
  });
});
