import { describe, expect, it } from 'vitest';
import { factoryShiftChoices } from './FactoryShiftScreen';

describe('factory shift screen choices', () => {
  it.each([3, 4, 5] as const)('shows isolation for continuation version %s', (scenarioVersion) => {
    expect(factoryShiftChoices(31, scenarioVersion)).toContain('HOLD');
  });

  it('keeps isolation out of the first chapter and legacy versions', () => {
    expect(factoryShiftChoices(30, 5)).not.toContain('HOLD');
    expect(factoryShiftChoices(31, 2)).not.toContain('HOLD');
    expect(factoryShiftChoices(31)).not.toContain('HOLD');
  });
});
