import { describe, expect, it } from 'vitest';
import { gameReducer } from './reducer';
import { createInitialState } from './state';
import type { GameState } from './types';

describe('batched market ticks', () => {
  it.each([1, 5, 20, 59, 60, 75])('matches %s sequential ticks exactly', (count) => {
    const initial: GameState = { ...createInitialState(42), phase: 'TRADING' };
    let expected = initial;
    for (let tick = 0; tick < count; tick += 1) {
      expected = gameReducer(expected, { type: 'ADVANCE_TICK' });
    }

    expect(gameReducer(initial, { type: 'ADVANCE_TICKS', count })).toEqual(expected);
    expect(initial.marketTicksThisDay).toBe(0);
  });

  it('preserves selected and held market state when the simulation limits irrelevant listings', () => {
    const initial: GameState = { ...createInitialState(42), phase: 'TRADING' };
    const full = gameReducer(initial, { type: 'ADVANCE_TICKS', count: 20 });
    const simulated = gameReducer(initial, {
      type: 'ADVANCE_TICKS',
      count: 20,
      stockIds: ['dragon'],
    });

    expect(simulated.stocks.dragon).toEqual(full.stocks.dragon);
    expect(simulated.stocks.harbor).toEqual(initial.stocks.harbor);
    expect(simulated.marketTicksThisDay).toBe(full.marketTicksThisDay);
  });
});
