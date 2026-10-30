import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { minimumDeliveryEnergy } from './deliveryRun';

function daytime(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), phase: 'DAYTIME', energy: 120, energyMax: 120, ...overrides };
}

describe('delivery run exit and settlement', () => {
  it('settles only completed orders when the player ends the route early', () => {
    let state = gameReducer(daytime(), { type: 'START_DELIVERY_RUN' });
    state = gameReducer(state, { type: 'CHOOSE_DELIVERY_ROUTE', choice: 'ALLEY' });
    expect(state.cash).toBe(3200);
    expect(state.dailyWorkIncome).toBe(0);
    expect(state.activeActivity).toMatchObject({ status: 'ACTIVE', totalIncome: 62, stopIndex: 1 });

    state = gameReducer(state, { type: 'ABANDON_DELIVERY_RUN' });

    expect(state).toMatchObject({ cash: 3262, dailyWorkIncome: 62, energy: 108, workedToday: true, activeActivity: null });
    expect(gameReducer(state, { type: 'ABANDON_DELIVERY_RUN' })).toBe(state);
    expect(gameReducer(state, { type: 'START_CAFE_SHIFT' })).toBe(state);
  });

  it('allows leaving before the first order without cost or consuming the work day', () => {
    let state = gameReducer(daytime(), { type: 'START_DELIVERY_RUN' });
    state = gameReducer(state, { type: 'ABANDON_DELIVERY_RUN' });

    expect(state).toMatchObject({ cash: 3200, dailyWorkIncome: 0, energy: 120, workedToday: false, activeActivity: null });
    expect(gameReducer(state, { type: 'START_CAFE_SHIFT' }).activeActivity?.id).toBe('SUJIE_CAFE_SHIFT');
  });

  it('pays a completed route once and does not let an exit action alter its receipt', () => {
    let state = gameReducer(daytime(), { type: 'START_DELIVERY_RUN' });
    for (const choice of ['MAIN', 'ALLEY', 'STEADY'] as const) {
      state = gameReducer(state, { type: 'CHOOSE_DELIVERY_ROUTE', choice });
    }
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', totalIncome: 108 });
    expect(state.cash).toBe(3308);
    expect(state.dailyWorkIncome).toBe(108);

    const unchanged = gameReducer(state, { type: 'ABANDON_DELIVERY_RUN' });
    expect(unchanged).toBe(state);
    expect(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }).cash).toBe(3308);
  });

  it('requires enough energy to finish all stops and preserves the minimum reserve', () => {
    const lowEnergy = daytime({ energy: minimumDeliveryEnergy - 1 });
    expect(gameReducer(lowEnergy, { type: 'START_DELIVERY_RUN' })).toBe(lowEnergy);

    let state = gameReducer(daytime({ energy: minimumDeliveryEnergy }), { type: 'START_DELIVERY_RUN' });
    const blockedRoute = gameReducer(state, { type: 'CHOOSE_DELIVERY_ROUTE', choice: 'ALLEY' });
    expect(blockedRoute).toBe(state);
    state = gameReducer(state, { type: 'CHOOSE_DELIVERY_ROUTE', choice: 'MAIN' });
    expect(state.energy).toBe(20);
    expect(state.activeActivity?.id).toBe('WANG_DELIVERY');
  });
});
