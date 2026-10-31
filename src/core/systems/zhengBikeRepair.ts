import type { BikeRepairPart, BikeRepairReturnContext, BikeRepairStep, ZhengBikeRepairActiveState, ZhengBikeRepairAction, ZhengBikeRepairState } from '../zhengBikeRepairTypes';
import type { GameState } from '../types';
import { zhengBikeRepairCaseFor } from '../zhengBikeRepairScenarios';
import { zhengRepairReturnContextFor } from '../zhengBikeRepairMemory';
export { zhengBikeRepairCaseFor, zhengBikeRepairScenarios, zhengBikeRepairScenarioCount } from '../zhengBikeRepairScenarios';
export type { BikeRepairCase } from '../zhengBikeRepairScenarios';

export const zhengRepairJobs = 3;
export const zhengRepairEnergyPerJob = 5;
export const zhengRepairTestEnergy = 2;
export const zhengRepairBasePay = 48;
export const zhengRepairQualityBonus = 12;
export const zhengRepairMinimumEnergy = zhengRepairJobs * zhengRepairEnergyPerJob;

const parts: readonly BikeRepairPart[] = ['BATTERY', 'BRAKES', 'CONTROLLER'];

export function bikeRepairCaseFor(
  day: number,
  step: BikeRepairStep,
  version: 1 | 2 | 3 | 4 | 5 = 1,
  seed = 4,
  returnContext: BikeRepairReturnContext | null = null,
) {
  const scenario = zhengBikeRepairCaseFor(day, step, version, seed);
  if (step !== 0 || !returnContext) return scenario;
  const priorOutcome = returnContext.kind === 'MISSED_REPAIR' ? '上次维修判断错了' : '上次修对了，但没有留下检测凭证';
  const partName = returnContext.faultPart === 'BATTERY' ? '电池组'
    : returnContext.faultPart === 'BRAKES' ? '刹车系统' : '控制器';
  return {
    ...scenario,
    customerName: returnContext.customerName,
    customerContext: `这位车主第 ${returnContext.previousDay} 天来过，今天带来新的故障工单。上次的 ${returnContext.issueTitle} 记录还在。`,
    title: `熟客返修 · ${scenario.title}`,
    workshopLine: `郑师傅翻开旧工单：“第 ${returnContext.previousDay} 天${priorOutcome}，当时查的是${partName}。今天症状不同，别照搬旧结论；先测出真实故障并把记录留下。”`,
    testLimit: 1,
    warrantyProofRequired: true,
  };
}

export function bikeRepairTestResult(part: BikeRepairPart, foundFault: boolean, diagnostic?: string): string {
  if (!foundFault) return '检测值在可用范围内';
  if (diagnostic) return diagnostic;
  if (part === 'BATTERY') return '电池组压差偏大，负载电压明显下坠';
  if (part === 'BRAKES') return '刹车间隙超标，制动片磨损不均';
  return '控制器报码 E08，供电输出间歇中断';
}

export function bikeRepairCanTest(state: GameState, run: ZhengBikeRepairActiveState, part: BikeRepairPart): boolean {
  const remainingRepairs = (zhengRepairJobs - run.step) * zhengRepairEnergyPerJob;
  const currentCase = bikeRepairCaseFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
  const currentTests = run.tests.filter((test) => test.step === run.step);
  const testLimit = currentCase.testLimit ?? parts.length;
  return !run.tests.some((test) => test.step === run.step && test.part === part)
    && currentTests.length < testLimit
    && state.energy - zhengRepairTestEnergy >= remainingRepairs;
}

function createRun(day: number, seed: number, returnContext: BikeRepairReturnContext | null): ZhengBikeRepairActiveState {
  return { id: 'ZHENG_BIKE_REPAIR', day, status: 'ACTIVE', scenarioVersion: 5, scenarioSeed: seed >>> 0, returnContext, step: 0, energySpent: 0, income: 0, qualityBonus: 0, tests: [], decisions: [] };
}

export function reduceZhengBikeRepair(state: GameState, action: ZhengBikeRepairAction): GameState | null {
  if (action.type === 'START_ZHENG_BIKE_REPAIR') {
    if (state.phase !== 'DAYTIME' || state.workedToday || state.activeActivity || state.energy < zhengRepairMinimumEnergy) return state;
    return { ...state, workedToday: true, activeActivity: createRun(state.day, state.scenarioSeed, zhengRepairReturnContextFor(state)) };
  }

  const run = state.activeActivity;
  if (action.type === 'ABANDON_ZHENG_BIKE_REPAIR') {
    return run?.id === 'ZHENG_BIKE_REPAIR' && run.status === 'ACTIVE' ? { ...state, activeActivity: null } : null;
  }
  if (state.phase !== 'DAYTIME' || !run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE' || run.day !== state.day) return null;

  if (action.type === 'TEST_BIKE_PART') {
    if (!parts.includes(action.part) || !bikeRepairCanTest(state, run, action.part)) return state;
    const currentCase = bikeRepairCaseFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const foundFault = currentCase.faultyPart === action.part;
    return {
      ...state,
      energy: state.energy - zhengRepairTestEnergy,
      activeActivity: { ...run, energySpent: run.energySpent + zhengRepairTestEnergy, tests: [...run.tests, { step: run.step, part: action.part, foundFault }] },
    };
  }

  if (action.type === 'REPAIR_BIKE_FAULT') {
    if (!parts.includes(action.part) || state.energy < (zhengRepairJobs - run.step) * zhengRepairEnergyPerJob) return state;
    const repairCase = bikeRepairCaseFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const correct = repairCase.faultyPart === action.part;
    const verified = run.tests.some((test) => test.step === run.step && test.part === action.part && test.foundFault);
    const qualityBonus = correct && (!repairCase.warrantyProofRequired || verified) ? zhengRepairQualityBonus : 0;
    const earned = zhengRepairBasePay + qualityBonus;
    const decision = { step: run.step, repairedPart: action.part, correct, qualityBonus, verified };
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
