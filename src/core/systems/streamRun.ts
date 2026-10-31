import type { GameState, PlayerGender, StreamChoice, StreamDecision, StreamRunActiveState, StreamRunState, StreamStep } from '../types';
import type { GameAction } from '../reducer';
import type { StreamScenario } from '../streamScenarios';
import { streamScenarioFor } from '../streamScenarios';
import { streamReturnContextFor } from '../streamRunMemory';
import type { StreamReturnContext } from '../streamRunTypes';

export interface StreamOptionEffect {
  choice: StreamChoice;
  audienceDelta: number;
  trustDelta: number;
  salesPoints: number;
  energyCost: number;
}

const effectsByStep: readonly (readonly StreamOptionEffect[])[] = [
  [
    { choice: 'HONEST_REVIEW', audienceDelta: 5, trustDelta: 12, salesPoints: 2, energyCost: 5 },
    { choice: 'HYPE_CLAIM', audienceDelta: 15, trustDelta: -8, salesPoints: 4, energyCost: 5 },
  ],
  [
    { choice: 'ANSWER_QUESTIONS', audienceDelta: 8, trustDelta: 8, salesPoints: 2, energyCost: 5 },
    { choice: 'REPEAT_CTA', audienceDelta: 16, trustDelta: -3, salesPoints: 4, energyCost: 5 },
  ],
  [
    { choice: 'TRANSPARENT_DEAL', audienceDelta: 5, trustDelta: 10, salesPoints: 3, energyCost: 5 },
    { choice: 'FAKE_SCARCITY', audienceDelta: 12, trustDelta: -12, salesPoints: 6, energyCost: 5 },
  ],
];

export const minimumStreamEnergy = effectsByStep.reduce(
  (total, options) => total + Math.min(...options.map((option) => option.energyCost)),
  0,
);

export function streamChoicesForStep(step: StreamStep): readonly StreamChoice[] {
  return effectsByStep[step]!.map((effect) => effect.choice);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createStreamRun(
  day: number,
  fame: number,
  seed = 4,
  scenarioVersion: 1 | 2 | 3 = 1,
  returnContext?: StreamReturnContext | null,
): StreamRunActiveState {
  return {
    id: 'XIAOLIAN_STREAM',
    day,
    scenarioVersion,
    scenarioSeed: seed >>> 0,
    ...(returnContext ? { returnContext } : {}),
    status: 'ACTIVE',
    step: 0,
    audience: clamp(25 + Math.floor(fame / 4), 10, 60),
    trust: 50,
    salesPoints: 0,
    energySpent: 0,
    decisions: [],
  };
}

export function getStreamOptionEffect(
  step: StreamStep,
  choice: StreamChoice,
  scenario?: StreamScenario,
  returnContext?: StreamReturnContext,
): StreamOptionEffect | null {
  const base = effectsByStep[step]?.find((option) => option.choice === choice);
  if (!base) return null;
  let scenarioEffect = base;
  if (!scenario || scenario.id === 'legacy') return applyReturnPressure(step, base, returnContext);

  switch (choice) {
    case 'HONEST_REVIEW':
      scenarioEffect = { ...base, audienceDelta: base.audienceDelta + scenario.dealFit, trustDelta: base.trustDelta + scenario.proofDemand,
        salesPoints: base.salesPoints + Math.max(0, scenario.dealFit) };
      break;
    case 'HYPE_CLAIM':
      scenarioEffect = { ...base, audienceDelta: base.audienceDelta + scenario.topicHeat, trustDelta: base.trustDelta - scenario.claimRisk * 2,
        salesPoints: base.salesPoints + scenario.urgency };
      break;
    case 'ANSWER_QUESTIONS':
      scenarioEffect = { ...base, audienceDelta: base.audienceDelta + scenario.proofDemand, trustDelta: base.trustDelta + scenario.proofDemand,
        salesPoints: base.salesPoints + Math.max(0, scenario.dealFit) };
      break;
    case 'REPEAT_CTA':
      scenarioEffect = { ...base, audienceDelta: base.audienceDelta + scenario.urgency, trustDelta: base.trustDelta - scenario.claimRisk,
        salesPoints: base.salesPoints + scenario.urgency };
      break;
    case 'TRANSPARENT_DEAL':
      scenarioEffect = { ...base, audienceDelta: base.audienceDelta + scenario.dealFit, trustDelta: base.trustDelta + scenario.proofDemand,
        salesPoints: base.salesPoints + scenario.dealFit };
      break;
    case 'FAKE_SCARCITY':
      scenarioEffect = { ...base, audienceDelta: base.audienceDelta + scenario.topicHeat, trustDelta: base.trustDelta - scenario.claimRisk * 2 - scenario.urgency,
        salesPoints: base.salesPoints + scenario.urgency };
      break;
  }
  return applyReturnPressure(step, scenarioEffect, returnContext);
}

function applyReturnPressure(
  step: StreamStep,
  effect: StreamOptionEffect,
  context?: StreamReturnContext,
): StreamOptionEffect {
  if (step !== 0 || !context) return effect;
  if (effect.choice === 'HONEST_REVIEW') {
    return { ...effect, audienceDelta: effect.audienceDelta - 2, trustDelta: effect.trustDelta + 8 };
  }
  if (effect.choice === 'HYPE_CLAIM') {
    return { ...effect, audienceDelta: effect.audienceDelta + 3, trustDelta: effect.trustDelta - 10, salesPoints: effect.salesPoints + 1 };
  }
  return effect;
}

export function advanceStreamRun(
  run: StreamRunActiveState,
  choice: StreamChoice,
  gender: PlayerGender | null,
  returnContext?: StreamReturnContext,
): StreamRunState | null {
  const scenario = streamScenarioFor(run.day, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
  const effect = getStreamOptionEffect(run.step, choice, scenario, returnContext ?? run.returnContext);
  if (!effect) return null;

  const decision: StreamDecision = {
    step: run.step,
    choice,
    audienceDelta: effect.audienceDelta,
    trustDelta: effect.trustDelta,
    salesPoints: effect.salesPoints,
  };
  const audience = clamp(run.audience + effect.audienceDelta, 0, 100);
  const trust = clamp(run.trust + effect.trustDelta, 0, 100);
  const salesPoints = run.salesPoints + effect.salesPoints;
  const decisions = [...run.decisions, decision];
  const energySpent = run.energySpent + effect.energyCost;

  if (run.step < 2) {
    return {
      ...run,
      step: (run.step + 1) as StreamStep,
      audience,
      trust,
      salesPoints,
      energySpent,
      decisions,
    };
  }

  const roleMultiplier = gender === 'FEMALE' ? 1.2 : 1;
  const income = Number(((salesPoints * 10 + Math.floor(audience / 10) * 5) * roleMultiplier).toFixed(2));
  const fameDelta = clamp(Math.floor((trust - 50) / 10) + Math.floor(audience / 25) - 1, -5, 6);
  return {
    ...run,
    status: 'RESULT',
    step: 3,
    audience,
    trust,
    salesPoints,
    energySpent,
    decisions,
    income,
    fameDelta,
  };
}

export function streamIncomeRange(
  fame: number,
  gender: PlayerGender | null,
  day = 1,
  seed = 4,
  scenarioVersion: 1 | 2 | 3 = 1,
  returnContext?: StreamReturnContext,
): { minimum: number; maximum: number } {
  const incomes: number[] = [];
  const explore = (step: number, run: StreamRunActiveState): void => {
    for (const effect of effectsByStep[step] ?? []) {
      const next = advanceStreamRun(run, effect.choice, gender, returnContext);
      if (!next) continue;
      if (next.status === 'RESULT') incomes.push(next.income);
      else explore(step + 1, next);
    }
  };

  explore(0, createStreamRun(day, fame, seed, scenarioVersion, returnContext));
  return { minimum: Math.min(...incomes), maximum: Math.max(...incomes) };
}

export function reduceStreamRunAction(state: GameState, action: GameAction): GameState | null {
  switch (action.type) {
    case 'START_STREAM_RUN':
      if (state.phase !== 'DAYTIME' || state.activeActivity || state.streamedToday || state.energy < minimumStreamEnergy) return state;
      return {
        ...state,
        activeActivity: createStreamRun(state.day, state.fame, state.scenarioSeed, 3, streamReturnContextFor(state)),
        streamedToday: true,
      };
    case 'CHOOSE_STREAM_OPTION': {
      const run = state.activeActivity;
      if (state.phase !== 'DAYTIME' || !run || run.id !== 'XIAOLIAN_STREAM' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
      const nextRun = advanceStreamRun(run, action.choice, state.gender);
      if (!nextRun) return state;
      const energyCost = nextRun.energySpent - run.energySpent;
      const nextState: GameState = {
        ...state,
        energy: Math.max(0, state.energy - energyCost),
        activeActivity: nextRun,
      };
      if (nextRun.status !== 'RESULT') return nextState;
      return {
        ...nextState,
        cash: Number((state.cash + nextRun.income).toFixed(2)),
        dailyStreamIncome: Number((state.dailyStreamIncome + nextRun.income).toFixed(2)),
        weeklyStreamIncome: Number((state.weeklyStreamIncome + nextRun.income).toFixed(2)),
        fame: Math.max(0, Math.min(100, state.fame + nextRun.fameDelta)),
      };
    }
    case 'ABANDON_STREAM_RUN':
      return state.activeActivity?.id === 'XIAOLIAN_STREAM' && state.activeActivity.status === 'ACTIVE'
        ? { ...state, activeActivity: null }
        : state;
    default:
      return null;
  }
}
