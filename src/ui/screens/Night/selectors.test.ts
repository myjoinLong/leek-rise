import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../../core/state';
import { selectNightVM } from './selectors';

describe('night screen crisis recovery feedback', () => {
  it('derives chapter labels and recurring cost scale from the current day', () => {
    const initial = createInitialState();
    expect(selectNightVM({ ...initial, day: 30 }).chapter).toMatchObject({ number: 1, title: '活下去', fixedCostMultiplier: 1 });
    expect(selectNightVM({ ...initial, day: 31 }).chapter).toMatchObject({ number: 2, title: '贪婪', fixedCostMultiplier: 2 });
    expect(selectNightVM({ ...initial, day: 101 }).chapter).toMatchObject({ number: 3, title: '深渊', fixedCostMultiplier: 2 });
  });

  it('shows recovery only on the night the debt threshold was reached', () => {
    const recoveredTonight = {
      ...createInitialState(),
      day: 31,
      phase: 'NIGHT' as const,
      debt: 3000,
      debtCrisisStarted: false,
      debtCrisisRecoveryDay: 31,
    };

    expect(selectNightVM(recoveredTonight).debtCrisisRecoveredTonight).toBe(true);
    expect(selectNightVM({ ...recoveredTonight, day: 32 }).debtCrisisRecoveredTonight).toBe(false);
    expect(selectNightVM({ ...recoveredTonight, phase: 'PRE_MARKET' }).debtCrisisRecoveredTonight).toBe(false);
  });
});
