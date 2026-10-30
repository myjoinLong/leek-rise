import type { BikeRepairPart, BikeRepairStep, ZhengBikeRepairActiveState, ZhengBikeRepairAction, ZhengBikeRepairState } from '../zhengBikeRepairTypes';
import type { GameState } from '../types';

export interface BikeRepairCase {
  title: string;
  symptom: string;
  faultyPart: BikeRepairPart;
}

export const zhengRepairJobs = 3;
export const zhengRepairEnergyPerJob = 5;
export const zhengRepairTestEnergy = 2;
export const zhengRepairBasePay = 18;
export const zhengRepairQualityBonus = 12;
export const zhengRepairMinimumEnergy = zhengRepairJobs * zhengRepairEnergyPerJob;

const cases: readonly BikeRepairCase[] = [
  { title: '通勤车 · 电量异常', symptom: '昨晚刚充满，今天只骑到街口就掉了一格；仪表仍正常亮起。', faultyPart: 'BATTERY' },
  { title: '配送车 · 后轮异响', symptom: '捏刹车要到底才咬住，低速时后轮还会拖一下。', faultyPart: 'BRAKES' },
  { title: '改装车 · 颠簸断电', symptom: '经过减速带后动力突然中断，重新开机才能继续走。', faultyPart: 'CONTROLLER' },
  { title: '通勤车 · 续航骤降', symptom: '充电器很快显示充满，但实际续航比昨天少了一半。', faultyPart: 'BATTERY' },
  { title: '配送车 · 下坡发热', symptom: '下坡时刹车有刺耳摩擦声，连续制动后手柄发软。', faultyPart: 'BRAKES' },
  { title: '改装车 · 转把失灵', symptom: '转把偶尔没有响应，仪表短暂闪过控制器错误码。', faultyPart: 'CONTROLLER' },
];

const parts: readonly BikeRepairPart[] = ['BATTERY', 'BRAKES', 'CONTROLLER'];

export function bikeRepairCaseFor(day: number, step: BikeRepairStep): BikeRepairCase {
  const index = ((Math.max(1, day) - 1) * zhengRepairJobs + step) % cases.length;
  return cases[index]!;
}

export function bikeRepairTestResult(part: BikeRepairPart, foundFault: boolean): string {
  if (!foundFault) return '检测值在可用范围内';
  if (part === 'BATTERY') return '电池组压差偏大，负载电压明显下坠';
  if (part === 'BRAKES') return '刹车间隙超标，制动片磨损不均';
  return '控制器报码 E08，供电输出间歇中断';
}

export function bikeRepairCanTest(state: GameState, run: ZhengBikeRepairActiveState, part: BikeRepairPart): boolean {
  const remainingRepairs = (zhengRepairJobs - run.step) * zhengRepairEnergyPerJob;
  return !run.tests.some((test) => test.step === run.step && test.part === part)
    && state.energy - zhengRepairTestEnergy >= remainingRepairs;
}

function createRun(day: number): ZhengBikeRepairActiveState {
  return { id: 'ZHENG_BIKE_REPAIR', day, status: 'ACTIVE', step: 0, energySpent: 0, income: 0, qualityBonus: 0, tests: [], decisions: [] };
}

export function reduceZhengBikeRepair(state: GameState, action: ZhengBikeRepairAction): GameState | null {
  if (action.type === 'START_ZHENG_BIKE_REPAIR') {
    if (state.phase !== 'DAYTIME' || state.workedToday || state.activeActivity || state.energy < zhengRepairMinimumEnergy) return state;
    return { ...state, workedToday: true, activeActivity: createRun(state.day) };
  }

  const run = state.activeActivity;
  if (action.type === 'ABANDON_ZHENG_BIKE_REPAIR') {
    return run?.id === 'ZHENG_BIKE_REPAIR' && run.status === 'ACTIVE' ? { ...state, activeActivity: null } : null;
  }
  if (state.phase !== 'DAYTIME' || !run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE' || run.day !== state.day) return null;

  if (action.type === 'TEST_BIKE_PART') {
    if (!parts.includes(action.part) || !bikeRepairCanTest(state, run, action.part)) return state;
    const foundFault = bikeRepairCaseFor(run.day, run.step).faultyPart === action.part;
    return {
      ...state,
      energy: state.energy - zhengRepairTestEnergy,
      activeActivity: { ...run, energySpent: run.energySpent + zhengRepairTestEnergy, tests: [...run.tests, { step: run.step, part: action.part, foundFault }] },
    };
  }

  if (action.type === 'REPAIR_BIKE_FAULT') {
    if (!parts.includes(action.part) || state.energy < (zhengRepairJobs - run.step) * zhengRepairEnergyPerJob) return state;
    const correct = bikeRepairCaseFor(run.day, run.step).faultyPart === action.part;
    const qualityBonus = correct ? zhengRepairQualityBonus : 0;
    const earned = zhengRepairBasePay + qualityBonus;
    const decision = { step: run.step, repairedPart: action.part, correct, qualityBonus };
    const decisions = [...run.decisions, decision];
    const nextRun = {
      ...run,
      energySpent: run.energySpent + zhengRepairEnergyPerJob,
      income: run.income + earned,
      qualityBonus: run.qualityBonus + qualityBonus,
      decisions,
    };
    const common = {
      ...state,
      energy: state.energy - zhengRepairEnergyPerJob,
      cash: Number((state.cash + earned).toFixed(2)),
      dailyWorkIncome: Number((state.dailyWorkIncome + earned).toFixed(2)),
    };
    if (run.step < zhengRepairJobs - 1) {
      return { ...common, activeActivity: { ...nextRun, step: (run.step + 1) as BikeRepairStep } };
    }
    return {
      ...common,
      activeActivity: { ...nextRun, status: 'RESULT', step: 3, decisions: [decisions[0]!, decisions[1]!, decisions[2]!] } satisfies ZhengBikeRepairState,
    };
  }
  return null;
}
