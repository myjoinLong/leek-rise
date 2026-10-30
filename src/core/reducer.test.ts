import { describe, expect, it } from 'vitest';
import { gameReducer } from './reducer';
import { createInitialState } from './state';
import { factoryInspectionForDay } from './systems/factoryShift';
import type { GameState } from './types';

function netWorth(state: GameState): number {
  const portfolio = Object.values(state.stocks).reduce(
    (total, stock) => total + (stock.holding?.shares ?? 0) * stock.price,
    0,
  );
  return Number((state.cash + portfolio - state.debt).toFixed(2));
}

function settlementState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), phase: 'NIGHT', cash: 3200, debt: 18000, ...overrides };
}

describe('debt repayment', () => {
  it('reduces cash and principal by the same amount without changing net worth', () => {
    const state = settlementState();
    const next = gameReducer(state, { type: 'REPAY_DEBT', amount: 1250.75 });

    expect(next.cash).toBe(1949.25);
    expect(next.debt).toBe(16749.25);
    expect(netWorth(next)).toBe(netWorth(state));
  });

  it('allows paying the remaining principal exactly', () => {
    const state = settlementState({ cash: 5000, debt: 5000, debtInterestGraceWeeksRemaining: 2, debtRatePlanWeeksRemaining: 4 });
    const next = gameReducer(state, { type: 'REPAY_DEBT', amount: 5000 });

    expect(next.cash).toBe(0);
    expect(next.debt).toBe(0);
    expect(next.debtInterestGraceWeeksRemaining).toBe(0);
    expect(next.debtRatePlanWeeksRemaining).toBe(0);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 3200.01, 18000.01])(
    'rejects invalid or unaffordable amount %s without changing state',
    (amount) => {
      const state = settlementState();
      expect(gameReducer(state, { type: 'REPAY_DEBT', amount })).toBe(state);
    },
  );

  it('only accepts repayment during night settlement', () => {
    const state = settlementState({ phase: 'DAYTIME' });
    expect(gameReducer(state, { type: 'REPAY_DEBT', amount: 100 })).toBe(state);
  });
});

describe('day-30 debt crisis', () => {
  it('enters a persistent crisis stage with debt and continues the saved day loop', () => {
    let state: GameState = { ...createInitialState(), day: 30, phase: 'TRADING', cash: 5000, debt: 1000 };
    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(state.phase).toBe('NIGHT');
    expect(state.debtCrisisStarted).toBe(true);

    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(state.day).toBe(31);
    expect(state.phase).toBe('PRE_MARKET');
    expect(state.debtCrisisStarted).toBe(true);
  });

  it('clears the crisis flag when the player fully repays the remaining debt', () => {
    let state: GameState = { ...createInitialState(), day: 30, phase: 'TRADING', cash: 25000, debt: 1000 };
    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    state = gameReducer(state, { type: 'REPAY_DEBT', amount: 1000 });
    expect(state.debt).toBe(0);
    expect(state.debtCrisisStarted).toBe(false);
  });
});

describe('NPC activity lifecycle', () => {
  it('settles delivery income only after completing the route, then returns to the hub', () => {
    let state: GameState = { ...createInitialState(), phase: 'DAYTIME' };
    state = gameReducer(state, { type: 'START_DELIVERY_RUN' });
    expect(state.activeActivity?.id).toBe('WANG_DELIVERY');
    expect(state.cash).toBe(3200);

    for (const choice of ['ALLEY', 'MAIN', 'STEADY'] as const) {
      state = gameReducer(state, { type: 'CHOOSE_DELIVERY_ROUTE', choice });
    }

    expect(state.activeActivity?.id).toBe('WANG_DELIVERY');
    expect(state.activeActivity?.status).toBe('RESULT');
    expect(state.cash).toBe(3365);
    expect(state.dailyWorkIncome).toBe(165);
    expect(state.energy).toBe(66);
    expect(state.workedToday).toBe(true);

    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(state.activeActivity).toBeNull();
    expect(state.phase).toBe('DAYTIME');
  });

  it('records Longge findings from the live stock phase and limits the visit to once per day', () => {
    let state: GameState = { ...createInitialState(), phase: 'DAYTIME' };
    state = gameReducer(state, { type: 'START_LONGGE_CHAT' });
    expect(state.activeActivity?.id).toBe('LONGGE_CHAT');
    if (state.activeActivity?.id !== 'LONGGE_CHAT') throw new Error('Longge activity did not start.');
    expect(state.activeActivity.caseType).toBe('ACCUMULATION');

    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'VERIFY_ORIGIN' });
    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'READ_TAPE' });
    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'CHECK_NOTICE' });
    state = gameReducer(state, { type: 'CONCLUDE_LONGGE_CHAT', conclusion: 'INSUFFICIENT' });

    expect(state.activeActivity?.id).toBe('LONGGE_CHAT');
    expect(state.activeActivity?.status).toBe('RESULT');
    expect(state.marketIntel?.day).toBe(state.day);
    expect(state.marketIntel?.stockId).toBe(state.selectedStockId);
    expect(state.longgeVisitedToday).toBe(true);

    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    const afterRepeatAttempt = gameReducer(state, { type: 'START_LONGGE_CHAT' });
    expect(afterRepeatAttempt).toBe(state);
  });
});

describe('factory shift activity', () => {
  it('settles the disclosed base wage and correct-check bonus once per day', () => {
    let state: GameState = { ...createInitialState(), phase: 'DAYTIME', gender: 'FEMALE', energy: 100, energyMax: 100 };
    const startingCash = state.cash;
    state = gameReducer(state, { type: 'START_FACTORY_SHIFT' });
    expect(state.activeActivity?.id).toBe('WANG_FACTORY');
    expect(gameReducer(state, { type: 'ADVANCE_PHASE' })).toBe(state);
    for (let step = 0; step < 3; step += 1) {
      state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: factoryInspectionForDay(state.day, step).correctChoice });
    }
    expect(state.activeActivity).toMatchObject({ id: 'WANG_FACTORY', status: 'RESULT', income: 120, qualityBonus: 60 });
    expect(state.cash - startingCash).toBe(120);
    expect(state.dailyWorkIncome).toBe(120);
    expect(state.energy).toBe(81);
    expect(state.workedToday).toBe(true);
    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(gameReducer(state, { type: 'START_DELIVERY_RUN' })).toBe(state);
    expect(gameReducer(state, { type: 'START_FACTORY_SHIFT' })).toBe(state);
  });

  it('reserves enough energy for later checks and guarantees base pay after mistakes', () => {
    let state: GameState = { ...createInitialState(), phase: 'DAYTIME', energy: 15 };
    state = gameReducer(state, { type: 'START_FACTORY_SHIFT' });
    expect(gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: 'REWORK' })).toBe(state);
    state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: 'PASS' });
    state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: 'PASS' });
    state = gameReducer(state, { type: 'CHOOSE_FACTORY_CHECK', choice: 'PASS' });
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: 100, qualityBonus: 40 });
    expect(state.cash).toBe(3300);
    expect(state.energy).toBe(0);
  });
});

describe('live operations activity', () => {
  it('settles a distinct revenue and reputation result and locks re-entry for the day', () => {
    let state = gameReducer(createInitialState(), { type: 'SELECT_CHARACTER', gender: 'FEMALE' });
    state = gameReducer(state, { type: 'CHANGE_PHASE', phase: 'DAYTIME' });
    const startingCash = state.cash;
    state = gameReducer(state, { type: 'START_STREAM_RUN' });
    expect(state.activeActivity?.id).toBe('XIAOLIAN_STREAM');
    expect(state.streamedToday).toBe(true);

    state = gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice: 'HYPE_CLAIM' });
    state = gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice: 'REPEAT_CTA' });
    state = gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice: 'FAKE_SCARCITY' });

    expect(state.activeActivity?.id).toBe('XIAOLIAN_STREAM');
    expect(state.activeActivity?.status).toBe('RESULT');
    expect(state.energy).toBe(85);
    expect(state.cash - startingCash).toBe(210);
    expect(state.dailyStreamIncome).toBe(210);
    expect(state.fame).toBe(29);

    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(gameReducer(state, { type: 'START_STREAM_RUN' })).toBe(state);
  });

  it('rejects an underfunded start and a choice from a later segment', () => {
    let state = gameReducer(createInitialState(), { type: 'SELECT_CHARACTER', gender: 'MALE' });
    state = gameReducer(state, { type: 'CHANGE_PHASE', phase: 'DAYTIME' });
    state = { ...state, energy: 14 };
    expect(gameReducer(state, { type: 'START_STREAM_RUN' })).toBe(state);

    state = { ...state, energy: 120 };
    state = gameReducer(state, { type: 'START_STREAM_RUN' });
    expect(gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice: 'ANSWER_QUESTIONS' })).toBe(state);
  });
});
