import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer, type GameAction } from '../core/reducer';
import { createInitialState } from '../core/state';
import { factoryInspectionForDay } from '../core/systems/factoryShift';
import { cafeScenarioFor } from '../core/systems/cafeShift';
import type { GameState, NpcId } from '../core/types';
import { loadSavedGame, saveGame } from './storage';

const store = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('localforage', () => ({
  default: {
    createInstance: () => ({
      getItem: async () => structuredClone(store.value),
      setItem: async (_key: string, value: unknown) => { store.value = structuredClone(value); },
    }),
  },
}));
beforeEach(() => { store.value = null; });

const activities: { name: string; id: string; npcId: NpcId; start: GameAction; steps: GameAction[]; abandon?: GameAction }[] = [
  { name: 'delivery', id: 'WANG_DELIVERY', npcId: 'delivery', start: { type: 'START_DELIVERY_RUN' }, steps: [
    { type: 'CHOOSE_DELIVERY_ROUTE', choice: 'ALLEY' },
    { type: 'CHOOSE_DELIVERY_ROUTE', choice: 'MAIN' },
    { type: 'CHOOSE_DELIVERY_ROUTE', choice: 'RUSH' },
  ] },
  { name: 'Longge', id: 'LONGGE_CHAT', npcId: 'longge', start: { type: 'START_LONGGE_CHAT' }, abandon: { type: 'ABANDON_LONGGE_CHAT' }, steps: [
    { type: 'CHOOSE_LONGGE_CLUE', choice: 'VERIFY_ORIGIN' },
    { type: 'CHOOSE_LONGGE_CLUE', choice: 'READ_TAPE' },
    { type: 'CHOOSE_LONGGE_CLUE', choice: 'CHECK_NOTICE' },
    { type: 'CONCLUDE_LONGGE_CHAT', conclusion: 'INSUFFICIENT' },
  ] },
  { name: 'stream', id: 'XIAOLIAN_STREAM', npcId: 'xiaolian', start: { type: 'START_STREAM_RUN' }, abandon: { type: 'ABANDON_STREAM_RUN' }, steps: [
    { type: 'CHOOSE_STREAM_OPTION', choice: 'HONEST_REVIEW' },
    { type: 'CHOOSE_STREAM_OPTION', choice: 'ANSWER_QUESTIONS' },
    { type: 'CHOOSE_STREAM_OPTION', choice: 'TRANSPARENT_DEAL' },
  ] },
  { name: 'Chen', id: 'CHEN_DOSSIER', npcId: 'chen', start: { type: 'START_CHEN_DOSSIER' }, abandon: { type: 'ABANDON_CHEN_DOSSIER' }, steps: [
    { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' },
    { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'CHECK_SUPPLIER' },
    { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'MATCH_INVOICES' },
    { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: 'WAIT' },
  ] },
  { name: 'Jiuge', id: 'JIUGE_NEGOTIATION', npcId: 'jiuge', start: { type: 'START_JIUGE_NEGOTIATION' }, abandon: { type: 'ABANDON_JIUGE_NEGOTIATION' }, steps: [
    { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' },
    { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' },
    { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'ASK_INTEREST_GRACE' },
  ] },
  { name: 'factory shift', id: 'WANG_FACTORY', npcId: 'wang', start: { type: 'START_FACTORY_SHIFT' }, steps: [0, 1, 2].map((step) => ({
    type: 'CHOOSE_FACTORY_CHECK' as const, choice: factoryInspectionForDay(35, step, 3, 4).correctChoice,
  })) },
  { name: 'chart lesson', id: 'BODHISATTVA_CHART_LESSON', npcId: 'bodhisattva', start: { type: 'START_CHART_LESSON' }, abandon: { type: 'ABANDON_CHART_LESSON' }, steps: [
    { type: 'ANSWER_CHART_LESSON', choice: 'RIDE_HIGHER_LOWS' },
    { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_VOLUME' },
    { type: 'ANSWER_CHART_LESSON', choice: 'WAIT_FOR_RANGE_BREAK' },
  ] },
  { name: 'cafe shift', id: 'SUJIE_CAFE_SHIFT', npcId: 'sujie', start: { type: 'START_CAFE_SHIFT' }, abandon: { type: 'ABANDON_CAFE_SHIFT' }, steps: [0, 1, 2].map((step) => ({
    type: 'SERVE_CAFE_ORDER' as const, choice: cafeScenarioFor(35, step as 0 | 1 | 2, 4, 4).correctChoice,
  })) },
  { name: 'Zheng bike repair', id: 'ZHENG_BIKE_REPAIR', npcId: 'zheng', start: { type: 'START_ZHENG_BIKE_REPAIR' }, abandon: { type: 'ABANDON_ZHENG_BIKE_REPAIR' }, steps: [
    { type: 'TEST_BIKE_PART', part: 'BATTERY' },
    { type: 'REPAIR_BIKE_FAULT', part: 'BATTERY' },
    { type: 'REPAIR_BIKE_FAULT', part: 'BRAKES' },
    { type: 'REPAIR_BIKE_FAULT', part: 'CONTROLLER' },
  ] },
  { name: 'market stall', id: 'LAOLIANG_MARKET_STALL', npcId: 'laoliang', start: { type: 'START_LAOLIANG_STALL' }, steps: [
    { type: 'SELECT_STALL_PRODUCT', product: 'THERMOS' }, { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' },
    { type: 'SELECT_STALL_PRODUCT', product: 'RAINCOAT' }, { type: 'SELL_STALL_GOODS', priceTier: 'VALUE' },
    { type: 'SELECT_STALL_PRODUCT', product: 'CABLE' }, { type: 'SELL_STALL_GOODS', priceTier: 'PREMIUM' },
  ] },
  { name: 'broker negotiation', id: 'ZHOU_BROKER_NEGOTIATION', npcId: 'zhou', start: { type: 'START_BROKER_NEGOTIATION' }, steps: [
    { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 36000 }, { type: 'CHOOSE_BROKER_PLAN', plan: 'LOW_COMMISSION' },
  ] },
  { name: 'risk replay', id: 'SWEEPER_RISK_REPLAY', npcId: 'sweeper', start: { type: 'START_RISK_REPLAY' }, steps: [
    { type: 'COMMIT_RISK_ALLOCATION', allocation: 20 }, { type: 'COMMIT_RISK_ALLOCATION', allocation: 50 },
    { type: 'COMMIT_RISK_ALLOCATION', allocation: 0 },
  ] },
  { name: 'phone flip', id: 'PHONE_FLIP', npcId: 'phoneflip', start: { type: 'START_PHONE_FLIP' }, steps: [
    { type: 'INSPECT_PHONE_LOT' }, { type: 'RESOLVE_PHONE_LOT', choice: 'BARGAIN_QUICK' },
    { type: 'INSPECT_PHONE_LOT' }, { type: 'RESOLVE_PHONE_LOT', choice: 'PASS' },
    { type: 'INSPECT_PHONE_LOT' }, { type: 'RESOLVE_PHONE_LOT', choice: 'ASK_REFURB' },
  ] },
];

const externalActions = {
  ADVANCE_TICK: { type: 'ADVANCE_TICK' },
  START_FACTORY_SHIFT: { type: 'START_FACTORY_SHIFT' },
  START_CHART_LESSON: { type: 'START_CHART_LESSON' },
  START_CAFE_SHIFT: { type: 'START_CAFE_SHIFT' },
  START_ZHENG_BIKE_REPAIR: { type: 'START_ZHENG_BIKE_REPAIR' },
  ADVANCE_PHASE: { type: 'ADVANCE_PHASE' },
  SELECT_CHARACTER: { type: 'SELECT_CHARACTER', gender: 'FEMALE' },
  CHANGE_PHASE: { type: 'CHANGE_PHASE', phase: 'NIGHT' },
  SELECT_STOCK: { type: 'SELECT_STOCK', stockId: 'other' },
  SET_INPUT_SHARES: { type: 'SET_INPUT_SHARES', shares: 200 },
  PLACE_ORDER: { type: 'PLACE_ORDER', side: 'BUY', shares: 100 },
  BORROW_FROM_NPC: { type: 'BORROW_FROM_NPC' },
  REPAY_DEBT: { type: 'REPAY_DEBT', amount: 100 },
  CLEAR_ORDER_FEEDBACK: { type: 'CLEAR_ORDER_FEEDBACK' },
} satisfies Partial<Record<GameAction['type'], GameAction>>;

function initial(): GameState {
  const state = createInitialState();
  const stock = state.stocks.dragon;
  if (!stock) throw new Error('Missing fixture stock.');
  return {
    ...state, day: 35, phase: 'DAYTIME', gender: 'MALE', energy: 120, energyMax: 120,
    debtCrisisStarted: true, dailyWorkIncome: 100,
    stocks: { ...state.stocks, other: { ...stock, id: 'other', scriptPhase: 'DUMP' } },
    lastOrderFeedback: {
      id: 'previous', stockName: stock.name, side: 'BUY', requestedShares: 100, filledShares: 100,
      requestedPrice: stock.price, filledPrice: stock.price, slippagePct: 0, fee: 5,
      latencyMs: 0, result: 'FILLED', cashAfter: state.cash,
    },
  };
}

async function restore(state: GameState): Promise<GameState> {
  await saveGame(state);
  const restored = await loadSavedGame();
  expect(restored).toEqual(state);
  if (!restored) throw new Error('Save did not restore.');
  return restored;
}

describe.each(activities)('$name lifecycle isolation', (activity) => {
  it('rejects external mutations and other activity actions in progress', () => {
    let state = gameReducer(initial(), activity.start);
    expect(state.activeActivity?.status).toBe('ACTIVE');
    for (const step of activity.steps) {
      const snapshot = structuredClone(state);
      for (const action of Object.values(externalActions)) {
        expect(gameReducer(state, action), action.type).toBe(state);
      }
      for (const phase of ['PRE_MARKET', 'DAYTIME', 'TRADING', 'NIGHT'] as const) {
        expect(gameReducer(state, { type: 'CHANGE_PHASE', phase })).toBe(state);
      }
      expect(gameReducer(state, { type: 'PLACE_ORDER', side: 'SELL', shares: 100 })).toBe(state);
      for (const other of activities.filter((candidate) => candidate !== activity)) {
        for (const action of [other.start, ...other.steps, ...(other.abandon ? [other.abandon] : [])]) {
          expect(gameReducer(state, action), action.type).toBe(state);
        }
      }
      expect(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' })).toBe(state);
      expect(state).toEqual(snapshot);
      state = gameReducer(state, step);
    }
    expect(state.activeActivity?.status).toBe('RESULT');
    expect(state.npcActivityMemory[activity.npcId]).toMatchObject({
      completedRuns: 1,
      lastCompletedDay: 35,
    });
    const trace = state.npcActivityMemory[activity.npcId].lastTrace;
    expect(trace).not.toBeNull();
    if (!trace) throw new Error('Completed activity should create an NPC memory trace.');
    expect(trace.activityId).toBe(activity.id);
    expect(trace.choiceKeys.length).toBeGreaterThan(0);
  });

  it('restores every step and the settled receipt without replaying rewards', async () => {
    const uninterrupted = activity.steps.reduce(gameReducer, gameReducer(initial(), activity.start));
    let state = await restore(gameReducer(initial(), activity.start));
    for (const action of activity.steps) state = await restore(gameReducer(state, action));
    expect(state).toEqual(uninterrupted);
    expect(state.activeActivity?.status).toBe('RESULT');
    expect(state.npcActivityMemory[activity.npcId].completedRuns).toBe(1);
    for (const action of [...Object.values(externalActions), activity.start, ...activity.steps,
      ...(activity.abandon ? [activity.abandon] : [])]) {
      expect(gameReducer(state, action), action.type).toBe(state);
    }
    const hub = await restore(gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' }));
    expect(hub.activeActivity).toBeNull();
    expect(hub.phase).toBe('DAYTIME');
    expect(hub.npcActivityMemory[activity.npcId].completedRuns).toBe(1);
    for (const action of activity.steps) expect(gameReducer(hub, action)).toBe(hub);
    expect(gameReducer(hub, { type: 'RETURN_FROM_ACTIVITY' })).toBe(hub);
    expect(gameReducer(hub, activity.start)).toBe(hub);
    const trading = gameReducer(hub, { type: 'ADVANCE_PHASE' });
    expect(trading.phase).toBe('TRADING');
    expect(gameReducer(trading, { type: 'ADVANCE_TICK' }).stocks).not.toEqual(trading.stocks);
    const night = gameReducer(trading, { type: 'ADVANCE_PHASE' });
    expect(night.phase).toBe('NIGHT');
    expect(night.lastPeriodicSettlementDay).toBe(35);
    const nextDay = await restore(gameReducer(night, { type: 'ADVANCE_PHASE' }));
    expect(nextDay.day).toBe(36);
    expect(nextDay.debtCrisisStarted).toBe(true);
    if (activity.name === 'Jiuge') {
      expect(night.periodicCostLedger.interestGraceApplied).toBe(true);
      expect(nextDay.debtInterestGraceWeeksRemaining).toBe(0);
    }
  });

  if (activity.abandon) {
    it('preserves spent resources and applies the activity reentry rule after abandoning', async () => {
      let state = gameReducer(initial(), activity.start);
      const first = activity.steps[0];
      if (!first || !activity.abandon) throw new Error('Missing abandon fixture.');
      state = await restore(gameReducer(state, first));
      const hub = await restore(gameReducer(state, activity.abandon));
      expect(hub.activeActivity).toBeNull();
      expect(hub.energy).toBe(state.energy);
      expect(hub.cash).toBe(state.cash);
      expect(hub.marketIntel).toBeNull();
      for (const step of activity.steps) expect(gameReducer(hub, step)).toBe(hub);
      const restarted = gameReducer(hub, activity.start);
      if (activity.name === 'Jiuge' || activity.name === 'cafe shift') {
        expect(restarted.activeActivity).toMatchObject({ status: 'ACTIVE', step: 0, decisions: [] });
        if (activity.name === 'Jiuge') expect(restarted.debtInterestGraceWeeksRemaining).toBe(0);
      } else {
        expect(restarted).toBe(hub);
      }
    });
  }
});
