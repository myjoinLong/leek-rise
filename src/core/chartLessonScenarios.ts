import { seededPermutationAt } from './scenarioDeck';
import type { ChartLessonState } from './chartLessonTypes';

export const chartLessonScenarioVersion = 2 as const;
const subjectCount = 30;
const timeWindowCount = 6;
const volatilityCount = 5;
const coachingCount = 3;
export const chartLessonScenarioCount = subjectCount * timeWindowCount * volatilityCount * coachingCount;
const scenarioSalt = 0x434C4C32;

const subjects = [
  '冷链订单公告演练', '医疗耗材采购演练', '光伏并网消息演练', '机器人交付预期演练', '数据中心扩容演练',
  '新能源汽车售后演练', '物流设备招标演练', '农产品直采协议演练', '港区仓储升级演练', '校园餐饮供应演练',
  '地铁检修订单演练', '新材料送样消息演练', '直播基地合作演练', '旧厂节能改造演练', '电池回收合同演练',
  '城市屏幕采购演练', '工厂门禁改造演练', '云服务续约演练', '社区光伏施工演练', '冷链车队租赁演练',
  '水厂设备更新演练', '电商包装采购演练', '经销商返利协议演练', '医院信息化升级演练', '轨道交通零件演练',
  '商超配送扩容演练', '家电新品发布演练', '工业园区二期演练', '应急电源采购演练', '轻工设备出口演练',
] as const;

const timeWindows = [
  '开盘后首小时', '上午回踩阶段', '午盘量价变化', '午后前高测试', '尾盘区间确认', '跨日走势对照',
] as const;

const volatilityBands = [
  { label: '平缓波动', amplitude: 0.01 },
  { label: '轻微起伏', amplitude: 0.018 },
  { label: '常态波动', amplitude: 0.026 },
  { label: '活跃波动', amplitude: 0.034 },
  { label: '较宽波动', amplitude: 0.042 },
] as const;

const coachingLines = [
  '图形只负责提醒你观察，不负责替你赚钱。',
  '我能教你找线索，但下一根怎么走，我也不知道。',
  '以前我把口诀说得太满；今天先找反例，再谈形态。',
] as const;

export interface ChartLessonScenario {
  index: number;
  headline: string;
  brief: string;
  volatilityLabel: string;
  coachingLine: string;
  noiseAmplitude: number;
}

export function chartLessonScenarioIndex(day: number, seed: number): number {
  return seededPermutationAt(Math.max(0, Math.floor(day) - 1), chartLessonScenarioCount, seed, scenarioSalt);
}

export function chartLessonScenarioAt(index: number): ChartLessonScenario {
  const safeIndex = ((Math.floor(index) % chartLessonScenarioCount) + chartLessonScenarioCount) % chartLessonScenarioCount;
  const subjectIndex = safeIndex % subjectCount;
  const timeWindowIndex = Math.floor(safeIndex / subjectCount) % timeWindowCount;
  const volatilityIndex = Math.floor(safeIndex / (subjectCount * timeWindowCount)) % volatilityCount;
  const coachingIndex = Math.floor(safeIndex / (subjectCount * timeWindowCount * volatilityCount)) % coachingCount;
  const volatility = volatilityBands[volatilityIndex]!;

  return {
    index: safeIndex,
    headline: subjects[subjectIndex]!,
    brief: `虚构题卡 · 观察窗口：${timeWindows[timeWindowIndex]} · 非实时公告`,
    volatilityLabel: volatility.label,
    coachingLine: coachingLines[coachingIndex]!,
    noiseAmplitude: volatility.amplitude,
  };
}

export function chartLessonScenarioForRun(
  run: Pick<ChartLessonState, 'scenarioVersion' | 'scenarioIndex'>,
): ChartLessonScenario | null {
  if (run.scenarioVersion !== chartLessonScenarioVersion || run.scenarioIndex === undefined) return null;
  return chartLessonScenarioAt(run.scenarioIndex);
}
