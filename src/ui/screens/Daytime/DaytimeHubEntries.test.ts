import { describe, expect, it } from 'vitest';
import { activityContracts } from '../../../core/activityContracts';
import { createInitialState } from '../../../core/state';
import { entries } from './DaytimeHubEntries';

describe('daytime hub entry manifest', () => {
  it('keeps every scene hotspot uniquely placed and every implemented activity routed', () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(entries.length);
    const positions = entries.map((entry) => entry.x + ':' + entry.y);
    expect(new Set(positions).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.x).toBeGreaterThanOrEqual(0);
      expect(entry.x).toBeLessThanOrEqual(100);
      expect(entry.y).toBeGreaterThanOrEqual(0);
      expect(entry.y).toBeLessThanOrEqual(100);
      expect(typeof entry.getPresentation).toBe('function');
    }

    const state = { ...createInitialState(), phase: 'DAYTIME' as const };
    const implementedIds = ids.filter((id) => id !== 'zhou');
    for (const id of implementedIds) {
      const entry = entries.find((candidate) => candidate.id === id);
      expect(entry?.getPresentation(state).primaryAction, id).not.toBeNull();
    }
    const zhou = entries.find((entry) => entry.id === 'zhou')?.getPresentation(state);
    expect(zhou).toMatchObject({
      primaryAction: { type: 'START_BROKER_NEGOTIATION' },
      primaryDisabled: false,
      primaryLabel: '进入佣金谈判副本 · 可免费保留标准账户',
    });

    const activityEntries = entries.filter((entry) => entry.activityId);
    expect(activityEntries.map((entry) => entry.activityId).sort()).toEqual(Object.keys(activityContracts).sort());
  });

  it('derives availability from shared game state, including Jiuge’s crisis branch', () => {
    const state = { ...createInitialState(), phase: 'DAYTIME' as const };
    const byId = (id: string) => entries.find((entry) => entry.id === id)!;

    expect(byId('delivery').getPresentation({ ...state, workedToday: true }).primaryDisabled).toBe(true);
    expect(byId('sujie').getPresentation({ ...state, energy: 14 }).prompt).toBe('精力不足');
    expect(byId('chen').getPresentation({ ...state, chenVisitedToday: true }).primaryLabel).toBe('今天已经核验过材料');
    expect(byId('jiuge').getPresentation(state).primaryAction).toEqual({ type: 'BORROW_FROM_NPC' });
    expect(byId('jiuge').getPresentation({ ...state, debtCrisisStarted: true }).primaryAction)
      .toEqual({ type: 'START_JIUGE_NEGOTIATION' });
    const crisisState = { ...state, debtCrisisStarted: true };
    for (const entry of entries.filter((candidate) => candidate.activityId)) {
      const contract = activityContracts[entry.activityId!];
      const entryState = entry.id === 'jiuge' ? crisisState : state;
      expect(entry.getPresentation(entryState).primaryAction, entry.id).toEqual(contract.startAction);
    }
  });
});
