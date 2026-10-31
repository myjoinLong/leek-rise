import type {
  LonggeChatActiveState,
  LonggeChatResultState,
  LonggeCaseType,
  LonggeClueChoice,
  LonggeConclusion,
  LonggeOpeningChoice,
  MarketIntel,
  GameState,
  ScriptPhase,
  StockState,
} from '../types';
import type { GameAction } from '../reducer';
import { longgeScenarioForRun, longgeScenarioIndex, longgeScenarioVersion } from './longgeChatScenarios';

const choicesByStep: readonly (readonly LonggeClueChoice[])[] = [
  ['VERIFY_ORIGIN', 'FOLLOW_REPOST'],
  ['READ_TAPE', 'WATCH_PRICE'],
  ['CHECK_NOTICE', 'ASK_GROUP'],
];

const reliableClues: readonly LonggeClueChoice[] = ['VERIFY_ORIGIN', 'READ_TAPE', 'CHECK_NOTICE', 'CHECK_GROUP_REPLY', 'CHECK_PRIVATE_CHAIN'];

export function longgeClueChoicesFor(run: Pick<LonggeChatActiveState, 'step' | 'scenarioVersion' | 'priorOpeningChoice'>): readonly LonggeClueChoice[] {
  if (run.step !== 0 || run.scenarioVersion !== longgeScenarioVersion || !run.priorOpeningChoice) {
    return choicesByStep[run.step] ?? [];
  }
  const rememberedChoice = run.priorOpeningChoice === 'POST_CORRECTION' ? 'CHECK_GROUP_REPLY' : 'CHECK_PRIVATE_CHAIN';
  return [rememberedChoice, 'FOLLOW_REPOST'];
}

function caseFromPhase(phase: ScriptPhase): LonggeCaseType {
  if (phase === 'PUMP') return 'CATALYST';
  if (phase === 'DISTRIBUTE' || phase === 'DUMP') return 'DISTRIBUTION';
  return 'ACCUMULATION';
}

export function createLonggeChat(
  day: number,
  phase: ScriptPhase,
  seed = 4,
  priorConclusion?: LonggeChatActiveState['priorConclusion'],
  priorOpeningChoice?: LonggeChatActiveState['priorOpeningChoice'],
): LonggeChatActiveState {
  const caseType = caseFromPhase(phase);
  return {
    id: 'LONGGE_CHAT', day, caseType, scenarioVersion: longgeScenarioVersion,
    scenarioSeed: seed >>> 0, scenarioIndex: longgeScenarioIndex(day, seed),
    ...(priorConclusion ? { priorConclusion } : {}),
    ...(priorOpeningChoice ? { priorOpeningChoice } : {}),
    status: 'ACTIVE', step: 0 as const, clues: [],
  };
}

export function chooseLonggeOpening(
  run: LonggeChatActiveState,
  choice: LonggeOpeningChoice,
): LonggeChatActiveState | null {
  if (run.scenarioVersion !== longgeScenarioVersion || !run.priorConclusion || run.openingChoice || run.step !== 0 || run.clues.length > 0) {
    return null;
  }
  return { ...run, openingChoice: choice };
}

export function chooseLonggeClue(
  run: LonggeChatActiveState,
  choice: LonggeClueChoice,
): LonggeChatActiveState | null {
  if (run.scenarioVersion === longgeScenarioVersion && run.priorConclusion && run.step === 0 && !run.openingChoice) return null;
  const allowed = longgeClueChoicesFor(run);
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
  const scenario = longgeScenarioForRun(run);
  const message = run.caseType === 'ACCUMULATION'
    ? confidence === 'HIGH'
      ? `「${scenario?.title ?? '当前传闻'}」仍缺少可核验的方向性信息；先观望是稳妥判断。`
      : `关于「${scenario?.title ?? '当前传闻'}」的消息和盘面都不足以确认方向，保留仓位空间或继续观察。`
    : confidence === 'UNCERTAIN'
      ? `关于「${scenario?.title ?? '当前传闻'}」的群聊与盘面证据不足以互相印证，暂不形成方向判断。`
      : run.caseType === 'DISTRIBUTION'
        ? confidence === 'HIGH'
          ? `「${scenario?.title ?? '当前传闻'}」先由旧消息造势，卖盘随后放量，未见公告；注意追高风险。`
          : `「${scenario?.title ?? '当前传闻'}」的群聊线索疑似旧消息，公开信息不足；先核实再追价。`
        : confidence === 'HIGH'
          ? `「${scenario?.title ?? '当前公告'}」与主动买入方向可以核验；趋势会变化，仍需控制仓位。`
          : `「${scenario?.title ?? '当前公告'}」的公告或成交线索大体支持上行，但核验不充分，留意趋势反转。`;
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
    id: run.id, day: run.day, caseType: run.caseType,
    scenarioVersion: run.scenarioVersion, scenarioSeed: run.scenarioSeed, scenarioIndex: run.scenarioIndex,
    ...(run.priorConclusion ? { priorConclusion: run.priorConclusion } : {}),
    ...(run.priorOpeningChoice ? { priorOpeningChoice: run.priorOpeningChoice } : {}),
    ...(run.openingChoice ? { openingChoice: run.openingChoice } : {}),
    clues: run.clues,
    status: 'RESULT', conclusion, correct, intel,
  };
}

export function reduceLonggeChatAction(state: GameState, action: GameAction): GameState | null {
  switch (action.type) {
    case 'START_LONGGE_CHAT': {
      if (state.phase !== 'DAYTIME' || state.activeActivity || state.longgeVisitedToday) return state;
      const stock = state.stocks[state.selectedStockId];
      if (!stock) return state;
      const priorTrace = state.npcActivityMemory.longge.lastTrace;
      const priorOpeningChoice = priorTrace?.activityId === 'LONGGE_CHAT'
        ? priorTrace.choiceKeys.includes('OPENING_POST_CORRECTION')
          ? 'POST_CORRECTION'
          : priorTrace.choiceKeys.includes('OPENING_KEEP_PRIVATE') ? 'KEEP_PRIVATE' : undefined
        : undefined;
      return {
        ...state,
        activeActivity: createLonggeChat(state.day, stock.scriptPhase, state.scenarioSeed, state.longgeLastConclusion ?? undefined, priorOpeningChoice),
        longgeVisitedToday: true,
      };
    }
    case 'CHOOSE_LONGGE_CLUE': {
      const run = state.activeActivity;
      if (state.phase !== 'DAYTIME' || !run || run.id !== 'LONGGE_CHAT' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
      const nextRun = chooseLonggeClue(run, action.choice);
      return nextRun ? { ...state, activeActivity: nextRun } : state;
    }
    case 'CHOOSE_LONGGE_OPENING': {
      const run = state.activeActivity;
      if (state.phase !== 'DAYTIME' || !run || run.id !== 'LONGGE_CHAT' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
      const nextRun = chooseLonggeOpening(run, action.choice);
      return nextRun ? { ...state, activeActivity: nextRun } : state;
    }
    case 'CONCLUDE_LONGGE_CHAT': {
      const run = state.activeActivity;
      if (state.phase !== 'DAYTIME' || !run || run.id !== 'LONGGE_CHAT' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
      const result = concludeLonggeChat(run, state.stocks[state.selectedStockId], action.conclusion);
      return result ? {
        ...state,
        activeActivity: result,
        marketIntel: result.intel,
        longgeLastConclusion: result.conclusion,
      } : state;
    }
    case 'ABANDON_LONGGE_CHAT':
      return state.activeActivity?.id === 'LONGGE_CHAT' && state.activeActivity.status === 'ACTIVE'
        ? { ...state, activeActivity: null }
        : state;
    default:
      return null;
  }
}
