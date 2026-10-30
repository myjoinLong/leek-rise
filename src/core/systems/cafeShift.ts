import type { GameAction } from '../reducer';
import type { CafeCustomerId, CafeShiftActiveState, CafeShiftChoice, CafeShiftState, CafeShiftStep } from '../cafeShiftTypes';
import type { GameState } from '../types';

export const cafeShiftOrders = 3;
export const cafeShiftEnergyPerOrder = 5;
export const cafeShiftBasePay = 72;
export const cafeShiftTipPerCorrectOrder = 16;
export const minimumCafeShiftEnergy = cafeShiftOrders * cafeShiftEnergyPerOrder;

const serviceOptions: Readonly<Record<CafeCustomerId, readonly CafeShiftChoice[]>> = {
  RIDER: ['BLACK_COFFEE', 'OAT_LATTE', 'CAKE'],
  REGULAR: ['SUGAR_FREE_LATTE', 'CARAMEL_MOCHA', 'SWEET_TEA'],
  PARENT: ['WARM_MILK', 'DOUBLE_ESPRESSO', 'ICED_TEA'],
};
const correctChoice: Readonly<Record<CafeCustomerId, CafeShiftChoice>> = {
  RIDER: 'BLACK_COFFEE', REGULAR: 'SUGAR_FREE_LATTE', PARENT: 'WARM_MILK',
};

export function cafeCustomerFor(day: number, step: CafeShiftStep): CafeCustomerId {
  return (['RIDER', 'REGULAR', 'PARENT'] as const)[(day - 1 + step) % cafeShiftOrders]!;
}

export function cafeChoicesFor(customer: CafeCustomerId): readonly CafeShiftChoice[] {
  return serviceOptions[customer];
}

export function correctCafeChoiceFor(customer: CafeCustomerId): CafeShiftChoice {
  return correctChoice[customer];
}

export function createCafeShift(day: number): CafeShiftActiveState {
  return { id: 'SUJIE_CAFE_SHIFT', day, status: 'ACTIVE', step: 0, decisions: [], energySpent: 0, tips: 0 };
}

export function serveCafeOrder(run: CafeShiftActiveState, choice: CafeShiftChoice): CafeShiftState | null {
  const customer = cafeCustomerFor(run.day, run.step);
  if (!serviceOptions[customer].includes(choice) || run.decisions.some((decision) => decision.step === run.step)) return null;
  const correct = choice === correctChoice[customer];
  const decision = { step: run.step, customer, choice, correct };
  const decisions = [...run.decisions, decision];
  const energySpent = run.energySpent + cafeShiftEnergyPerOrder;
  const tips = run.tips + (correct ? cafeShiftTipPerCorrectOrder : 0);
  if (run.step < cafeShiftOrders - 1) {
    return { ...run, step: (run.step + 1) as CafeShiftStep, decisions, energySpent, tips };
  }
  const completeDecisions = decisions as [typeof decision, typeof decision, typeof decision];
  return {
    id: run.id, day: run.day, status: 'RESULT', step: 3, decisions: completeDecisions,
    energySpent, tips, basePay: cafeShiftBasePay, income: cafeShiftBasePay + tips,
  };
}

export function reduceCafeShiftAction(state: GameState, action: GameAction): GameState | null {
  if (action.type === 'START_CAFE_SHIFT') {
    if (state.phase !== 'DAYTIME' || state.activeActivity || state.workedToday || state.energy < minimumCafeShiftEnergy) return state;
    return { ...state, activeActivity: createCafeShift(state.day) };
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
