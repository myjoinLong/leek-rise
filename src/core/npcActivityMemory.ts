import type { ActiveActivityState, GameState, NpcActivityMemory } from './types';
import { activityContracts } from './activityContracts';
import { traceCompletedActivity } from './npcActivityTrace';

export const npcMemoryTraceLimit = 8;

export function createEmptyNpcActivityMemory(): NpcActivityMemory {
  const createEntry = () => ({ completedRuns: 0, lastCompletedDay: null, lastTrace: null, recentTraces: [] });
  return {
    jiuge: createEntry(), longge: createEntry(), chen: createEntry(), bodhisattva: createEntry(),
    xiaolian: createEntry(), sujie: createEntry(), zhou: createEntry(), wang: createEntry(),
    laoliang: createEntry(), sweeper: createEntry(), delivery: createEntry(), zheng: createEntry(),
    phoneflip: createEntry(),
  };
}

export function npcMemoryFromLegacyActivity(activity: ActiveActivityState | null): NpcActivityMemory {
  const memory = createEmptyNpcActivityMemory();
  if (!activity || activity.status !== 'RESULT') return memory;
  const npcId = activityContracts[activity.id].npcId;
  const trace = traceCompletedActivity(activity);
  memory[npcId] = {
    completedRuns: 1,
    lastCompletedDay: activity.day,
    lastTrace: trace,
    recentTraces: trace ? [trace] : [],
  };
  return memory;
}

export function rememberCompletedActivity(previous: GameState, next: GameState): GameState {
  const started = previous.activeActivity;
  const completed = next.activeActivity;
  if (!started || started.status !== 'ACTIVE' || !completed || completed.status !== 'RESULT' || started.id !== completed.id) {
    return next;
  }

  const npcId = activityContracts[started.id].npcId;
  const previousMemory = previous.npcActivityMemory[npcId];
  const trace = traceCompletedActivity(completed);
  const history = previousMemory.recentTraces.length > 0
    ? previousMemory.recentTraces
    : previousMemory.lastTrace ? [previousMemory.lastTrace] : [];
  const recentTraces = trace ? [...history, trace].slice(-npcMemoryTraceLimit) : history;
  return {
    ...next,
    npcActivityMemory: {
      ...next.npcActivityMemory,
      [npcId]: {
        completedRuns: previousMemory.completedRuns + 1,
        lastCompletedDay: started.day,
        lastTrace: trace,
        recentTraces,
      },
    },
  };
}
