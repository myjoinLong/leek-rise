import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { deliveryContinuationScenarioCount } from '../deliveryScenarioVariants';
import { activitySchema } from '../../save/activitySchemas';
import { deliveryReturnContextFor, deliveryReturnPolicy, deliveryRunProfileForState, deliveryScenarioCount, deliveryStops, deliveryStopsFor, minimumDeliveryEnergy, minimumDeliveryEnergyFor } from './deliveryRun';

function daytime(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), phase: 'DAYTIME', energy: 120, energyMax: 120, ...overrides };
}

describe('delivery run exit and settlement', () => {
  it('provides 90 unique first-chapter orders with reproducible schedules and unchanged payouts', () => {
    const firstChapter = Array.from({ length: 30 }, (_, day) => deliveryStopsFor(day + 1, 2, 7331)).flat();
    const sameSeed = Array.from({ length: 30 }, (_, day) => deliveryStopsFor(day + 1, 2, 7331).map((stop) => stop.id)).flat();
    const otherSeed = Array.from({ length: 30 }, (_, day) => deliveryStopsFor(day + 1, 2, 12).map((stop) => stop.id)).flat();

    expect(deliveryScenarioCount).toBe(30);
    expect(firstChapter).toHaveLength(90);
    expect(new Set(firstChapter.map((stop) => stop.id)).size).toBe(90);
    expect(new Set(firstChapter.map((stop) => `${stop.title}:${stop.briefing}`)).size).toBe(90);
    expect(sameSeed).toEqual(firstChapter.map((stop) => stop.id));
    expect(otherSeed).not.toEqual(sameSeed);
    for (let day = 1; day <= 30; day += 1) {
      expect(deliveryStopsFor(day, 2, 7331).map((stop) => stop.options)).toEqual(deliveryStops.map((stop) => stop.options));
    }
  });

  it('composes reproducible, mechanically varied continuation days without repeats across 5,000 days', () => {
    const continuation = Array.from({ length: 5000 }, (_, index) => deliveryStopsFor(index + 31, 3, 7331));
    const repeated = Array.from({ length: 5000 }, (_, index) => deliveryStopsFor(index + 31, 3, 7331));
    const alternateSeed = deliveryStopsFor(31, 3, 12);
    const ids = continuation.flatMap((stops) => stops.map((stop) => stop.id));
    const firstLongTail = continuation[0]!;
    const baseline = deliveryStopsFor(30, 3, 7331);

    expect(deliveryContinuationScenarioCount).toBe(122880);
    expect(new Set(ids).size).toBe(ids.length);
    expect(repeated.map((stops) => stops.map((stop) => stop.id))).toEqual(
      continuation.map((stops) => stops.map((stop) => stop.id)),
    );
    expect(alternateSeed.map((stop) => stop.id)).not.toEqual(firstLongTail.map((stop) => stop.id));
    expect(firstLongTail.map((stop) => stop.title)).not.toEqual(baseline.map((stop) => stop.title));
    expect(firstLongTail.flatMap((stop) => stop.options).some((option, index) => {
      const baselineOption = baseline.flatMap((candidate) => candidate.options)[index];
      return option.income !== baselineOption?.income || option.energyCost !== baselineOption?.energyCost;
    })).toBe(true);
    expect(minimumDeliveryEnergyFor(31, 3, 7331)).toBe(
      firstLongTail.reduce((sum, stop) => sum + Math.min(...stop.options.map((option) => option.energyCost)), 0),
    );
  });

  it('offers explicit return-order income and energy terms on the final stop', () => {
    const reliable = deliveryStopsFor(8, 3, 7331, { previousDay: 7, kind: 'RELIABLE' });
    const rush = deliveryStopsFor(8, 3, 7331, { previousDay: 7, kind: 'RUSH' });
    const reliableOrder = reliable[2]!.options.find((option) => option.choice === 'STEADY')!;
    const rushOrder = rush[2]!.options.find((option) => option.choice === 'RUSH')!;

    expect(reliableOrder.income).toBe(53);
    expect(reliableOrder.energyCost).toBe(8);
    expect(reliableOrder.description).toContain(`熟客服务委托稳速返 ¥${deliveryReturnPolicy.reliableBonus}`);
    expect(rushOrder.income).toBe(79);
    expect(rushOrder.energyCost).toBe(25);
    expect(rushOrder.description).toContain(`高峰加急补贴 ¥${deliveryReturnPolicy.rushBonus}`);
  });

  it('derives a saved next-day delivery offer only from a complete prior route', () => {
    let state = gameReducer(daytime({ day: 4 }), { type: 'START_DELIVERY_RUN' });
    for (const choice of ['MAIN', 'MAIN', 'STEADY'] as const) {
      state = gameReducer(state, { type: 'CHOOSE_DELIVERY_ROUTE', choice });
    }
    expect(deliveryReturnContextFor({ ...state, day: 5 })).toEqual({ previousDay: 4, kind: 'RELIABLE' });

    const nextDay = { ...state, day: 5, phase: 'DAYTIME' as const, energy: 120, dailyWorkIncome: 0, workedToday: false, activeActivity: null };
    const nextRunState = gameReducer(nextDay, { type: 'START_DELIVERY_RUN' });
    expect(nextRunState.activeActivity).toMatchObject({ id: 'WANG_DELIVERY', returnContext: { previousDay: 4, kind: 'RELIABLE' } });
    expect(deliveryRunProfileForState(nextDay).minimumEnergy).toBe(minimumDeliveryEnergyFor(5, 3, state.scenarioSeed, { previousDay: 4, kind: 'RELIABLE' }));
    expect(activitySchema.safeParse(nextRunState.activeActivity).success).toBe(true);
    const nextStops = deliveryStopsFor(5, 3, state.scenarioSeed, { previousDay: 4, kind: 'RELIABLE' });
    let settled = nextRunState;
    for (const choice of ['MAIN', 'MAIN', 'STEADY'] as const) settled = gameReducer(settled, { type: 'CHOOSE_DELIVERY_ROUTE', choice });
    const expectedIncome = ['MAIN', 'MAIN', 'STEADY'].reduce((total, choice, index) =>
      total + nextStops[index]!.options.find((option) => option.choice === choice)!.income, 0);
    const expectedEnergy = ['MAIN', 'MAIN', 'STEADY'].reduce((total, choice, index) =>
      total + nextStops[index]!.options.find((option) => option.choice === choice)!.energyCost, 0);
    expect(settled).toMatchObject({ cash: nextDay.cash + expectedIncome, dailyWorkIncome: expectedIncome, energy: 120 - expectedEnergy });

    const incomplete = { ...nextDay, npcActivityMemory: {
      ...nextDay.npcActivityMemory,
      delivery: { ...nextDay.npcActivityMemory.delivery, lastTrace: { ...nextDay.npcActivityMemory.delivery.lastTrace!, choiceKeys: ['MAIN'] } },
    } };
    expect(deliveryReturnContextFor(incomplete)).toBeNull();
  });

  it('recognizes an accelerated prior route and keeps its larger cost visible', () => {
    let state = gameReducer(daytime({ day: 4 }), { type: 'START_DELIVERY_RUN' });
    for (const choice of ['MAIN', 'ALLEY', 'RUSH'] as const) {
      state = gameReducer(state, { type: 'CHOOSE_DELIVERY_ROUTE', choice });
    }
    const nextDay = { ...state, day: 5 };
    expect(deliveryReturnContextFor(nextDay)).toEqual({ previousDay: 4, kind: 'RUSH' });
    const rushOrder = deliveryStopsFor(5, 3, state.scenarioSeed, deliveryReturnContextFor(nextDay))[2]!.options.find((option) => option.choice === 'RUSH')!;
    expect(rushOrder.description).toContain('额外耗 3 点精力');
    expect(rushOrder.energyCost).toBeGreaterThan(deliveryStopsFor(5, 3, state.scenarioSeed)[2]!.options.find((option) => option.choice === 'RUSH')!.energyCost);
  });

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
