import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import { chartLessonScenarioAt, chartLessonScenarioCount, chartLessonScenarioIndex } from '../chartLessonScenarios';
import type { GameState } from '../types';
import { chartLessonPromptStep, getChartLessonSample, minimumChartLessonEnergy } from './chartLesson';

function start(overrides: Partial<GameState> = {}): GameState {
  return gameReducer({ ...createInitialState(), phase: 'DAYTIME', ...overrides }, { type: 'START_CHART_LESSON' });
}

describe('K-line reading lesson', () => {
  it('cycles through a deterministic 2,700-card training deck without repeats', () => {
    const seed = 47;
    const firstSequence = Array.from({ length: 32 }, (_, index) => chartLessonScenarioIndex(index + 1, seed));
    expect(Array.from({ length: 32 }, (_, index) => chartLessonScenarioIndex(index + 1, seed))).toEqual(firstSequence);
    expect(Array.from({ length: 32 }, (_, index) => chartLessonScenarioIndex(index + 1, seed + 1))).not.toEqual(firstSequence);

    const signatures = new Set<string>();
    for (let day = 1; day <= chartLessonScenarioCount; day += 1) {
      const scenario = chartLessonScenarioAt(chartLessonScenarioIndex(day, seed));
      const signature = JSON.stringify([scenario.headline, scenario.brief, scenario.volatilityLabel, scenario.coachingLine]);
      expect(signatures.has(signature)).toBe(false);
      signatures.add(signature);
    }
    expect(signatures.size).toBe(chartLessonScenarioCount);

    const baseSample = getChartLessonSample(0);
    expect(getChartLessonSample(0, firstSequence[0]!).prices).not.toEqual(baseSample.prices);
    expect(getChartLessonSample(0, firstSequence[1]!).prices).not.toEqual(getChartLessonSample(0, firstSequence[0]!).prices);
    expect(chartLessonScenarioIndex(chartLessonScenarioCount + 1, seed)).toBe(chartLessonScenarioIndex(1, seed));
  });

  it('keeps the live signal categories intact and carries last score into the next lesson', () => {
    const initial = createInitialState();
    const memory = initial.npcActivityMemory.bodhisattva;
    const state = start({
      npcActivityMemory: {
        ...initial.npcActivityMemory,
        bodhisattva: {
          ...memory,
          completedRuns: 1,
          lastCompletedDay: 1,
          lastTrace: {
            day: 1,
            activityId: 'BODHISATTVA_CHART_LESSON',
            choiceKeys: ['RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME', 'DOUBLE_POSITION'],
            outcomeCode: null,
            cashDelta: null,
            score: 2,
            scenarioVersion: 2,
            scenarioSeed: 4,
            scenarioIndex: 0,
          },
        },
      },
    });
    expect(state.activeActivity).toMatchObject({ scenarioVersion: 2, priorScore: 2 });

    for (let index = 0; index < chartLessonScenarioCount; index += 37) {
      const higherLows = getChartLessonSample(0, index).prices;
      expect(higherLows[2]!).toBeLessThan(higherLows[1]!);
      expect(higherLows[2]!).toBeLessThan(higherLows[3]!);
      expect(higherLows[2]!).toBeLessThan(higherLows[4]!);
      expect(higherLows[4]).toBeLessThan(higherLows[6]!);

      const weakBreakout = getChartLessonSample(1, index).prices;
      expect(weakBreakout[2]!).toBeLessThan(weakBreakout[4]!);
      expect(weakBreakout[4]).toBeLessThan(weakBreakout[6]!);

      const narrowRange = getChartLessonSample(2, index).prices;
      expect(Math.max(...narrowRange) - Math.min(...narrowRange)).toBeLessThan(0.1);
    }
  });

  it.each([
    { step: 0, choice: 'CHASE_LAST_SPIKE', signal: 'HIGHER_LOWS' },
    { step: 0, choice: 'SELL_FIRST_PULLBACK', signal: 'HIGHER_LOWS' },
    { step: 1, choice: 'BUY_ANY_BREAKOUT', signal: 'WEAK_BREAKOUT' },
    { step: 1, choice: 'IGNORE_VOLUME', signal: 'WEAK_BREAKOUT' },
    { step: 2, choice: 'ASSUME_REVERSAL', signal: 'NARROW_RANGE' },
    { step: 2, choice: 'DOUBLE_POSITION', signal: 'NARROW_RANGE' },
  ] as const)('remembers the first missed signal from day 1: $choice', ({ step, choice, signal }) => {
    const initial = createInitialState();
    const previousChoices = ['RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME', 'WAIT_FOR_RANGE_BREAK'];
    previousChoices[step] = choice;
    const state = start({
      day: 4,
      npcActivityMemory: {
        ...initial.npcActivityMemory,
        bodhisattva: {
          ...initial.npcActivityMemory.bodhisattva,
          lastTrace: {
            day: 1,
            activityId: 'BODHISATTVA_CHART_LESSON',
            choiceKeys: previousChoices,
            outcomeCode: null,
            cashDelta: null,
            score: 2,
          },
        },
      },
    });
    expect(state.activeActivity).toMatchObject({
      priorReview: { previousDay: 1, step, choice, signal },
    });
  });

  it('prioritizes the previous mistake and maps the saved answer order back to its signal', () => {
    const initial = createInitialState();
    const state = start({
      day: 4,
      npcActivityMemory: {
        ...initial.npcActivityMemory,
        bodhisattva: {
          ...initial.npcActivityMemory.bodhisattva,
          lastTrace: {
            day: 3,
            activityId: 'BODHISATTVA_CHART_LESSON',
            choiceKeys: ['RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME', 'DOUBLE_POSITION'],
            chartLessonOrder: [0, 1, 2],
            outcomeCode: null,
            cashDelta: null,
            score: 2,
          },
        },
      },
    });
    const active = state.activeActivity;
    if (active?.id !== 'BODHISATTVA_CHART_LESSON' || active.status !== 'ACTIVE') {
      throw new Error('Expected an active chart lesson.');
    }
    expect(active.lessonOrder).toEqual([2, 0, 1]);
    expect(chartLessonPromptStep(active)).toBe(2);

    let result = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'ASSUME_REVERSAL' });
    expect(result.activeActivity?.id === 'BODHISATTVA_CHART_LESSON'
      && result.activeActivity.status === 'ACTIVE'
      && chartLessonPromptStep(result.activeActivity)).toBe(0);
    result = gameReducer(result, { type: 'ANSWER_CHART_LESSON', choice: 'RIDE_HIGHER_LOWS' });
    result = gameReducer(result, { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_VOLUME' });
    const completed = result.activeActivity;
    if (completed?.id !== 'BODHISATTVA_CHART_LESSON' || completed.status !== 'RESULT') {
      throw new Error('Expected the chart lesson to complete.');
    }
    expect(completed).toMatchObject({
      score: 2,
      lessonOrder: [2, 0, 1],
      decisions: [{ step: 2 }, { step: 0 }, { step: 1 }],
    });

    result = gameReducer(result, { type: 'RETURN_FROM_ACTIVITY' });
    expect(result.npcActivityMemory.bodhisattva.lastTrace).toMatchObject({
      choiceKeys: ['ASSUME_REVERSAL', 'RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME'],
      chartLessonOrder: [2, 0, 1],
    });
    const nextLesson = start({ day: 5, npcActivityMemory: result.npcActivityMemory });
    expect(nextLesson.activeActivity).toMatchObject({
      priorReview: { step: 2, choice: 'ASSUME_REVERSAL', signal: 'NARROW_RANGE' },
      lessonOrder: [2, 0, 1],
    });
  });

  it('does not invent a review when the last lesson was fully correct', () => {
    const initial = createInitialState();
    const state = start({
      npcActivityMemory: {
        ...initial.npcActivityMemory,
        bodhisattva: {
          ...initial.npcActivityMemory.bodhisattva,
          lastTrace: {
            day: 1,
            activityId: 'BODHISATTVA_CHART_LESSON',
            choiceKeys: ['RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME', 'WAIT_FOR_RANGE_BREAK'],
            outcomeCode: null,
            cashDelta: null,
            score: 3,
          },
        },
      },
    });
    expect(state.activeActivity).toMatchObject({ priorScore: 3 });
    expect(state.activeActivity?.id === 'BODHISATTVA_CHART_LESSON' && state.activeActivity.priorReview).toBeUndefined();
  });

  it('trains through three choices and awards only a low-confidence historical clue', () => {
    let state = start({ energy: 12 });
    const cash = state.cash;
    expect(state.activeActivity).toMatchObject({ id: 'BODHISATTVA_CHART_LESSON', status: 'ACTIVE', step: 0 });
    const scenarioIndex = state.activeActivity?.id === 'BODHISATTVA_CHART_LESSON' ? state.activeActivity.scenarioIndex : undefined;
    expect(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_VOLUME' })).toBe(state);

    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'RIDE_HIGHER_LOWS' });
    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_VOLUME' });
    state = gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_RANGE_BREAK' });

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', score: 3, energySpent: 9, scenarioIndex });
    expect(state.npcActivityMemory.bodhisattva.lastTrace).toMatchObject({
      activityId: 'BODHISATTVA_CHART_LESSON', score: 3, scenarioIndex,
    });
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
