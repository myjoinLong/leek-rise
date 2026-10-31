import { seededPermutationAt } from './scenarioDeck';
import type { RiskReplayState, RiskReplayStep } from './riskReplayTypes';

export const riskReplayScenarioVersion = 2 as const;
const topics = [
  '冷链仓库扩建', '社区药店续约', '电池回收新线', '城市配送招标', '工业园设备更新',
  '直播基地合作', '轨道零件交付', '旧厂节能改造', '应急电源采购', '港区仓储升级',
  '水厂设备维护', '汽车售后渠道', '云服务续费', '食品包装订单', '校园餐饮供应',
  '物流车队租赁', '医疗耗材配送', '光伏并网测试', '家电新品铺货', '工厂门禁改造',
  '商超冷柜采购', '机器人试运行', '经销商返利谈判', '地铁检修排班', '农产品直采',
  '数据中心扩容', '新材料送样', '社区物业改造', '电商仓库搬迁', '小城文旅活动',
] as const;
const observationWindows = [
  '开盘急拉后的回落', '上午回踩支撑', '午盘窄幅震荡', '午后放量冲高', '尾盘流动性变薄', '跨日缺口后的反复',
] as const;
const stressRegimes = [
  { label: '低波动', factor: 0.75 }, { label: '偏低波动', factor: 0.9 }, { label: '常态波动', factor: 1 },
  { label: '活跃波动', factor: 1.15 }, { label: '高波动', factor: 1.3 },
] as const;
const returnTrajectories = [
  { label: '冲高后分化', values: [6, -8, 2] },
  { label: '缓慢上行后回吐', values: [4, 3, -5] },
  { label: '反弹失败后企稳', values: [-4, -10, 1] },
] as const;
const baseStress = [12, 10, 5] as const;
const scenarioSalt = 0x53575232;

export const riskReplayScenarioCount = topics.length * observationWindows.length * stressRegimes.length * returnTrajectories.length;

export interface RiskReplayScenario {
  index: number;
  topic: string;
  observationWindow: string;
  stressLabel: string;
  trajectoryLabel: string;
  coachLine: string;
  cases: readonly [
    { stressPercent: number; returnPercent: number },
    { stressPercent: number; returnPercent: number },
    { stressPercent: number; returnPercent: number },
  ];
}

export function riskReplayScenarioIndex(day: number, seed: number): number {
  return seededPermutationAt(Math.max(0, Math.floor(day) - 1), riskReplayScenarioCount, seed, scenarioSalt);
}

export function riskReplayScenarioAt(index: number): RiskReplayScenario {
  const safeIndex = ((Math.floor(index) % riskReplayScenarioCount) + riskReplayScenarioCount) % riskReplayScenarioCount;
  const topicIndex = safeIndex % topics.length;
  const windowIndex = Math.floor(safeIndex / topics.length) % observationWindows.length;
  const stressIndex = Math.floor(safeIndex / (topics.length * observationWindows.length)) % stressRegimes.length;
  const trajectoryIndex = Math.floor(safeIndex / (topics.length * observationWindows.length * stressRegimes.length)) % returnTrajectories.length;
  const stress = stressRegimes[stressIndex]!;
  const trajectory = returnTrajectories[trajectoryIndex]!;
  const makeCase = (step: RiskReplayStep) => ({
    stressPercent: Number((baseStress[step]! * stress.factor).toFixed(1)),
    returnPercent: trajectory.values[step]!,
  });

  return {
    index: safeIndex,
    topic: topics[topicIndex]!,
    observationWindow: observationWindows[windowIndex]!,
    stressLabel: stress.label,
    trajectoryLabel: trajectory.label,
    coachLine: [
      '先给下行留空间；方向我不替你猜。',
      '风险先算在前头，涨跌等揭晓再说。',
      '仓位是你自己按下去的，别让一句判断替你扛。',
    ][trajectoryIndex]!,
    cases: [makeCase(0), makeCase(1), makeCase(2)],
  };
}

export function riskReplayScenarioForRun(
  run: Pick<RiskReplayState, 'scenarioVersion' | 'scenarioIndex'>,
): RiskReplayScenario | null {
  if (run.scenarioVersion !== riskReplayScenarioVersion || run.scenarioIndex === undefined) return null;
  return riskReplayScenarioAt(run.scenarioIndex);
}

export function riskReplayCaseForRun(
  run: Pick<RiskReplayState, 'scenarioVersion' | 'scenarioIndex' | 'priorReview'>,
  step: RiskReplayStep,
): { stressPercent: number; returnPercent: number } {
  const currentSample = riskReplayScenarioForRun(run)?.cases[step];
  if (!currentSample) return [
    { stressPercent: 12, returnPercent: 6 },
    { stressPercent: 10, returnPercent: -8 },
    { stressPercent: 5, returnPercent: 2 },
  ][step]!;
  if (step === 0 && run.priorReview) {
    return { ...currentSample, stressPercent: run.priorReview.stressPercent };
  }
  return currentSample;
}
