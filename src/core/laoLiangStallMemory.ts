import type { GameState } from './types';
import type { LaoLiangReturnContext, StallProduct } from './marketStallTypes';

const validProducts: readonly StallProduct[] = ['THERMOS', 'RAINCOAT', 'CABLE'];

export function laoLiangReturnContextFor(state: GameState): LaoLiangReturnContext | null {
  const trace = state.npcActivityMemory.laoliang.lastTrace;
  const context = trace?.laoLiangReturnContext;
  if (trace?.activityId !== 'LAOLIANG_MARKET_STALL' || trace.scenarioVersion !== 3
    || typeof trace.day !== 'number' || !Number.isInteger(trace.day) || trace.day <= 0 || trace.day >= state.day
    || typeof trace.scenarioSeed !== 'number' || !Number.isInteger(trace.scenarioSeed) || trace.scenarioSeed < 0 || trace.scenarioSeed > 0xFFFFFFFF
    || trace.choiceKeys.length !== 3 || !context || context.previousDay !== trace.day || !validProducts.includes(context.product)) return null;

  const eligibleChoices = trace.choiceKeys.filter((choice) => /^(THERMOS|RAINCOAT|CABLE)_(VALUE|STANDARD)$/.test(choice));
  if (eligibleChoices.length < 2 || !eligibleChoices.some((choice) => choice.startsWith(context.product + '_'))) return null;
  return context;
}
