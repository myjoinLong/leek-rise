import { describe, expect, it } from 'vitest';
import { prototypeExperiment, simulateEconomy } from './economySimulation';

describe('factory continuation simulation', () => {
  it('keeps correct choices aligned and preserves the disclosed wage after the first chapter', () => {
    const result = simulateEconomy({
      strategy: 'FACTORY',
      days: 31,
      ticksPerDay: 0,
      gender: 'MALE',
      deliveryRoute: prototypeExperiment.deliveryRoute,
      seed: 811,
    });

    expect(result.daily).toHaveLength(31);
    expect(result.daily[30]).toMatchObject({ day: 31, workIncome: 120 });
    expect(result.totals.workIncome).toBe(120 * 31);
  });
});
