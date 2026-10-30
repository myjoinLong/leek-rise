import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { factoryInspectionForDay, factoryShiftMinimumEnergy } from './factoryShift';

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
  it('pays the disclosed base wage and correct-check bonuses once after three stations', () => {
    let state = gameReducer(daytime(), { type: 'START_FACTORY_SHIFT' });
    const startingCash = state.cash;

    for (let step = 0; step < 3; step += 1) {
      const inspection = factoryInspectionForDay(state.day, step);
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: inspection.correctChoice });
    }

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 120, qualityBonus: 60, energySpent: 19 });
    expect(state.cash).toBe(startingCash + 120);
    expect(state.dailyWorkIncome).toBe(120);
    expect(state.energy).toBe(101);
    expect(state.workedToday).toBe(true);

    const hub = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(hub.activeActivity).toBeNull();
    expect(gameReducer(hub, { type: 'START_FACTORY_SHIFT' })).toBe(hub);
  });

  it('reserves minimum energy for the remaining stations and preserves base pay after mistakes', () => {
    let state = gameReducer(daytime({ energy: factoryShiftMinimumEnergy }), { type: 'START_FACTORY_SHIFT' });
    const blockedRework = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: 'REWORK' });
    expect(blockedRework).toBe(state);

    for (let step = 0; step < 3; step += 1) {
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: 'PASS' });
    }

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 100, qualityBonus: 40, energySpent: 15 });
    expect(state.energy).toBe(0);
    expect(state.cash).toBe(3300);
    expect(state.dailyWorkIncome).toBe(100);
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
