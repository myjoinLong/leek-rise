import type { GameState } from './types';
import type { BikeRepairReturnContext } from './zhengBikeRepairTypes';

export function zhengRepairReturnContextFor(state: GameState): BikeRepairReturnContext | null {
  const trace = state.npcActivityMemory.zheng.lastTrace;
  const context = trace?.zhengRepairReturnContext;
  if (!trace || trace.activityId !== 'ZHENG_BIKE_REPAIR' || !context
    || trace.day !== context.previousDay || context.previousDay >= state.day
    || state.day - context.previousDay > 7) return null;
  return context;
}
