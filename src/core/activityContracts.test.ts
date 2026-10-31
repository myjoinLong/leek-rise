import { describe, expect, it } from 'vitest';
import { activityContracts } from './activityContracts';
import { gameReducer } from './reducer';
import type { GameAction } from './reducer';
import { createInitialState } from './state';
import { reduceActivityAction } from './systems/activityReducer';
import { activitySchema } from '../save/activitySchemas';
import { activityScreens } from '../ui/screens/Activities/ActivityScreenRegistry';
import { entries } from '../ui/screens/Daytime/DaytimeHubEntries';
import { createEmptyNpcActivityMemory } from './npcActivityMemory';

const activityActionSamples: readonly GameAction[] = [
  { type: 'CHOOSE_DELIVERY_ROUTE', choice: 'ALLEY' },
  { type: 'CHOOSE_LONGGE_OPENING', choice: 'POST_CORRECTION' },
  { type: 'CHOOSE_LONGGE_CLUE', choice: 'VERIFY_ORIGIN' },
  { type: 'CONCLUDE_LONGGE_CHAT', conclusion: 'DISTRIBUTION' },
  { type: 'CHOOSE_STREAM_OPTION', choice: 'HONEST_REVIEW' },
  { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' },
  { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: 'BUY' },
  { type: 'ASK_JIUGE_HISTORY' },
  { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' },
  { type: 'CHOOSE_FACTORY_CHECK', choice: 'REWORK' },
  { type: 'ANSWER_CHART_LESSON', choice: 'RIDE_HIGHER_LOWS' },
  { type: 'SERVE_CAFE_ORDER', choice: 'BLACK_COFFEE' },
  { type: 'COMMIT_RISK_ALLOCATION', allocation: 0 },
  { type: 'SELECT_STALL_PRODUCT', product: 'THERMOS' },
  { type: 'SELL_STALL_GOODS', priceTier: 'STANDARD' },
  { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 10000 },
  { type: 'CHOOSE_BROKER_PLAN', plan: 'STANDARD' },
  { type: 'TEST_BIKE_PART', part: 'BATTERY' },
  { type: 'REPAIR_BIKE_FAULT', part: 'BATTERY' },
  { type: 'INSPECT_PHONE_LOT' },
  { type: 'RESOLVE_PHONE_LOT', choice: 'PASS' },
];

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

  it('routes every declared start, exit, and gameplay action through an activity system', () => {
    const state = {
      ...createInitialState(),
      phase: 'DAYTIME' as const,
      debtCrisisStarted: true,
      energy: 120,
      energyMax: 120,
    };
    const contracts = Object.values(activityContracts);
    const actionByType = new Map(activityActionSamples.map((action) => [action.type, action]));
    const declaredActionTypes = new Set(contracts.flatMap((contract) => [
      contract.startAction.type,
      ...contract.allowedActions,
    ]));
    const coveredActionTypes = new Set([
      ...activityActionSamples.map((action) => action.type),
      ...contracts.map((contract) => contract.startAction.type),
      ...contracts.map((contract) => contract.exitAction.type),
    ]);

    expect([...coveredActionTypes].sort()).toEqual([...declaredActionTypes].sort());
    for (const contract of contracts) {
      const started = gameReducer(state, contract.startAction);
      expect(started.activeActivity?.id).toBeDefined();
      const actions = [
        ...contract.allowedActions.map((type) => type === contract.exitAction.type
          ? contract.exitAction
          : actionByType.get(type)),
      ];
      expect(reduceActivityAction(state, contract.startAction), contract.startAction.type).not.toBeNull();
      for (const action of actions) {
        expect(action, `${contract.startAction.type} routes ${action?.type ?? 'missing sample'}`).toBeDefined();
        if (action) expect(reduceActivityAction(started, action), action.type).not.toBeNull();
      }

      const otherStart = contracts.find((candidate) => candidate.startAction.type !== contract.startAction.type)?.startAction;
      if (otherStart) expect(reduceActivityAction(started, otherStart), `${contract.startAction.type} rejects ${otherStart.type}`).toBeNull();
    }
  });

  it('has a gameplay screen and a street entry for each activity contract', () => {
    const contractIds = Object.keys(activityContracts).sort();
    expect(Object.keys(activityScreens).sort()).toEqual(contractIds);
    expect(entries.flatMap((entry) => entry.activityId ? [entry.activityId] : []).sort()).toEqual(contractIds);
    for (const entry of entries) {
      if (entry.activityId) expect(activityContracts[entry.activityId].npcId, entry.activityId).toBe(entry.id);
    }
  });

  it('classifies activities by their actual economy role', () => {
    const purposes = new Set(Object.values(activityContracts).map((contract) => contract.purpose));
    expect(purposes).toEqual(new Set(['income', 'information', 'practice', 'finance']));
  });

  it('assigns every NPC-owned activity to a known NPC and covers each NPC with a registered activity', () => {
    const memoryNpcIds = Object.keys(createEmptyNpcActivityMemory()).sort();
    const activityNpcIds = [...new Set(Object.values(activityContracts).map((contract) => contract.npcId))].sort();
    expect(activityNpcIds).toEqual(memoryNpcIds);
  });
});
