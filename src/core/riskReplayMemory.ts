import type { GameState } from './types';
import type { RiskReplayPriorReview } from './riskReplayTypes';
import { riskReplayPolicy } from './riskReplayRules';
import { riskReplayScenarioAt, riskReplayScenarioCount, riskReplayScenarioIndex, riskReplayScenarioVersion } from './riskReplayScenarios';

const money = (value: number): number => Number(value.toFixed(2));

export interface RiskReplayMemoryReview {
  priorBudgetScore: number;
  priorReview: RiskReplayPriorReview | null;
}

function allocationFromChoice(choice: string | undefined): number | null {
  const match = /^ALLOCATION_(\d{1,3})$/.exec(choice ?? '');
  if (!match) return null;
  const allocation = Number(match[1]);
  return Number.isInteger(allocation) && allocation >= 0 && allocation <= 100 && choice === `ALLOCATION_${allocation}`
    ? allocation
    : null;
}

export function riskReplayMemoryReviewFor(state: GameState): RiskReplayMemoryReview | null {
  const trace = state.npcActivityMemory.sweeper.lastTrace;
  if (trace?.activityId !== 'SWEEPER_RISK_REPLAY' || trace.scenarioVersion !== riskReplayScenarioVersion
    || typeof trace.day !== 'number' || !Number.isInteger(trace.day) || trace.day <= 0 || trace.day >= state.day
    || typeof trace.scenarioSeed !== 'number' || !Number.isInteger(trace.scenarioSeed)
    || trace.scenarioSeed < 0 || trace.scenarioSeed > 0xFFFFFFFF
    || typeof trace.scenarioIndex !== 'number' || !Number.isInteger(trace.scenarioIndex)
    || trace.scenarioIndex < 0 || trace.scenarioIndex >= riskReplayScenarioCount
    || trace.scenarioIndex !== riskReplayScenarioIndex(trace.day, trace.scenarioSeed)
    || trace.score === null || !Number.isInteger(trace.score) || trace.score < 0 || trace.score > 3
    || trace.choiceKeys.length !== 3) {
    return null;
  }

  const scenario = riskReplayScenarioAt(trace.scenarioIndex);
  let equity: number = riskReplayPolicy.startingEquity;
  let priorBudgetScore = 0;
  let priorReview: RiskReplayPriorReview | null = null;
  for (const step of [0, 1, 2] as const) {
    const allocation = allocationFromChoice(trace.choiceKeys[step]);
    if (allocation === null) return null;
    const sample = scenario.cases[step];
    const invested = money(equity * allocation / 100);
    const stressLoss = money(invested * sample.stressPercent / 100);
    if (stressLoss > riskReplayPolicy.lossBudget) {
      if (priorReview === null) priorReview = {
        previousDay: trace.day,
        previousStep: step,
        previousAllocation: allocation,
        equityBefore: equity,
        stressPercent: sample.stressPercent,
        stressLoss,
      };
    } else priorBudgetScore += 1;
    equity = money(equity + money(invested * sample.returnPercent / 100));
  }
  if (trace.score !== priorBudgetScore) return null;
  return { priorBudgetScore, priorReview };
}
