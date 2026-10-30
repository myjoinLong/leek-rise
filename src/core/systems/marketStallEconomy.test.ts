import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import type { StallPriceTier, StallProduct } from '../marketStallTypes';

const products: StallProduct[] = ['THERMOS', 'RAINCOAT', 'CABLE'];
const tiers: StallPriceTier[] = ['VALUE', 'STANDARD', 'PREMIUM'];
const choices = products.flatMap((product) => tiers.map((priceTier) => ({ product, priceTier })));
// Independent fixture values catch payout drift rather than reuse the production quote formula.
const commissionTable = [
  [12, 18, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 15, 20, 17, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 10, 19, 0],
];
function expectedCommission(step: number, index: number): number {
  const value = commissionTable[step]?.[index];
  if (value === undefined) throw new Error('Missing independent commission fixture.');
  return value;
}
function play(state: GameState, indices: readonly number[]): GameState {
  let next = gameReducer(state, { type: 'START_LAOLIANG_STALL' });
  for (const index of indices) {
    const choice = choices[index];
    if (!choice) throw new Error('Missing stall route choice.');
    next = gameReducer(next, { type: 'SELECT_STALL_PRODUCT', product: choice.product });
    next = gameReducer(next, { type: 'SELL_STALL_GOODS', priceTier: choice.priceTier });
  }
  return next;
}
const money = (value: number): number => Number(value.toFixed(2));

describe('market stall prototype economics', () => {
  it('enumerates all 729 routes with an independent commission oracle and no inventory cash charge', () => {
    const initial: GameState = { ...createInitialState(), phase: 'DAYTIME', cash: 0, energy: 15 };
    let minimum = Infinity;
    let maximum = -Infinity;
    let bestCount = 0;
    for (let first = 0; first < 9; first += 1) {
      for (let second = 0; second < 9; second += 1) {
        for (let third = 0; third < 9; third += 1) {
          const expected = 60 + expectedCommission(0, first) + expectedCommission(1, second) + expectedCommission(2, third);
          const result = play(initial, [first, second, third]);
          expect(result.activeActivity).toMatchObject({ status: 'RESULT', income: expected, energySpent: 15 });
          expect(result.cash).toBe(expected);
          expect(result.dailyWorkIncome).toBe(expected);
          expect(result.debt).toBe(initial.debt);
          expect(result.energy).toBe(0);
          minimum = Math.min(minimum, expected);
          maximum = Math.max(maximum, expected);
          if (expected === 117) bestCount += 1;
        }
      }
    }
    expect({ minimum, maximum, bestCount }).toEqual({ minimum: 60, maximum: 117, bestCount: 1 });
    expect(initial.cash).toBe(0);
    expect(initial.activeActivity).toBeNull();
  });

  for (const gender of ['MALE', 'FEMALE'] as const) {
    for (const route of [{ name: 'matched-standard', indices: [1, 4, 7], income: 117 },
      { name: 'no-sales', indices: [3, 6, 0], income: 60 }]) {
      it(`${gender} ${route.name}: reconciles 90 days of wages, energy, weekly costs and debt without trading`, () => {
        let state = gameReducer(createInitialState(), { type: 'SELECT_CHARACTER', gender });
        let totalIncome = 0;
        let interest = 0;
        let paidCosts = 0;
        let deferredCosts = 0;
        for (let day = 1; day <= 90; day += 1) {
          const before = state;
          state = gameReducer(state, { type: 'ADVANCE_PHASE' });
          state = play(state, route.indices);
          expect(state.energy).toBe(state.energyMax - 15);
          expect(state.dailyWorkIncome).toBe(route.income);
          state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
          state = gameReducer(gameReducer(state, { type: 'ADVANCE_PHASE' }), { type: 'ADVANCE_PHASE' });
          const ledger = state.periodicCostLedger;
          const cost = ledger.rent + ledger.membership + ledger.equipment + ledger.platformShare - ledger.deferred;
          expect(state.cash).toBe(money(before.cash + route.income - cost));
          expect(state.debt).toBe(money(before.debt + ledger.interest + ledger.deferred));
          expect(state.stocks).toEqual(before.stocks);
          totalIncome += route.income;
          interest = money(interest + ledger.interest);
          paidCosts = money(paidCosts + cost);
          deferredCosts = money(deferredCosts + ledger.deferred);
          if (day >= 30) expect(state.debtCrisisStarted).toBe(true);
          if (day < 90) state = gameReducer(state, { type: 'ADVANCE_PHASE' });
        }
        expect(state.cash).toBe(money(3200 + totalIncome - paidCosts));
        expect(state.debt).toBe(money(18000 + interest + deferredCosts));
        expect(totalIncome).toBe(route.income * 90);
        expect(paidCosts).toBe(3960);
        expect(deferredCosts).toBe(0);
      });
    }
  }
});
