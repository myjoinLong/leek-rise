import { factoryIsolationAvailable, type FactoryReturnContext, type FactoryShiftAction, type FactoryShiftChoice, type FactoryShiftState } from '../factoryShiftTypes';
import type { GameState } from '../types';
import { factoryScenarioForDay } from '../factoryScenarios';
import { factoryContinuationScenarioForDay } from '../factoryContinuationScenarios';

export interface FactoryInspection {
  id: string;
  title: string;
  clue: string;
  correctChoice: FactoryShiftChoice;
  managerLine: string;
}

export const factoryShiftBaseIncome = 60;
export const factoryShiftBonusPerCorrectCheck = 20;
export const factoryShiftStops = 3;
export const factoryShiftPassEnergy = 5;
export const factoryShiftReworkEnergy = 9;
export const factoryShiftHoldEnergy = 7;
export const factoryShiftMinimumEnergy = factoryShiftStops * factoryShiftPassEnergy;
export const factoryShiftMaximumEnergy = factoryShiftStops * factoryShiftReworkEnergy;

const inspectionCases: readonly FactoryInspection[] = [
  { id: 'factory-v1-0', title: '批次 A-17 · 标签核对', clue: '工单编号 A-71，外箱标签 A-17。', correctChoice: 'REWORK', managerLine: '王老板提醒你按工单和实物逐项核对。' },
  { id: 'factory-v1-1', title: '订单 08 · 密封抽检', clue: '抽检 10 件封签完整，装箱数与工单一致。', correctChoice: 'PASS', managerLine: '王老板提醒你按工单和实物逐项核对。' },
  { id: 'factory-v1-2', title: '订单 22 · 来料核对', clue: '来料清单额定功率 800W，外箱标注 800W。', correctChoice: 'PASS', managerLine: '王老板提醒你按工单和实物逐项核对。' },
  { id: 'factory-v1-3', title: '批次 B-31 · 功能复测', clue: '通电后指示灯不亮，出厂检查项要求点亮。', correctChoice: 'REWORK', managerLine: '王老板提醒你按工单和实物逐项核对。' },
];

export function factoryInspectionForDay(day: number, step: number, version: 1 | 2 | 3 | 4 | 5 = 1, seed = 4): FactoryInspection {
  if ((version === 3 || version === 4 || version === 5) && day > 30) return factoryContinuationScenarioForDay(day, step, seed, version);
  if (version === 2 || version === 3 || version === 4 || version === 5) return factoryScenarioForDay(day, step, seed);
  const index = (Math.max(1, day) - 1 + step) % inspectionCases.length;
  return inspectionCases[index]!;
}

export function factoryShiftEnergyCost(choice: FactoryShiftChoice): number {
  if (choice === 'REWORK') return factoryShiftReworkEnergy;
  if (choice === 'HOLD') return factoryShiftHoldEnergy;
  return factoryShiftPassEnergy;
}

export function minimumEnergyAfterFactoryCheck(step: number): number {
  return Math.max(0, factoryShiftStops - step - 1) * factoryShiftPassEnergy;
}

function factoryReturnContextFor(state: GameState): FactoryReturnContext | undefined {
  const trace = state.npcActivityMemory.wang.lastTrace;
  const context = trace?.factoryReturnContext;
  if (trace?.activityId !== 'WANG_FACTORY' || trace.day === undefined || trace.day >= state.day
    || !context || context.previousDay !== trace.day) return undefined;
  return context;
}

function createFactoryShift(day: number, seed: number, priorReview?: FactoryReturnContext): FactoryShiftState {
  return {
    id: 'WANG_FACTORY', day, status: 'ACTIVE', scenarioVersion: 5, scenarioSeed: seed >>> 0, step: 0,
    ...(priorReview ? { priorReview } : {}),
    qualityBonus: 0, energySpent: 0, decisions: [],
  };
}

export function reduceFactoryShift(state: GameState, action: FactoryShiftAction): GameState {
  if (action.type === 'START_FACTORY_SHIFT') {
    if (state.phase !== 'DAYTIME' || state.workedToday || state.activeActivity
      || state.energy < factoryShiftMinimumEnergy) return state;
    return { ...state, activeActivity: createFactoryShift(state.day, state.scenarioSeed, factoryReturnContextFor(state)) };
  }

  const run = state.activeActivity;
  if (state.phase !== 'DAYTIME' || !run || run.id !== 'WANG_FACTORY'
    || run.status !== 'ACTIVE' || run.day !== state.day) return state;
  if (action.type === 'ABANDON_FACTORY_SHIFT') return { ...state, activeActivity: null };
  if (action.choice === 'HOLD' && !factoryIsolationAvailable(run.day, run.scenarioVersion)) return state;

  const inspection = factoryInspectionForDay(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
  const energyCost = factoryShiftEnergyCost(action.choice);
  if (state.energy - energyCost < minimumEnergyAfterFactoryCheck(run.step)) return state;
  const correct = action.choice === inspection.correctChoice;
  const decision = { step: run.step, choice: action.choice, correct, energyCost };
  const decisions = [...run.decisions, decision];
  const qualityBonus = run.qualityBonus + (correct ? factoryShiftBonusPerCorrectCheck : 0);
  const energy = state.energy - energyCost;
  if (run.step < factoryShiftStops - 1) {
    return {
      ...state,
      energy,
      activeActivity: {
        ...run, step: (run.step + 1) as 0 | 1 | 2,
        decisions, qualityBonus, energySpent: run.energySpent + energyCost,
      },
    };
  }

  const income = factoryShiftBaseIncome + qualityBonus;
  const result: FactoryShiftState = {
    ...run,
    status: 'RESULT',
    step: 3,
    decisions: [decisions[0]!, decisions[1]!, decisions[2]!],
    qualityBonus, energySpent: run.energySpent + energyCost, income,
  };
  return {
    ...state,
    energy,
    cash: Number((state.cash + income).toFixed(2)),
    dailyWorkIncome: Number((state.dailyWorkIncome + income).toFixed(2)),
    workedToday: true,
    activeActivity: result,
  };
}
