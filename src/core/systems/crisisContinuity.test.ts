import { describe, expect, it } from 'vitest';
import { gameStateSchema, saveEnvelopeSchema, saveVersion } from '../../save/schemas';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { factoryInspectionForDay } from './factoryShift';

function advance(state: GameState, count: number): GameState {
  let next = state;
  for (let index = 0; index < count; index += 1) next = gameReducer(next, { type: 'ADVANCE_PHASE' });
  return next;
}

describe('day-30 crisis continuity', () => {
  it('exits the retained crisis after debt is reduced to the confirmed first-chapter limit', () => {
    let state: GameState = {
      ...createInitialState(),
      day: 31,
      phase: 'NIGHT',
      cash: 500,
      debt: 3500,
      debtCrisisStarted: true,
    };

    state = gameReducer(state, { type: 'REPAY_DEBT', amount: 400 });
    expect(state).toMatchObject({ cash: 100, debt: 3100, debtCrisisStarted: true });

    state = gameReducer(state, { type: 'REPAY_DEBT', amount: 100 });
    expect(state).toMatchObject({ cash: 0, debt: 3000, debtCrisisStarted: false, debtCrisisRecoveryDay: 31 });

    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(state).toMatchObject({ day: 32, phase: 'PRE_MARKET', debtCrisisStarted: false, debtCrisisRecoveryDay: 31 });
  });

  it('keeps the save playable through crisis, an earned negotiation, night repayment, and day 32', () => {
    let state: GameState = { ...createInitialState(), day: 29, phase: 'TRADING', gender: 'MALE', energy: 120, energyMax: 120 };
    state = advance(state, 2);
    expect(state).toMatchObject({ day: 30, phase: 'PRE_MARKET', debtCrisisStarted: false });

    state = advance(state, 3);
    expect(state).toMatchObject({ day: 30, phase: 'NIGHT', debtCrisisStarted: false, debt: 18000 });

    state = advance(state, 1);
    expect(state).toMatchObject({ day: 31, phase: 'PRE_MARKET', debtCrisisStarted: true });
    state = advance(state, 1);
    expect(state).toMatchObject({ day: 31, phase: 'DAYTIME', debtCrisisStarted: true });
    state = gameReducer(state, { type: 'START_FACTORY_SHIFT' });
    for (let step = 0; step < 3; step += 1) {
      const run = state.activeActivity;
      if (!run || run.id !== 'WANG_FACTORY') throw new Error('Factory run was not started.');
      const inspection = factoryInspectionForDay(state.day, step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: inspection.correctChoice });
    }
    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(state.dailyWorkIncome).toBe(120);

    state = gameReducer(state, { type: 'START_JIUGE_NEGOTIATION' });
    state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });
    state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' });
    state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'ASK_INTEREST_GRACE' });
    expect(state).toMatchObject({ debtNegotiationCompleted: true, debtInterestGraceWeeksRemaining: 1, debtCrisisStarted: true });
    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });

    state = advance(state, 2);
    state = gameReducer(state, { type: 'REPAY_DEBT', amount: 100 });
    expect(state).toMatchObject({ day: 31, phase: 'NIGHT', cash: 3220, debt: 17900, debtCrisisStarted: true });

    const savedEnvelope = saveEnvelopeSchema.parse({ version: saveVersion, savedAt: 1, state });
    const restored = gameStateSchema.parse(savedEnvelope.state);
    expect(restored).toMatchObject({ debtCrisisStarted: true, debtNegotiationCompleted: true, debtInterestGraceWeeksRemaining: 1 });
    state = advance(restored, 1);
    expect(state).toMatchObject({ day: 32, phase: 'PRE_MARKET', debtCrisisStarted: true, debt: 17900 });
    state = advance(state, 1);
    expect(gameReducer(state, { type: 'START_FACTORY_SHIFT' }).activeActivity?.id).toBe('WANG_FACTORY');
  });
});
