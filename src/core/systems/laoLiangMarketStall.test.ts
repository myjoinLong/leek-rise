import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { laoLiangReturnContextFor } from '../laoLiangStallMemory';
import { activitySchema } from '../../save/activitySchemas';
import { gameStateSchema } from '../../save/schemas';
import { reduceLaoLiangStall, quoteStallSale, stallCustomerForRun, stallIncomeRange } from './laoLiangMarketStall';
import { stallContinuationScenarioCount, stallMarketDayFor, stallMarketDays } from '../marketStallScenarios';
import { stallMaxCustomerUnits } from '../marketStallTypes';

function start(overrides: Partial<GameState> = {}): GameState {
  return reduceLaoLiangStall({ ...createInitialState(), phase: 'DAYTIME', energy: 120, ...overrides }, { type: 'START_LAOLIANG_STALL' });
}

function sell(state: GameState, product: 'THERMOS' | 'RAINCOAT' | 'CABLE', priceTier: 'VALUE' | 'STANDARD' | 'PREMIUM'): GameState {
  const selected = reduceLaoLiangStall(state, { type: 'SELECT_STALL_PRODUCT', product });
  return reduceLaoLiangStall(selected, { type: 'SELL_STALL_GOODS', priceTier });
}

describe('Lao Liang community stall', () => {
  it('settles a transparent 3-customer shift into real cash and daily work income', () => {
    let state = start();
    const run = state.activeActivity;
    if (run?.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE') throw new Error('Expected an active stall shift.');
    let expectedIncome = 60;
    for (let step = 0; step < 3; step += 1) {
      const customer = stallCustomerForRun(run.day, step as 0 | 1 | 2, run.scenarioVersion, run.scenarioSeed);
      const quote = quoteStallSale(step as 0 | 1 | 2, customer.product, 'STANDARD', run.day, run.scenarioSeed ?? 4, run.scenarioVersion ?? 1);
      expectedIncome += quote.commission;
      state = sell(state, customer.product, 'STANDARD');
    }

    expect(state.activeActivity).toMatchObject({ id: 'LAOLIANG_MARKET_STALL', status: 'RESULT', income: expectedIncome, energySpent: 15 });
    expect(state.cash).toBe(3200 + expectedIncome);
    expect(state.dailyWorkIncome).toBe(expectedIncome);
    expect(state.energy).toBe(105);
    expect(state.workedToday).toBe(true);
  });

  it('shows price and demand tradeoffs without charging cash for unsold consignment', () => {
    expect(quoteStallSale(0, 'THERMOS', 'STANDARD')).toMatchObject({ unitPrice: 30, unitsSold: 2, commission: 18 });
    expect(quoteStallSale(0, 'THERMOS', 'PREMIUM')).toMatchObject({ unitPrice: 42, unitsSold: 0, commission: 0 });
    expect(quoteStallSale(0, 'CABLE', 'VALUE')).toMatchObject({ unitsSold: 0, commission: 0 });
  });

  it('deals 30 distinct reproducible market events without repeating a day in the first chapter', () => {
    const firstSeed = Array.from({ length: 30 }, (_, index) => stallMarketDayFor(index + 1, 41));
    const sameSeed = Array.from({ length: 30 }, (_, index) => stallMarketDayFor(index + 1, 41));
    const otherSeed = Array.from({ length: 30 }, (_, index) => stallMarketDayFor(index + 1, 77));
    expect(new Set(firstSeed.map((scenario) => scenario.id)).size).toBe(30);
    expect(firstSeed).toEqual(sameSeed);
    expect(firstSeed.map((scenario) => scenario.id)).not.toEqual(otherSeed.map((scenario) => scenario.id));
    expect(stallMarketDays).toHaveLength(30);
    expect(new Set(firstSeed.map((scenario) => JSON.stringify(scenario.budgetAdjustments) + JSON.stringify(scenario.demandAdjustments))).size).toBeGreaterThan(20);
    for (let day = 1; day <= 30; day += 1) {
      expect(stallMarketDayFor(day, 41, 3)).toEqual(stallMarketDayFor(day, 41, 2));
    }
  });

  it('extends the market after day 30 with a seeded non-repeating combination deck', () => {
    const firstSeed = Array.from({ length: 5000 }, (_, index) => stallMarketDayFor(index + 31, 41));
    const sameSeed = Array.from({ length: 5000 }, (_, index) => stallMarketDayFor(index + 31, 41));
    const otherSeed = Array.from({ length: 5000 }, (_, index) => stallMarketDayFor(index + 31, 77));
    expect(stallContinuationScenarioCount).toBe(30 * 8 ** 4);
    expect(new Set(firstSeed.map((scenario) => scenario.id)).size).toBe(5000);
    expect(firstSeed).toEqual(sameSeed);
    expect(firstSeed.map((scenario) => scenario.id)).not.toEqual(otherSeed.map((scenario) => scenario.id));
    expect(stallMarketDayFor(31, 41, 2)).toEqual(stallMarketDayFor(1, 41, 2));
    expect(stallMarketDayFor(31, 41, 3).id).not.toBe(stallMarketDayFor(1, 41, 2).id);
    for (let day = 31; day < 61; day += 1) {
      for (const step of [0, 1, 2] as const) {
        expect(stallCustomerForRun(day, step, 3, 41).units).toBeLessThanOrEqual(stallMaxCustomerUnits);
      }
    }
  });

  it('discloses a correct whole-shift income range for each seeded market event', () => {
    for (const day of [...Array.from({ length: 30 }, (_, index) => index + 1), 31, 32, 43]) {
      const bounds = stallIncomeRange(day, 41);
      let minimum = Infinity;
      let maximum = -Infinity;
      for (const first of ['THERMOS', 'RAINCOAT', 'CABLE'] as const) {
        for (const second of ['THERMOS', 'RAINCOAT', 'CABLE'] as const) {
          for (const third of ['THERMOS', 'RAINCOAT', 'CABLE'] as const) {
            for (const tierA of ['VALUE', 'STANDARD', 'PREMIUM'] as const) {
              for (const tierB of ['VALUE', 'STANDARD', 'PREMIUM'] as const) {
                for (const tierC of ['VALUE', 'STANDARD', 'PREMIUM'] as const) {
                  const commission = quoteStallSale(0, first, tierA, day, 41, 3).commission
                    + quoteStallSale(1, second, tierB, day, 41, 3).commission
                    + quoteStallSale(2, third, tierC, day, 41, 3).commission;
                  minimum = Math.min(minimum, commission + 60);
                  maximum = Math.max(maximum, commission + 60);
                }
              }
            }
          }
        }
      }
      expect(bounds).toEqual({ minimum, maximum });
    }
  });

  it('settles a continuation-day stall from the same prices and sales shown before each choice', () => {
    const day = 31;
    const seed = 41;
    let state = reduceLaoLiangStall({ ...createInitialState(seed), day, phase: 'DAYTIME', energy: 120 }, { type: 'START_LAOLIANG_STALL' });
    const run = state.activeActivity;
    if (run?.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE') throw new Error('Expected a continuation stall shift.');
    expect(run.scenarioVersion).toBe(3);
    let expectedIncome = 60;
    for (const step of [0, 1, 2] as const) {
      const customer = stallCustomerForRun(day, step, run.scenarioVersion, seed);
      const quote = quoteStallSale(step, customer.product, 'STANDARD', day, seed, 3);
      expectedIncome += quote.commission;
      state = sell(state, customer.product, 'STANDARD');
    }
    const range = stallIncomeRange(day, seed);
    expect(state.activeActivity).toMatchObject({ status: 'RESULT', income: expectedIncome });
    expect(state.cash).toBe(3200 + expectedIncome);
    expect(state.energy).toBe(105);
    expect(expectedIncome).toBeGreaterThanOrEqual(range.minimum);
    expect(expectedIncome).toBeLessThanOrEqual(range.maximum);
  });

  it('rewards two profitable neighborhood-price sales with a saved next-shift referral', () => {
    let previous = gameReducer({ ...createInitialState(41), day: 4, phase: 'DAYTIME', energy: 120 }, { type: 'START_LAOLIANG_STALL' });
    const previousRun = previous.activeActivity;
    if (previousRun?.id !== 'LAOLIANG_MARKET_STALL' || previousRun.status !== 'ACTIVE') throw new Error('Expected an active prior stall shift.');
    for (const step of [0, 1, 2] as const) {
      const customer = stallCustomerForRun(previousRun.day, step, previousRun.scenarioVersion, previousRun.scenarioSeed);
      previous = gameReducer(previous, { type: 'SELECT_STALL_PRODUCT', product: customer.product });
      previous = gameReducer(previous, { type: 'SELL_STALL_GOODS', priceTier: 'VALUE' });
    }

    const nextDay = { ...previous, day: 5, phase: 'DAYTIME' as const, energy: 120, dailyWorkIncome: 0, workedToday: false, activeActivity: null };
    const context = laoLiangReturnContextFor(nextDay);
    expect(context).toMatchObject({ previousDay: 4 });
    if (!context) throw new Error('Expected a return customer after the profitable fair-price shift.');
    const nextRunState = gameReducer(nextDay, { type: 'START_LAOLIANG_STALL' });
    const nextRun = nextRunState.activeActivity;
    expect(nextRun).toMatchObject({ id: 'LAOLIANG_MARKET_STALL', returnContext: context });
    expect(activitySchema.safeParse(nextRun).success).toBe(true);
    expect(gameStateSchema.parse(nextRunState).npcActivityMemory.laoliang.lastTrace).toMatchObject({ laoLiangReturnContext: context });

    let expectedIncome = 60;
    let actual = nextRunState;
    for (const step of [0, 1, 2] as const) {
      const customer = stallCustomerForRun(5, step, 3, 41, context);
      const baseline = stallCustomerForRun(5, step, 3, 41);
      if (customer.product === context.product) {
        expect(customer.units).toBe(baseline.units + 1);
        expect(customer.clue).toContain('熟客转介绍增加 1 件');
        expect('ownerLine' in customer && customer.ownerLine).toContain('第 4 天');
        expect(quoteStallSale(step, customer.product, 'VALUE', 5, 41, 3, context).unitsSold).toBe(
          quoteStallSale(step, baseline.product, 'VALUE', 5, 41, 3).unitsSold + 1,
        );
      }
      expectedIncome += quoteStallSale(step, customer.product, 'VALUE', 5, 41, 3, context).commission;
      actual = gameReducer(actual, { type: 'SELECT_STALL_PRODUCT', product: customer.product });
      actual = gameReducer(actual, { type: 'SELL_STALL_GOODS', priceTier: 'VALUE' });
    }
    expect(stallIncomeRange(5, 41, 3, context).maximum).toBeGreaterThan(stallIncomeRange(5, 41, 3).maximum);
    expect(actual).toMatchObject({ cash: nextDay.cash + expectedIncome, dailyWorkIncome: expectedIncome, energy: 105 });
    expect(actual.activeActivity).toMatchObject({ status: 'RESULT', income: expectedIncome, returnContext: context });
    expect(expectedIncome).toBeGreaterThanOrEqual(stallIncomeRange(5, 41, 3, context).minimum);
  });

  it('consumes the work slot and spent energy when the player abandons before payout', () => {
    let state = sell(start(), 'THERMOS', 'STANDARD');
    state = reduceLaoLiangStall(state, { type: 'ABANDON_LAOLIANG_STALL' });

    expect(state.activeActivity).toBeNull();
    expect(state.cash).toBe(3200);
    expect(state.dailyWorkIncome).toBe(0);
    expect(state.energy).toBe(115);
    expect(state.workedToday).toBe(true);
  });

  it('rejects a shift when work is already used or the full energy reserve is unavailable', () => {
    expect(start({ workedToday: true }).activeActivity).toBeNull();
    expect(start({ energy: 14 }).activeActivity).toBeNull();
  });
});
