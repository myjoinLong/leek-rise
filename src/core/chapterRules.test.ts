import { describe, expect, it } from 'vitest';
import { chapterForDay, fixedOperatingCostMultiplierForDay } from './chapterRules';

describe('day-based chapter progression', () => {
  it.each([
    { day: 1, number: 1, title: '活下去', multiplier: 1 },
    { day: 30, number: 1, title: '活下去', multiplier: 1 },
    { day: 31, number: 2, title: '贪婪', multiplier: 2 },
    { day: 100, number: 2, title: '贪婪', multiplier: 2 },
    { day: 101, number: 3, title: '深渊', multiplier: 2 },
  ] as const)('maps day $day to its chapter and disclosed cost scale', ({ day, number, title, multiplier }) => {
    expect(chapterForDay(day)).toMatchObject({ number, title });
    expect(fixedOperatingCostMultiplierForDay(day)).toBe(multiplier);
  });
});
