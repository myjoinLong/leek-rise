import type {
  LonggeChatActiveState,
  LonggeChatResultState,
  LonggeCaseType,
  LonggeClueChoice,
  LonggeConclusion,
  MarketIntel,
  ScriptPhase,
  StockState,
} from '../types';

const choicesByStep: readonly (readonly LonggeClueChoice[])[] = [
  ['VERIFY_ORIGIN', 'FOLLOW_REPOST'],
  ['READ_TAPE', 'WATCH_PRICE'],
  ['CHECK_NOTICE', 'ASK_GROUP'],
];

const reliableClues: readonly LonggeClueChoice[] = ['VERIFY_ORIGIN', 'READ_TAPE', 'CHECK_NOTICE'];

function caseFromPhase(phase: ScriptPhase): LonggeCaseType {
  if (phase === 'PUMP') return 'CATALYST';
  if (phase === 'DISTRIBUTE' || phase === 'DUMP') return 'DISTRIBUTION';
  return 'ACCUMULATION';
}

export function createLonggeChat(day: number, phase: ScriptPhase): LonggeChatActiveState {
  const caseType = caseFromPhase(phase);
  return { id: 'LONGGE_CHAT', day, caseType, status: 'ACTIVE', step: 0 as const, clues: [] };
}

export function chooseLonggeClue(
  run: LonggeChatActiveState,
  choice: LonggeClueChoice,
): LonggeChatActiveState | null {
  const allowed = choicesByStep[run.step];
  if (!allowed?.includes(choice) || run.clues.includes(choice)) return null;
  const clues = [...run.clues, choice];
  return { ...run, step: (run.step + 1) as LonggeChatActiveState['step'], clues };
}

export function concludeLonggeChat(
  run: LonggeChatActiveState,
  stock: StockState | undefined,
  conclusion: LonggeConclusion,
): LonggeChatResultState | null {
  if (run.step !== 3 || !stock) return null;
  const reliableCount = run.clues.filter((clue) => reliableClues.includes(clue)).length;
  const expectedConclusion = run.caseType === 'DISTRIBUTION'
    ? 'DISTRIBUTION'
    : run.caseType === 'CATALYST' ? 'REAL_CATALYST' : 'INSUFFICIENT';
  const supportedConclusion = conclusion === expectedConclusion;
  const correct = supportedConclusion || (conclusion === 'INSUFFICIENT' && reliableCount < 2);
  const confidence: MarketIntel['confidence'] = run.caseType === 'ACCUMULATION'
    ? reliableCount >= 2 ? 'HIGH' : 'LOW'
    : supportedConclusion ? reliableCount >= 2 ? 'HIGH' : 'LOW' : 'UNCERTAIN';
  const message = run.caseType === 'ACCUMULATION'
    ? confidence === 'HIGH'
      ? '成交仍在低位整理，群聊没有可核验的方向性信息；先观望是稳妥判断。'
      : '当前消息和盘面都不足以确认方向，保留仓位空间或继续观察。'
    : confidence === 'UNCERTAIN'
      ? '群聊与盘面证据不足以互相印证，暂不形成方向判断。'
      : run.caseType === 'DISTRIBUTION'
        ? confidence === 'HIGH'
          ? '旧消息先造势，卖盘随后放量，未见公告。群聊利好缺少来源，注意追高风险。'
          : '群聊线索疑似旧消息，公开信息不足；先核实再追价。'
        : confidence === 'HIGH'
          ? '公告与主动买入方向可以核验，盘面正处于上行段；趋势会变化，仍需控制仓位。'
          : '公告或成交线索大体支持上行，但核验不充分，留意趋势反转。';
  const intel: MarketIntel = {
    day: run.day,
    stockId: stock.id,
    npcName: '龙哥',
    confidence,
    bias: confidence === 'UNCERTAIN' || run.caseType === 'ACCUMULATION'
      ? 'UNCERTAIN'
      : run.caseType === 'DISTRIBUTION' ? 'CAUTION' : 'OPPORTUNITY',
    message,
  };
  return {
    id: run.id, day: run.day, caseType: run.caseType, clues: run.clues,
    status: 'RESULT', conclusion, correct, intel,
  };
}
