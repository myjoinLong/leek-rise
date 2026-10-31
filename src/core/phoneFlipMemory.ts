import type { GameState, PhoneFlipReturnContext } from './types';

export function phoneFlipReturnContextFor(state: GameState): PhoneFlipReturnContext | null {
  const trace = state.npcActivityMemory.phoneflip.lastTrace;
  const context = trace?.phoneFlipReturnContext;
  if (!trace || trace.activityId !== 'PHONE_FLIP' || !context
    || trace.day !== context.previousDay || context.previousDay >= state.day
    || state.day - context.previousDay > 7) return null;
  return context;
}
