import type { GameState } from '../types';
import type { RiskReplayAction, RiskReplayStep } from '../riskReplayTypes';
import { riskReplayCaseForRun, riskReplayScenarioIndex, riskReplayScenarioVersion } from '../riskReplayScenarios';
import { riskReplayPolicy } from '../riskReplayRules';
import { riskReplayMemoryReviewFor } from '../riskReplayMemory';

export { riskReplayPolicy } from '../riskReplayRules';
export const riskReplayCases = [
  { stressPercent: 12, returnPercent: 6 },
  { stressPercent: 10, returnPercent: -8 },
  { stressPercent: 5, returnPercent: 2 },
] as const;
const money = (value: number): number => Number(value.toFixed(2));

export function getReplayExposure(
  equity: number,
  step: RiskReplayStep,
  allocation: number,
  stressPercent: number = riskReplayCases[step].stressPercent,
): { invested: number; stressLoss: number } {
  const invested = money(equity * allocation / 100);
  return { invested, stressLoss: money(invested * stressPercent / 100) };
}

export function reduceRiskReplay(state: GameState, action: RiskReplayAction): GameState {
  if (action.type === 'START_RISK_REPLAY') {
    if (state.phase !== 'DAYTIME' || state.activeActivity || state.riskReplayVisitedToday || state.energy < riskReplayPolicy.minimumEnergy) return state;
    const memoryReview = riskReplayMemoryReviewFor(state);
    const priorBudgetScore = memoryReview?.priorBudgetScore ?? null;
    const priorReview = memoryReview?.priorReview ?? null;
    return { ...state, riskReplayVisitedToday: true, activeActivity: {
      id: 'SWEEPER_RISK_REPLAY', day: state.day, scenarioVersion: riskReplayScenarioVersion,
      scenarioSeed: state.scenarioSeed, scenarioIndex: riskReplayScenarioIndex(state.day, state.scenarioSeed),
      priorBudgetScore, ...(priorReview ? { priorReview } : {}),
      status: 'ACTIVE', step: 0,
      equity: riskReplayPolicy.startingEquity, energySpent: 0, decisions: [],
    } };
  }
  const run = state.activeActivity;
  if (state.phase !== 'DAYTIME' || run?.id !== 'SWEEPER_RISK_REPLAY' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
  if (action.type === 'ABANDON_RISK_REPLAY') return { ...state, activeActivity: null };
  const allocation = action.allocation;
  if (!Number.isInteger(allocation) || allocation < 0 || allocation > 100 || state.energy < riskReplayPolicy.energyPerRound) return state;
  const sample = riskReplayCaseForRun(run, run.step);
  const exposure = getReplayExposure(run.equity, run.step, allocation, sample.stressPercent);
  const decision = { step: run.step, allocation, equityBefore: run.equity, ...exposure,
    withinBudget: exposure.stressLoss <= riskReplayPolicy.lossBudget,
    pnl: money(exposure.invested * sample.returnPercent / 100),
    fullPositionPnl: money(run.equity * sample.returnPercent / 100),
  };
  const decisions = [...run.decisions, decision];
  const equity = money(run.equity + decision.pnl);
  const energySpent = run.energySpent + riskReplayPolicy.energyPerRound;
  const activeActivity = run.step === 2
    ? { ...run, status: 'RESULT' as const, step: 3 as const, equity, energySpent, decisions,
      respectedBudget: decisions.filter((entry) => entry.withinBudget).length }
    : { ...run, step: (run.step + 1) as RiskReplayStep, equity, energySpent, decisions };
  return { ...state, energy: state.energy - riskReplayPolicy.energyPerRound, activeActivity };
}
