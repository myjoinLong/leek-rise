import type { GameAction } from '../reducer';
import type { ChartLessonActiveState, ChartLessonChoice, ChartLessonReview, ChartLessonSignal, ChartLessonState, ChartLessonStep } from '../chartLessonTypes';
import type { GameState, MarketIntel, StockState } from '../types';
import { chartLessonScenarioAt, chartLessonScenarioIndex, chartLessonScenarioVersion } from '../chartLessonScenarios';

export const chartLessonEnergyPerRound = 3;
export const chartLessonRounds = 3;
export const minimumChartLessonEnergy = chartLessonEnergyPerRound * chartLessonRounds;

const choicesByStep: readonly (readonly ChartLessonChoice[])[] = [
  ['RIDE_HIGHER_LOWS', 'CHASE_LAST_SPIKE', 'SELL_FIRST_PULLBACK'],
  ['WAIT_FOR_VOLUME', 'BUY_ANY_BREAKOUT', 'IGNORE_VOLUME'],
  ['WAIT_FOR_RANGE_BREAK', 'ASSUME_REVERSAL', 'DOUBLE_POSITION'],
];
const correctChoices: readonly ChartLessonChoice[] = ['RIDE_HIGHER_LOWS', 'WAIT_FOR_VOLUME', 'WAIT_FOR_RANGE_BREAK'];

const chartSamples: readonly { signal: ChartLessonSignal; prices: readonly number[] }[] = [
  { signal: 'HIGHER_LOWS', prices: [10, 10.08, 10.04, 10.13, 10.09, 10.2, 10.16, 10.28] },
  { signal: 'WEAK_BREAKOUT', prices: [10, 10.06, 10.1, 10.08, 10.17, 10.12, 10.2, 10.15] },
  { signal: 'NARROW_RANGE', prices: [10, 10.02, 9.99, 10.01, 10.03, 9.98, 10.02, 10.01] },
];

export function getChartLessonSample(step: ChartLessonStep, scenarioIndex?: number): { signal: ChartLessonSignal; prices: readonly number[] } {
  const sample = chartSamples[step]!;
  if (scenarioIndex === undefined) return sample;

  const scenario = chartLessonScenarioAt(scenarioIndex);
  const priceRange = Math.max(...sample.prices) - Math.min(...sample.prices);
  const prices = sample.prices.map((price, pointIndex) => {
    const phase = (scenario.index % 97) * 0.19 + step * 1.37;
    const wave = Math.sin((pointIndex + 1) * 1.71 + phase);
    return Number((price + wave * priceRange * scenario.noiseAmplitude).toFixed(4));
  });
  return { ...sample, prices };
}

export function createChartLesson(
  day: number,
  stockId: string,
  scenarioSeed = 4,
  priorScore: number | null = null,
  priorReview?: ChartLessonReview,
): ChartLessonActiveState {
  return {
    id: 'BODHISATTVA_CHART_LESSON',
    day,
    stockId,
    scenarioVersion: chartLessonScenarioVersion,
    scenarioSeed,
    scenarioIndex: chartLessonScenarioIndex(day, scenarioSeed),
    priorScore,
    ...(priorReview ? { priorReview } : {}),
    status: 'ACTIVE',
    step: 0,
    decisions: [],
    energySpent: 0,
  };
}

function createIntel(day: number, stock: StockState | undefined, score: number): MarketIntel | null {
  if (score < 2 || !stock || stock.priceHistory.length < 2) return null;
  const recent = stock.priceHistory.slice(-8);
  const first = recent[0] ?? stock.price;
  const last = recent[recent.length - 1] ?? stock.price;
  const change = first > 0 ? (last - first) / first : 0;
  const bias: MarketIntel['bias'] = change > 0.005 ? 'OPPORTUNITY' : change < -0.005 ? 'CAUTION' : 'UNCERTAIN';
  const message = bias === 'OPPORTUNITY'
    ? '近期价格重心抬高，图形偏强；历史走势不保证延续，仍要核对成交并控制仓位。'
    : bias === 'CAUTION'
      ? '近期价格重心走低，图形偏弱；短线反弹不能证明趋势反转，留意自己的风险位。'
      : '近期价格仍在窄幅波动，方向暂不清晰；等待形态确认比猜方向稳妥。';
  return { day, stockId: stock.id, npcName: 'K线菩萨', confidence: 'LOW', bias, message };
}

function reviewFromTrace(trace: GameState['npcActivityMemory']['bodhisattva']['lastTrace']): ChartLessonReview | undefined {
  if (trace?.activityId !== 'BODHISATTVA_CHART_LESSON'
    || trace.day === undefined || !Number.isInteger(trace.day) || trace.day < 1) return undefined;

  for (let index = 0; index < chartLessonRounds; index += 1) {
    const step = index as ChartLessonStep;
    const choice = choicesByStep[step]!.find((candidate) => candidate === trace.choiceKeys[index]);
    if (!choice) return undefined;
    if (choice !== correctChoices[index]) {
      return { previousDay: trace.day, step, choice, signal: chartSamples[index]!.signal };
    }
  }
  return undefined;
}

export function answerChartLesson(
  run: ChartLessonActiveState,
  choice: ChartLessonChoice,
  stock: StockState | undefined,
): ChartLessonState | null {
  if (!choicesByStep[run.step]?.includes(choice) || run.decisions.some((decision) => decision.step === run.step)) return null;
  const correct = correctChoices[run.step] === choice;
  const decision = { step: run.step, choice, correct };
  const decisions = [...run.decisions, decision];
  const energySpent = run.energySpent + chartLessonEnergyPerRound;
  if (run.step < chartLessonRounds - 1) {
    return { ...run, step: (run.step + 1) as ChartLessonStep, decisions, energySpent };
  }
  const completeDecisions = decisions as [typeof decision, typeof decision, typeof decision];
  const score = completeDecisions.filter((entry) => entry.correct).length;
  return {
    ...run,
    status: 'RESULT',
    step: 3,
    decisions: completeDecisions,
    energySpent,
    score,
    intel: createIntel(run.day, stock, score),
  };
}

export function reduceChartLessonAction(state: GameState, action: GameAction): GameState | null {
  if (action.type === 'START_CHART_LESSON') {
    if (state.phase !== 'DAYTIME' || state.activeActivity || state.chartLessonVisitedToday
      || state.energy < minimumChartLessonEnergy || !state.stocks[state.selectedStockId]) return state;
    const previousTrace = state.npcActivityMemory.bodhisattva.lastTrace;
    const priorScore = previousTrace?.activityId === 'BODHISATTVA_CHART_LESSON' ? previousTrace.score : null;
    return {
      ...state,
      activeActivity: createChartLesson(
        state.day,
        state.selectedStockId,
        state.scenarioSeed,
        priorScore,
        reviewFromTrace(previousTrace),
      ),
      chartLessonVisitedToday: true,
    };
  }
  if (action.type === 'ANSWER_CHART_LESSON') {
    const run = state.activeActivity;
    if (state.phase !== 'DAYTIME' || !run || run.id !== 'BODHISATTVA_CHART_LESSON'
      || run.status !== 'ACTIVE' || run.day !== state.day || state.energy < chartLessonEnergyPerRound) return state;
    const nextRun = answerChartLesson(run, action.choice, state.stocks[run.stockId]);
    if (!nextRun) return state;
    return {
      ...state,
      energy: state.energy - chartLessonEnergyPerRound,
      activeActivity: nextRun,
      ...(nextRun.status === 'RESULT' && nextRun.intel ? { marketIntel: nextRun.intel } : {}),
    };
  }
  if (action.type === 'ABANDON_CHART_LESSON') {
    const run = state.activeActivity;
    return run?.id === 'BODHISATTVA_CHART_LESSON' && run.status === 'ACTIVE'
      ? { ...state, activeActivity: null }
      : state;
  }
  return null;
}
