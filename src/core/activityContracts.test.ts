import { describe, expect, it } from 'vitest';
import { activityContracts } from './activityContracts';
import { gameReducer } from './reducer';
import { createInitialState } from './state';
import { activitySchema } from '../save/activitySchemas';
import { activityScreens } from '../ui/screens/Activities/ActivityScreenRegistry';
import { entries } from '../ui/screens/Daytime/DaytimeHubEntries';

describe('activity registration contract', () => {
  it('starts every registered activity and accepts its initial state in the save schema', () => {
    const state = {
      ...createInitialState(),
      phase: 'DAYTIME' as const,
      debtCrisisStarted: true,
      energy: 120,
      energyMax: 120,
    };

    for (const [id, contract] of Object.entries(activityContracts)) {
      const started = gameReducer(state, contract.startAction);
      expect(started.activeActivity?.id, id).toBe(id);
      expect(activitySchema.safeParse(started.activeActivity).success, id).toBe(true);
      expect(contract.allowedActions, id).toContain(contract.exitAction.type);
      expect(gameReducer(started, contract.exitAction).activeActivity, id).toBeNull();
    }
  });

  it('has a gameplay screen and a street entry for each activity contract', () => {
    const contractIds = Object.keys(activityContracts).sort();
    expect(Object.keys(activityScreens).sort()).toEqual(contractIds);
    expect(entries.flatMap((entry) => entry.activityId ? [entry.activityId] : []).sort()).toEqual(contractIds);
  });

  it('classifies activities by their actual economy role', () => {
    const purposes = new Set(Object.values(activityContracts).map((contract) => contract.purpose));
    expect(purposes).toEqual(new Set(['income', 'information', 'practice', 'finance']));
  });
});
