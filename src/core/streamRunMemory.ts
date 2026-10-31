import type { GameState, StreamReturnContext } from './types';

const memoryWindowDays = 7;

export function streamReturnContextFor(state: GameState): StreamReturnContext | null {
  const trace = state.npcActivityMemory.xiaolian.lastTrace;
  if (
    trace?.activityId !== 'XIAOLIAN_STREAM'
    || trace.day === undefined
    || trace.day >= state.day
    || state.day - trace.day > memoryWindowDays
  ) return null;

  const kind = trace.choiceKeys.includes('HYPE_CLAIM')
    ? 'OVERCLAIM'
    : trace.choiceKeys.includes('FAKE_SCARCITY') ? 'FAKE_SCARCITY' : null;
  if (!kind) return null;

  return {
    previousDay: trace.day,
    previousProduct: trace.streamScenarioTitle ?? '上次直播的商品',
    kind,
  };
}

export function streamReturnConcern(context: StreamReturnContext): string {
  return context.kind === 'OVERCLAIM' ? '上次夸大了商品效果' : '上次虚构了库存紧张';
}
