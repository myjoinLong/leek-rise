import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';

function start(overrides: Partial<GameState> = {}): GameState {
  return gameReducer({ ...createInitialState(), phase: 'DAYTIME', ...overrides }, { type: 'START_RISK_REPLAY' });
}

describe('sweeper position allocation replay', () => {
  it('starts without a payment, reserves the daily visit, and rejects unmet entry conditions', () => {
    const state = start({ energy: 12 });
    expect(state.activeActivity).toMatchObject({ status: 'ACTIVE', equity: 10000, step: 0 });
    expect(state.energy).toBe(12);
    expect(state.cash).toBe(3200);
    expect(state.riskReplayVisitedToday).toBe(true);
    for (const override of [{ energy: 11 }, { phase: 'TRADING' as const }, { riskReplayVisitedToday: true }]) {
      expect(start(override).activeActivity).toBeNull();
    }
  });

  it.each([NaN, Infinity, -1, 101, 0.5])('rejects invalid allocation %s without consuming energy', (allocation) => {
    const state = start();
    expect(gameReducer(state, { type: 'COMMIT_RISK_ALLOCATION', allocation })).toBe(state);
  });

  it('compounds virtual positions, discloses stress breaches, and leaves real economy untouched', () => {
    let state = start();
    const real = { cash: state.cash, debt: state.debt, stocks: state.stocks, marketIntel: state.marketIntel,
      dailyFees: state.dailyFees, workedToday: state.workedToday };
    for (const allocation of [25, 100, 0]) state = gameReducer(state, { type: 'COMMIT_RISK_ALLOCATION', allocation });
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', step: 3, equity: 9338, energySpent: 12, respectedBudget: 2,
      decisions: [
        { invested: 2500, stressLoss: 300, withinBudget: true, pnl: 150, fullPositionPnl: 600 },
        { invested: 10150, stressLoss: 1015, withinBudget: false, pnl: -812 },
        { invested: 0, stressLoss: 0, withinBudget: true, pnl: 0 },
      ] });
    expect(state.energy).toBe(88);
    expect(state).toMatchObject(real);
    expect(gameReducer(state, { type: 'COMMIT_RISK_ALLOCATION', allocation: 100 })).toBe(state);
    expect(gameReducer(state, { type: 'ABANDON_RISK_REPLAY' })).toBe(state);
    const returned = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(returned.activeActivity).toBeNull();
    expect(gameReducer(returned, { type: 'START_RISK_REPLAY' })).toBe(returned);
  });

  it('supports cash as a valid position and treats risk discipline separately from profit', () => {
    let cash = start();
    let full = start();
    for (let round = 0; round < 3; round += 1) {
      cash = gameReducer(cash, { type: 'COMMIT_RISK_ALLOCATION', allocation: 0 });
      full = gameReducer(full, { type: 'COMMIT_RISK_ALLOCATION', allocation: 100 });
    }
    expect(cash.activeActivity).toMatchObject({ equity: 10000, respectedBudget: 3 });
    expect(full.activeActivity).toMatchObject({ equity: 9947.04, respectedBudget: 0 });
    const one = gameReducer(start(), { type: 'COMMIT_RISK_ALLOCATION', allocation: 100 });
    expect(one.activeActivity).toMatchObject({ equity: 10600, decisions: [{ withinBudget: false, pnl: 600 }] });
  });

  it('locks peripheral actions, retains spent energy on exit, and resets visits on a real new day', () => {
    const begun = start();
    const state = gameReducer(begun, { type: 'COMMIT_RISK_ALLOCATION', allocation: 20 });
    for (const action of [{ type: 'ADVANCE_PHASE' }, { type: 'ADVANCE_TICK' }, { type: 'START_DELIVERY_RUN' },
      { type: 'CHANGE_PHASE', phase: 'NIGHT' }, { type: 'RETURN_FROM_ACTIVITY' }] as const) {
      expect(gameReducer(state, action)).toBe(state);
    }
    const exited = gameReducer(state, { type: 'ABANDON_RISK_REPLAY' });
    expect(exited.energy).toBe(96);
    expect(exited.cash).toBe(3200);
    expect(gameReducer(exited, { type: 'START_RISK_REPLAY' })).toBe(exited);
    let next = exited;
    for (let phase = 0; phase < 4; phase += 1) next = gameReducer(next, { type: 'ADVANCE_PHASE' });
    expect(next.day).toBe(2);
    expect(next.phase).toBe('DAYTIME');
    expect(next.riskReplayVisitedToday).toBe(false);
    expect(gameReducer(next, { type: 'START_RISK_REPLAY' }).activeActivity).toMatchObject({ step: 0 });
  });
});
