import type { GameState, JiugeNegotiationAction, JiugeNegotiationActiveState, JiugeNegotiationChoice, JiugeNegotiationResultState, JiugeNegotiationStep, JiugeNegotiationState } from '../types';
import { periodicCostPolicy } from './periodicCosts';
import { createDebtInstallmentPlan } from './debtInstallments';
import { getJiugeNegotiationScenarioIndex } from '../jiugeNegotiationScenarios';

const choicesByStep: Record<JiugeNegotiationStep, readonly JiugeNegotiationChoice[]> = {
  0: ['SHOW_LEDGER', 'BLUFF_CASHFLOW'],
  1: ['PROVE_INCOME', 'PROMISE_FULL'],
  2: ['ASK_INTEREST_GRACE', 'SIGN_RATE_RESTRUCTURE', 'SIGN_INSTALLMENTS', 'SIGN_STANDARD'],
};

function createRun(day: number, seed: number): JiugeNegotiationActiveState {
  return {
    id: 'JIUGE_NEGOTIATION', day, status: 'ACTIVE', step: 0, decisions: [],
    scenarioVersion: 2, scenarioSeed: seed, scenarioIndex: getJiugeNegotiationScenarioIndex(day, seed),
  };
}

function advanceRun(
  run: JiugeNegotiationActiveState,
  choice: JiugeNegotiationChoice,
  state: GameState,
): JiugeNegotiationState | null {
  if (!choicesByStep[run.step].includes(choice)) return null;
  const hasIncomeEvidence = state.dailyWorkIncome + state.dailyStreamIncome > 0 || state.weeklyStreamIncome > 0;
  if (choice === 'PROVE_INCOME' && !hasIncomeEvidence) return null;
  const hasLedger = run.decisions.some((decision) => decision.choice === 'SHOW_LEDGER');
  const hasIncomeProof = run.decisions.some((decision) => decision.choice === 'PROVE_INCOME');
  const canSignRatePlan = state.cash >= periodicCostPolicy.restructuringFee
    && state.debtRatePlanWeeksRemaining === 0
    && state.debtInterestGraceWeeksRemaining === 0
    && state.debt > 0
    && hasLedger
    && hasIncomeProof;
  if (choice === 'SIGN_RATE_RESTRUCTURE' && !canSignRatePlan) return null;
  if (choice === 'SIGN_INSTALLMENTS' && (!hasLedger || !hasIncomeProof || state.debt <= 0 || state.debtInstallmentPlan
    || state.debtRatePlanWeeksRemaining > 0 || state.debtInterestGraceWeeksRemaining > 0)) return null;
  const decisions = [...run.decisions, { step: run.step, choice }];
  if (run.step < 2) {
    const step: JiugeNegotiationStep = run.step === 0 ? 1 : 2;
    return { ...run, step, decisions };
  }
  const result: JiugeNegotiationResultState = {
    id: 'JIUGE_NEGOTIATION',
    day: run.day,
    status: 'RESULT',
    step: 3,
    decisions,
    ...(run.askedAboutHistory ? { askedAboutHistory: true } : {}),
    ...(run.scenarioVersion !== undefined ? { scenarioVersion: run.scenarioVersion } : {}),
    ...(run.scenarioSeed !== undefined ? { scenarioSeed: run.scenarioSeed } : {}),
    ...(run.scenarioIndex !== undefined ? { scenarioIndex: run.scenarioIndex } : {}),
    outcome: hasLedger && hasIncomeProof && choice === 'ASK_INTEREST_GRACE'
      ? 'INTEREST_GRACE'
      : choice === 'SIGN_RATE_RESTRUCTURE' ? 'RATE_RESTRUCTURE' : choice === 'SIGN_INSTALLMENTS' ? 'INSTALLMENTS' : 'STANDARD_TERMS',
  };
  return result;
}

export function reduceJiugeNegotiation(state: GameState, action: JiugeNegotiationAction): GameState {
  if (action.type === 'START_JIUGE_NEGOTIATION') {
    if (state.phase !== 'DAYTIME' || !state.debtCrisisStarted || state.debtNegotiationCompleted || state.activeActivity) return state;
    return { ...state, activeActivity: createRun(state.day, state.scenarioSeed) };
  }
  const run = state.activeActivity;
  if (!run || run.id !== 'JIUGE_NEGOTIATION') return state;
  if (action.type === 'ABANDON_JIUGE_NEGOTIATION') {
    return run.status === 'ACTIVE' ? { ...state, activeActivity: null } : state;
  }
  if (state.phase !== 'DAYTIME' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
  if (action.type === 'ASK_JIUGE_HISTORY') {
    if (run.step !== 0 || run.askedAboutHistory) return state;
    return { ...state, activeActivity: { ...run, askedAboutHistory: true } };
  }
  const next = advanceRun(run, action.choice, state);
  if (!next) return state;
  if (next.status !== 'RESULT') return { ...state, activeActivity: next };
  return {
    ...state,
    activeActivity: next,
    debtNegotiationCompleted: true,
    debtInstallmentPlan: next.outcome === 'INSTALLMENTS' ? createDebtInstallmentPlan() : state.debtInstallmentPlan,
    debtInterestGraceWeeksRemaining: next.outcome === 'INTEREST_GRACE' ? 1 : state.debtInterestGraceWeeksRemaining,
    debtRatePlanWeeksRemaining: next.outcome === 'RATE_RESTRUCTURE'
      ? periodicCostPolicy.restructuringWeeks
      : state.debtRatePlanWeeksRemaining,
    cash: next.outcome === 'RATE_RESTRUCTURE'
      ? Number((state.cash - periodicCostPolicy.restructuringFee).toFixed(2))
      : state.cash,
    dailyContractFees: next.outcome === 'RATE_RESTRUCTURE'
      ? Number((state.dailyContractFees + periodicCostPolicy.restructuringFee).toFixed(2))
      : state.dailyContractFees,
  };
}
