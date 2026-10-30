import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { minimumChartLessonEnergy } from './chartLesson';

function start(overrides: Partial<GameState> = {}): GameState {
  return gameReducer({ ...createInitialState(), phase: 'DAYTIME', ...overrides }, { type: 'START_CHART_LESSON' });
}

describe('K-line reading lesson', () => {
  it('trains through three choices and awards only a low-confidence historical clue', () => {
    let state = start({ energy: 12 });
    const cash = state.cash;
    expect(state.activeActivity).toMatchObject({ id: 'BODHISATTVA_CHART_LESSON', status: 'ACTIVE', step: 0 });
    expect(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_VOLUME' })).toBe(state);

    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'RIDE_HIGHER_LOWS' });
    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_VOLUME' });
    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_RANGE_BREAK' });

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', score: 3, energySpent: 9 });
    expect(state.energy).toBe(3);
    expect(state.cash).toBe(cash);
    expect(state.marketIntel).toMatchObject({
      day: state.day, stockId: state.selectedStockId, npcName: 'K线菩萨', confidence: 'LOW',
    });
    expect(state.marketIntel?.message).toContain('不保证延续');
    expect(gameReducer(state, { type: 'ADVANCE_TICK' })).toBe(state);
  });

  it('does not issue a market clue for a poor score and prevents repeating the lesson that day', () => {
    let state = start();
    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'CHASE_LAST_SPIKE' });
    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'BUY_ANY_BREAKOUT' });
    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'DOUBLE_POSITION' });
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', score: 0, intel: null });
    expect(state.marketIntel).toBeNull();

    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    expect(state.chartLessonVisitedToday).toBe(true);
    expect(gameReducer(state, { type: 'START_CHART_LESSON' })).toBe(state);
    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(state.day).toBe(2);
    expect(state.chartLessonVisitedToday).toBe(false);
    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(gameReducer(state, { type: 'START_CHART_LESSON' }).activeActivity?.id).toBe('BODHISATTVA_CHART_LESSON');
  });

  it('requires enough energy to finish and keeps the daily limit after leaving early', () => {
    const tired = { ...createInitialState(), phase: 'DAYTIME' as const, energy: minimumChartLessonEnergy - 1 };
    expect(gameReducer(tired, { type: 'START_CHART_LESSON' })).toBe(tired);

    let state = start({ energy: minimumChartLessonEnergy });
    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'RIDE_HIGHER_LOWS' });
    const energyAfterChoice = state.energy;
    state = gameReducer(state, { type: 'ABANDON_CHART_LESSON' });
    expect(state.energy).toBe(energyAfterChoice);
    expect(state.activeActivity).toBeNull();
    expect(state.chartLessonVisitedToday).toBe(true);
    expect(gameReducer(state, { type: 'START_CHART_LESSON' })).toBe(state);
  });
});
