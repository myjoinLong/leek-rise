import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../core/reducer';
import { createInitialState } from '../core/state';
import type { ChartLessonChoice, GameState, MarketIntel } from '../core/types';
import { loadSavedGame, saveGame } from './storage';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({ default: { createInstance: () => ({
  getItem: async () => structuredClone(store.value),
  setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
}) } }));
beforeEach(() => { store.value = null; });

const answers: readonly ChartLessonChoice[] = ['RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME', 'WAIT_FOR_RANGE_BREAK'];
const narrowRangeReviewAnswers: readonly ChartLessonChoice[] = [
  'WAIT_FOR_RANGE_BREAK', 'RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME',
];
const options: readonly (readonly ChartLessonChoice[])[] = [
  ['RIDE_HIGHER_LOWS', 'CHASE_LAST_SPIKE', 'SELL_FIRST_PULLBACK'],
  ['WAIT_FOR_VOLUME', 'BUY_ANY_BREAKOUT', 'IGNORE_VOLUME'],
  ['WAIT_FOR_RANGE_BREAK', 'ASSUME_REVERSAL', 'DOUBLE_POSITION'],
];
const routes = options[0]!.flatMap((first) => options[1]!.flatMap((second) =>
  options[2]!.map((third) => ({ choices: [first, second, third] }))));

function initial(): GameState {
  return { ...createInitialState(17), phase: 'DAYTIME', energy: 9 };
}

async function restore(state: GameState): Promise<GameState> {
  await saveGame(state);
  const loaded = await loadSavedGame();
  expect(loaded).toEqual(state);
  if (!loaded) throw new Error('Expected chart lesson save.');
  return loaded;
}

function expectEconomy(state: GameState, baseline: GameState): void {
  for (const key of ['cash', 'debt', 'stocks', 'workedToday', 'dailyWorkIncome', 'dailyStreamIncome',
    'weeklyStreamIncome', 'dailyFees', 'dailyContractFees', 'periodicCostLedger', 'orderSequence'] as const) {
    expect(state[key], key).toEqual(baseline[key]);
  }
}

function advance(state: GameState, count: number): GameState {
  for (let index = 0; index < count; index += 1) state = gameReducer(state, { type: 'ADVANCE_PHASE' });
  return state;
}

describe('chart lesson save and economic contract', () => {
  it('persists a specific previous-mistake review through the active lesson and result', async () => {
    const baseline = initial();
    const withMemory: GameState = {
      ...baseline,
      day: 2,
      npcActivityMemory: {
        ...baseline.npcActivityMemory,
        bodhisattva: {
          ...baseline.npcActivityMemory.bodhisattva,
          lastTrace: {
            day: 1,
            activityId: 'BODHISATTVA_CHART_LESSON',
            choiceKeys: ['RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME', 'DOUBLE_POSITION'],
            outcomeCode: null,
            cashDelta: null,
            score: 2,
          },
        },
      },
    };
    let state = await restore(gameReducer(withMemory, { type: 'START_CHART_LESSON' }));
    expect(state.activeActivity).toMatchObject({ priorReview: {
      previousDay: 1, step: 2, choice: 'DOUBLE_POSITION', signal: 'NARROW_RANGE',
    }, lessonOrder: [2, 0, 1] });
    for (const choice of narrowRangeReviewAnswers) state = await restore(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice }));
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', priorReview: {
      previousDay: 1, step: 2, choice: 'DOUBLE_POSITION', signal: 'NARROW_RANGE',
    }, lessonOrder: [2, 0, 1], score: 3 });
    expect(state.activeActivity?.id === 'BODHISATTVA_CHART_LESSON'
      && state.activeActivity.decisions.map((decision) => decision.step)).toEqual([2, 0, 1]);
    state = await restore(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }));
    expect(state.npcActivityMemory.bodhisattva.lastTrace).toMatchObject({
      choiceKeys: narrowRangeReviewAnswers,
      chartLessonOrder: [2, 0, 1],
    });
  });

  it.each(routes)('restores all steps for $choices without paying cash or replaying rewards', async ({ choices }) => {
    const baseline = initial();
    let state = await restore(gameReducer(baseline, { type: 'START_CHART_LESSON' }));
    expect(state.energy).toBe(9);
    expect(state.chartLessonVisitedToday).toBe(true);
    for (const [index, choice] of choices.entries()) {
      state = await restore(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice }));
      expect(state.energy).toBe(6 - index * 3);
      expectEconomy(state, baseline);
      expect(state.activeActivity).toMatchObject({ step: index + 1, energySpent: (index + 1) * 3 });
      expect(state.activeActivity?.id === 'BODHISATTVA_CHART_LESSON'
        && state.activeActivity.decisions.map((entry) => entry.choice)).toEqual(choices.slice(0, index + 1));
    }
    const score = choices.filter((choice, index) => choice === answers[index]).length;
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', score });
    if (score >= 2) {
      expect(state.marketIntel).toMatchObject({ day: 1, stockId: 'dragon', confidence: 'LOW', npcName: 'K线菩萨' });
    } else {
      expect(state.marketIntel).toBeNull();
    }
    for (const action of [{ type: 'ANSWER_CHART_LESSON', choice: choices[2]! },
      { type: 'START_CHART_LESSON' }, { type: 'ABANDON_CHART_LESSON' }, { type: 'ADVANCE_PHASE' }] as const) {
      expect(gameReducer(state, action)).toBe(state);
    }
    state = await restore(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }));
    expect(state.activeActivity).toBeNull();
    expect(state.energy).toBe(0);
    expectEconomy(state, baseline);
    expect(gameReducer(state, { type: 'START_CHART_LESSON' })).toBe(state);
    const night = await restore(advance(state, 2));
    expect(night.phase).toBe('NIGHT');
    expectEconomy(night, baseline);
    state = await restore(advance(night, 2));
    expect(state).toMatchObject({ day: 2, phase: 'DAYTIME', chartLessonVisitedToday: false, marketIntel: null });
    expect(gameReducer(state, { type: 'START_CHART_LESSON' }).activeActivity?.id).toBe('BODHISATTVA_CHART_LESSON');
  });

  it.each([0, 1, 2])('preserves %s answers worth of energy on exit and the daily lock after reload', async (count) => {
    const baseline = initial();
    let state = gameReducer(baseline, { type: 'START_CHART_LESSON' });
    for (const choice of answers.slice(0, count)) state = await restore(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice }));
    state = await restore(gameReducer(state, { type: 'ABANDON_CHART_LESSON' }));
    expect(state).toMatchObject({ activeActivity: null, energy: 9 - count * 3, chartLessonVisitedToday: true });
    expectEconomy(state, baseline);
    expect(gameReducer(state, { type: 'START_CHART_LESSON' })).toBe(state);
    state = await restore(advance(state, 4));
    expect(state).toMatchObject({ day: 2, phase: 'DAYTIME', chartLessonVisitedToday: false, energy: baseline.energyMax });
    expect(gameReducer(state, { type: 'START_DELIVERY_RUN' }).activeActivity?.id).toBe('WANG_DELIVERY');
  });

  it('rejects wrong-round answers and freezes trading, selected stock and calendar across restore', async () => {
    let state = await restore(gameReducer(initial(), { type: 'START_CHART_LESSON' }));
    for (const action of [{ type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_VOLUME' },
      { type: 'PLACE_ORDER', side: 'BUY', shares: 100 }, { type: 'SELECT_STOCK', stockId: 'dragon' },
      { type: 'CHANGE_PHASE', phase: 'NIGHT' }, { type: 'ADVANCE_TICK' },
      { type: 'RETURN_FROM_ACTIVITY' }, { type: 'START_DELIVERY_RUN' }] as const) {
      expect(gameReducer(state, action)).toBe(state);
    }
    state = await restore(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: answers[0]! }));
    expect(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice: answers[0]! })).toBe(state);
  });

  it('preserves an earlier NPC clue when this lesson earns no clue', async () => {
    const intel: MarketIntel = { day: 1, stockId: 'dragon', confidence: 'HIGH', bias: 'CAUTION', message: '已有核验线索', npcName: '陈总' };
    let state = gameReducer({ ...initial(), marketIntel: intel }, { type: 'START_CHART_LESSON' });
    for (const choice of ['CHASE_LAST_SPIKE', 'IGNORE_VOLUME', 'DOUBLE_POSITION'] as const) {
      state = await restore(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice }));
    }
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', score: 0, intel: null });
    expect(state.marketIntel).toEqual(intel);
    state = await restore(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }));
    expect(state.marketIntel).toEqual(intel);
  });

  it.each([
    { prices: [10, 10.1], bias: 'OPPORTUNITY' }, { prices: [10, 9.9], bias: 'CAUTION' },
    { prices: [10, 10.02], bias: 'UNCERTAIN' }, { prices: [10], bias: null },
    { prices: [100, 10, 10, 10, 10, 10, 10, 10, 10.1], bias: 'OPPORTUNITY' },
  ])('uses recent historical prices $prices for a weak clue, never a cash reward', async ({ prices, bias }) => {
    const baseline = initial();
    const stock = baseline.stocks.dragon!;
    let state = gameReducer({ ...baseline, stocks: { dragon: { ...stock, priceHistory: prices } } }, { type: 'START_CHART_LESSON' });
    for (const choice of answers) state = await restore(gameReducer(state, { type: 'ANSWER_CHART_LESSON', choice }));
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', score: 3 });
    if (bias === null) expect(state.marketIntel).toBeNull();
    else expect(state.marketIntel).toMatchObject({ bias, confidence: 'LOW', day: 1, stockId: 'dragon' });
    expect(state.cash).toBe(baseline.cash);
    expect(state.dailyWorkIncome).toBe(0);
  });

  it('retains the insufficient-energy rejection across saves', async () => {
    const state = await restore({ ...initial(), energy: 8 });
    expect(gameReducer(state, { type: 'START_CHART_LESSON' })).toBe(state);
    expect(state.chartLessonVisitedToday).toBe(false);
  });

  it.each(Array.from({ length: 10 }, (_, index) => index + 1))('migrates v%s without inventing a completed lesson', async (version) => {
    store.value = { version, savedAt: 1, state: { ...initial(), chartLessonVisitedToday: undefined } };
    const state = await loadSavedGame();
    expect(state?.chartLessonVisitedToday).toBe(false);
    if (!state) throw new Error('Expected migrated save.');
    expect(gameReducer(state, { type: 'START_CHART_LESSON' }).activeActivity?.id).toBe('BODHISATTVA_CHART_LESSON');
  });
});
