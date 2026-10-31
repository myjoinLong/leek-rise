import type { GameAction } from '../reducer';
import type { CafeReturnContext, CafeShiftActiveState, CafeShiftChoice, CafeShiftState, CafeShiftStep } from '../cafeShiftTypes';
import type { GameState } from '../types';
import { cafeShiftBasePay, cafeShiftEnergyPerOrder, cafeShiftOrders, cafeShiftTipPerCorrectOrder, minimumCafeShiftEnergy } from '../cafeShiftRules';
import { cafeReturnContextFor, cafeScenarioFor } from '../cafeShiftScenarios';

export { cafeChoicesFor, cafeChoicesForScenario, cafeCustomerFor, cafeReturnContextFor, cafeScenarioFor, correctCafeChoiceFor } from '../cafeShiftScenarios';
export type { CafeCustomerScenario } from '../cafeShiftScenarios';
export { cafeShiftBasePay, cafeShiftEnergyPerOrder, cafeShiftOrders, cafeShiftTipPerCorrectOrder, minimumCafeShiftEnergy } from '../cafeShiftRules';

export function createCafeShift(day: number, seed = 4, returnContext: CafeReturnContext | null = null): CafeShiftActiveState {
  return {
    id: 'SUJIE_CAFE_SHIFT', day, status: 'ACTIVE', scenarioVersion: 4, scenarioSeed: seed >>> 0,
    returnContext, step: 0, decisions: [], energySpent: 0, tips: 0,
  };
}

export function serveCafeOrder(run: CafeShiftActiveState, choice: CafeShiftChoice): CafeShiftState | null {
  const scenario = cafeScenarioFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
  const customer = scenario.customer;
  if (!scenario.availableChoices.includes(choice) || run.decisions.some((decision) => decision.step === run.step)) return null;
  const correct = choice === scenario.correctChoice;
  const decision = { step: run.step, customer, choice, correct };
  const decisions = [...run.decisions, decision];
  const energySpent = run.energySpent + cafeShiftEnergyPerOrder;
  const tips = run.tips + (correct ? cafeShiftTipPerCorrectOrder : 0);
  if (run.step < cafeShiftOrders - 1) {
    return { ...run, step: (run.step + 1) as CafeShiftStep, decisions, energySpent, tips };
  }
  const completeDecisions = decisions as [typeof decision, typeof decision, typeof decision];
  return {
    id: run.id, day: run.day, status: 'RESULT', scenarioVersion: run.scenarioVersion, scenarioSeed: run.scenarioSeed, step: 3, decisions: completeDecisions,
    energySpent, tips, basePay: cafeShiftBasePay, income: cafeShiftBasePay + tips,
  };
}

export function reduceCafeShiftAction(state: GameState, action: GameAction): GameState | null {
  if (action.type === 'START_CAFE_SHIFT') {
    if (state.phase !== 'DAYTIME' || state.activeActivity || state.workedToday || state.energy < minimumCafeShiftEnergy) return state;
    return { ...state, activeActivity: createCafeShift(state.day, state.scenarioSeed, cafeReturnContextFor(state)) };
  }
  if (action.type === 'SERVE_CAFE_ORDER') {
    const run = state.activeActivity;
    if (state.phase !== 'DAYTIME' || !run || run.id !== 'SUJIE_CAFE_SHIFT'
      || run.status !== 'ACTIVE' || run.day !== state.day || state.energy < cafeShiftEnergyPerOrder) return state;
    const nextRun = serveCafeOrder(run, action.choice);
    if (!nextRun) return state;
    const nextState: GameState = {
      ...state, energy: state.energy - cafeShiftEnergyPerOrder, activeActivity: nextRun,
    };
    if (nextRun.status !== 'RESULT') return nextState;
    return {
      ...nextState,
      cash: Number((state.cash + nextRun.income).toFixed(2)),
      dailyWorkIncome: Number((state.dailyWorkIncome + nextRun.income).toFixed(2)),
      workedToday: true,
    };
  }
  if (action.type === 'ABANDON_CAFE_SHIFT') {
    const run = state.activeActivity;
    return run?.id === 'SUJIE_CAFE_SHIFT' && run.status === 'ACTIVE'
      ? { ...state, activeActivity: null }
      : null;
  }
  return null;
}
