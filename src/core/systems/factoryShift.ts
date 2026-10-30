import type { FactoryShiftAction, FactoryShiftChoice, FactoryShiftState } from '../factoryShiftTypes';
import type { GameState } from '../types';

export interface FactoryInspection {
  title: string;
  clue: string;
  correctChoice: FactoryShiftChoice;
}

export const factoryShiftBaseIncome = 60;
export const factoryShiftBonusPerCorrectCheck = 20;
export const factoryShiftStops = 3;
export const factoryShiftMinimumEnergy = factoryShiftStops * 5;
const reworkEnergy = 9;
const passEnergy = 5;

const inspectionCases: readonly FactoryInspection[] = [
  { title: '批次 A-17 · 标签核对', clue: '工单编号 A-71，外箱标签 A-17。', correctChoice: 'REWORK' },
  { title: '订单 08 · 密封抽检', clue: '抽检 10 件封签完整，装箱数与工单一致。', correctChoice: 'PASS' },
  { title: '订单 22 · 来料核对', clue: '来料清单额定功率 800W，外箱标注 800W。', correctChoice: 'PASS' },
  { title: '批次 B-31 · 功能复测', clue: '通电后指示灯不亮，出厂检查项要求点亮。', correctChoice: 'REWORK' },
];

export function factoryInspectionForDay(day: number, step: number): FactoryInspection {
  const index = ((Math.max(1, day) - 1 + step) % inspectionCases.length);
  return inspectionCases[index]!;
}

export function minimumEnergyAfterFactoryCheck(step: number): number {
  return Math.max(0, factoryShiftStops - step - 1) * passEnergy;
}

function createFactoryShift(day: number): FactoryShiftState {
  return {
    id: 'WANG_FACTORY', day, status: 'ACTIVE', step: 0,
    qualityBonus: 0, energySpent: 0, decisions: [],
  };
}

export function reduceFactoryShift(state: GameState, action: FactoryShiftAction): GameState {
  if (action.type === 'START_FACTORY_SHIFT') {
    if (state.phase !== 'DAYTIME' || state.workedToday || state.activeActivity
      || state.energy < factoryShiftMinimumEnergy) return state;
    return { ...state, activeActivity: createFactoryShift(state.day) };
  }

  const run = state.activeActivity;
  if (state.phase !== 'DAYTIME' || !run || run.id !== 'WANG_FACTORY'
    || run.status !== 'ACTIVE' || run.day !== state.day) return state;
  if (action.type === 'ABANDON_FACTORY_SHIFT') return { ...state, activeActivity: null };

  const inspection = factoryInspectionForDay(run.day, run.step);
  const energyCost = action.choice === 'REWORK' ? reworkEnergy : passEnergy;
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
