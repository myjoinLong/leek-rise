import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState, PhoneFlipChoice } from '../types';
import { phoneFlipSchema } from '../../save/activitySchemas';
import { phoneFlipPolicy, phoneLotBriefFor, quotePhoneFlipOffer } from './phoneFlip';
import { phoneFlipReturnContextFor } from '../phoneFlipMemory';
import { gameStateSchema } from '../../save/schemas';

const daytime = (overrides: Partial<GameState> = {}): GameState => ({
  ...createInitialState(), phase: 'DAYTIME', energy: 100, energyMax: 100, ...overrides,
});

function start(state = daytime()): GameState {
  return gameReducer(state, { type: 'START_PHONE_FLIP' });
}

function choose(state: GameState, choice: PhoneFlipChoice): GameState {
  return gameReducer(state, { type: 'RESOLVE_PHONE_LOT', choice });
}

function passToProfile(state: GameState, profile: 'CLEAN' | 'BATTERY' | 'CORROSION'): GameState {
  while (state.activeActivity?.id === 'PHONE_FLIP' && state.activeActivity.status === 'ACTIVE') {
    const run = state.activeActivity;
    const lot = phoneLotBriefFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
    if (lot.profile === profile) return state;
    state = choose(state, 'PASS');
  }
  throw new Error(`Phone recovery sequence has no ${profile} lot.`);
}

function finishWithPasses(state: GameState): GameState {
  while (state.activeActivity?.id === 'PHONE_FLIP' && state.activeActivity.status === 'ACTIVE') state = choose(state, 'PASS');
  return state;
}

function advanceDay(state: GameState, day: number): GameState {
  return { ...state, day, phase: 'DAYTIME', activeActivity: null, workedToday: false, dailyWorkIncome: 0, energy: 100 };
}

describe('second-hand phone recovery activity', () => {
  it('keeps legacy lots readable and gives each first-chapter day a unique seeded case per profile', () => {
    expect(phoneLotBriefFor(1, 0, 1).name).toBe('轻薄旗舰机');
    expect(phoneLotBriefFor(1, 1, 1).name).toBe('续航旧款机');
    expect(phoneLotBriefFor(1, 2, 1).name).toBe('低价大屏机');
    expect(phoneLotBriefFor(2, 0, 1).name).toBe('续航旧款机');

    const firstChapter = Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      return [0, 1, 2].map((step) => phoneLotBriefFor(day, step as 0 | 1 | 2, 2, 71));
    });
    for (const dayLots of firstChapter) expect(new Set(dayLots.map((lot) => lot.profile)).size).toBe(3);
    for (const profile of ['CLEAN', 'BATTERY', 'CORROSION'] as const) {
      const events = firstChapter.flat().filter((lot) => lot.profile === profile);
      expect(new Set(events.map((lot) => `${lot.name}|${lot.sellerName}|${lot.sellerLine}|${lot.clue}`)).size).toBe(30);
    }
    expect(firstChapter).toEqual(Array.from({ length: 30 }, (_, index) => {
      const day = index + 1;
      return [0, 1, 2].map((step) => phoneLotBriefFor(day, step as 0 | 1 | 2, 2, 71));
    }));
    expect(firstChapter[0]).not.toEqual([0, 1, 2].map((step) => phoneLotBriefFor(1, step as 0 | 1 | 2, 2, 72)));
  });

  it('keeps the saved v3 phone pool intact after the v4 seller and market pools expand', () => {
    const lotsForDay = (day: number) => [0, 1, 2]
      .map((step) => phoneLotBriefFor(day, step as 0 | 1 | 2, 3, 4))
      .sort((left, right) => left.profile.localeCompare(right.profile));

    expect(lotsForDay(271)).toEqual(lotsForDay(31));
  });

  it('requires the stated energy and daily work slot, then reveals an auditable estimate', () => {
    const tooTired = daytime({ energy: phoneFlipPolicy.minimumEnergy - 1 });
    expect(gameReducer(tooTired, { type: 'START_PHONE_FLIP' })).toBe(tooTired);

    let state = passToProfile(start(), 'CLEAN');
    expect(state.activeActivity).toMatchObject({ id: 'PHONE_FLIP', status: 'ACTIVE', scenarioVersion: 5, scenarioSeed: 4 });
    expect(phoneFlipSchema.safeParse(state.activeActivity).success).toBe(true);
    const legacyRun = { id: 'PHONE_FLIP' as const, day: 1, status: 'ACTIVE' as const, step: 0 as const,
      energySpent: 0, decisions: [], totalProfit: 0, inspection: null };
    expect(phoneFlipSchema.safeParse(legacyRun).success).toBe(true);
    state = gameReducer(state, { type: 'INSPECT_PHONE_LOT' });
    expect(state).toMatchObject({ workedToday: true, energy: 97, activeActivity: { energySpent: 3, inspection: { condition: expect.any(String), quickProfitAtAsk: 150 } } });
    expect(gameReducer(state, { type: 'INSPECT_PHONE_LOT' })).toBe(state);
  });

  it('quotes cash occupancy and inspected cash return without exposing uninspected resale results', () => {
    const state = passToProfile(start(), 'CORROSION');
    const run = state.activeActivity;
    if (run?.id !== 'PHONE_FLIP' || run.status !== 'ACTIVE') throw new Error('Expected an active phone purchase.');
    const lot = phoneLotBriefFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const purchasePrice = lot.bargainPrice ?? lot.askingPrice;
    const uninspected = quotePhoneFlipOffer(state, run, 'BARGAIN_REFURB');
    expect(uninspected).toEqual({
      cashRequired: purchasePrice + phoneFlipPolicy.maxUninspectedRepairReserve,
      affordable: true,
      projectedProfit: null,
      projectedCashAfterSale: null,
    });

    const inspectedState = gameReducer(state, { type: 'INSPECT_PHONE_LOT' });
    const inspectedRun = inspectedState.activeActivity;
    if (inspectedRun?.id !== 'PHONE_FLIP' || inspectedRun.status !== 'ACTIVE' || !inspectedRun.inspection) {
      throw new Error('Expected an inspected phone purchase.');
    }
    const inspection = inspectedRun.inspection;
    const discount = lot.bargainPrice === null ? 0 : lot.askingPrice - lot.bargainPrice;
    const expectedProfit = Number((inspection.refurbProfitAtAsk + discount).toFixed(2));
    const inspected = quotePhoneFlipOffer(inspectedState, inspectedRun, 'BARGAIN_REFURB');
    expect(inspected).toEqual({
      cashRequired: purchasePrice + inspection.repairCost,
      affordable: true,
      projectedProfit: expectedProfit,
      projectedCashAfterSale: Number((inspectedState.cash + expectedProfit).toFixed(2)),
    });
    expect(quotePhoneFlipOffer({ cash: inspected.cashRequired - 1 }, inspectedRun, 'BARGAIN_REFURB').affordable).toBe(false);
    const executed = gameReducer(inspectedState, { type: 'RESOLVE_PHONE_LOT', choice: 'BARGAIN_REFURB' });
    const executedRun = executed.activeActivity;
    if (executedRun?.id !== 'PHONE_FLIP') throw new Error('Expected the quote to resolve into a phone decision.');
    expect(executedRun.decisions.at(-1)?.profit).toBe(inspected.projectedProfit);
    expect(executed.cash).toBe(inspected.projectedCashAfterSale);
  });

  it('lets informed bargaining create the established positive cash result', () => {
    const state = choose(passToProfile(start(), 'CLEAN'), 'BARGAIN_QUICK');
    expect(state).toMatchObject({ cash: 3412, dailyWorkIncome: 212, activeActivity: { id: 'PHONE_FLIP', totalProfit: 212 } });
    expect(gameReducer(state, { type: 'START_ZHENG_BIKE_REPAIR' })).toBe(state);
  });

  it('shows the battery repair cost before the player chooses to refurbish', () => {
    let state = gameReducer(passToProfile(start(), 'BATTERY'), { type: 'INSPECT_PHONE_LOT' });
    expect(state.activeActivity).toMatchObject({ inspection: { repairCost: 90, resaleRefurbished: 670, refurbProfitAtAsk: 120 } });
    state = choose(state, 'ASK_REFURB');
    expect(state).toMatchObject({ cash: 3320, dailyWorkIncome: 120, activeActivity: { id: 'PHONE_FLIP', totalProfit: 120 } });
  });

  it('lets an informed player avoid a visibly risky lot without losing money', () => {
    let state = gameReducer(passToProfile(start(), 'CORROSION'), { type: 'INSPECT_PHONE_LOT' });
    expect(state.activeActivity).toMatchObject({ inspection: { repairCost: 300, quickProfitAtAsk: -240 } });
    state = finishWithPasses(choose(state, 'PASS'));
    expect(state).toMatchObject({ cash: 3200, dailyWorkIncome: 0, activeActivity: { id: 'PHONE_FLIP', status: 'RESULT', totalProfit: 0 } });
    expect(state.energy).toBe(97);
  });

  it('records an uninspected loss and explains that the fault appeared after purchase', () => {
    let state = passToProfile(start(), 'CORROSION');
    state = finishWithPasses(choose(state, 'ASK_QUICK'));
    expect(state).toMatchObject({ cash: 2960, dailyWorkIncome: -240, activeActivity: { id: 'PHONE_FLIP', status: 'RESULT', totalProfit: -240 } });
    const riskDecision = state.activeActivity?.id === 'PHONE_FLIP' && state.activeActivity.status === 'RESULT'
      ? state.activeActivity.decisions.find((decision) => decision.profit === -240)?.explanation : '';
    expect(riskDecision).toContain('未验机收购，成交后才发现');
    expect(riskDecision).toContain('净亏损 −¥240');
  });

  it('distinguishes an inspected loss from a fault revealed after purchase', () => {
    let state = gameReducer(passToProfile(start(), 'CORROSION'), { type: 'INSPECT_PHONE_LOT' });
    state = finishWithPasses(choose(state, 'ASK_QUICK'));
    const explanation = state.activeActivity?.id === 'PHONE_FLIP' && state.activeActivity.status === 'RESULT'
      ? state.activeActivity.decisions.find((decision) => decision.profit === -240)?.explanation : '';
    expect(explanation).toContain('验机发现：主板有进液腐蚀痕迹');
    expect(explanation).toContain('净亏损 −¥240');
    expect(explanation).not.toContain('成交后才发现');
  });

  it('lets Ahao remember an uninspected loss on the next run without changing the new quote', () => {
    let previous = passToProfile(start(), 'CORROSION');
    previous = finishWithPasses(choose(previous, 'ASK_QUICK'));
    const context = previous.npcActivityMemory.phoneflip.lastTrace?.phoneFlipReturnContext;
    expect(context).toEqual({ previousDay: 1, phoneName: expect.any(String), loss: 240 });
    expect(gameStateSchema.safeParse(previous).success).toBe(true);
    if (!context) throw new Error('An uninspected loss must be recorded for Ahao.');

    const nextDay = advanceDay(previous, 2);
    expect(phoneFlipReturnContextFor(nextDay)).toEqual(context);
    const started = start(nextDay);
    const run = started.activeActivity;
    if (!run || run.id !== 'PHONE_FLIP' || run.status !== 'ACTIVE') throw new Error('Next phone shift did not start.');
    expect(run.returnContext).toEqual(context);
    expect(phoneFlipSchema.safeParse(run).success).toBe(true);

    const regularLot = phoneLotBriefFor(run.day, 0, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
    const returnLot = phoneLotBriefFor(run.day, 0, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, context);
    expect(returnLot.appraiserLine).toContain('第 1 天');
    expect(returnLot.appraiserLine).toContain('净亏 ¥240');
    expect(returnLot.askingPrice).toBe(regularLot.askingPrice);
    expect(returnLot.bargainPrice).toBe(regularLot.bargainPrice);
    expect(started.cash).toBe(previous.cash);
  });

  it('does not create the memory branch for inspected losses or stale traces', () => {
    let inspected = gameReducer(passToProfile(start(), 'CORROSION'), { type: 'INSPECT_PHONE_LOT' });
    inspected = finishWithPasses(choose(inspected, 'ASK_QUICK'));
    expect(phoneFlipReturnContextFor(advanceDay(inspected, 2))).toBeNull();

    let uninspected = passToProfile(start(), 'CORROSION');
    uninspected = finishWithPasses(choose(uninspected, 'ASK_QUICK'));
    expect(phoneFlipReturnContextFor(advanceDay(uninspected, 9))).toBeNull();
  });

  it('preserves settled lots on exit and blocks purchases beyond available cash', () => {
    let state = choose(passToProfile(start(daytime({ cash: 600 })), 'CLEAN'), 'BARGAIN_QUICK');
    expect(state.cash).toBe(812);
    state = gameReducer(state, { type: 'ABANDON_PHONE_FLIP' });
    expect(state).toMatchObject({ activeActivity: null, cash: 812, dailyWorkIncome: 212, workedToday: true });

    const poor = passToProfile(start(daytime({ cash: 500 })), 'CLEAN');
    expect(choose(poor, 'ASK_QUICK')).toBe(poor);
  });
});
