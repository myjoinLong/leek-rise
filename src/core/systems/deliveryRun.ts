import type { DeliveryChoice, DeliveryDecision, DeliveryRunState, GameState } from '../types';

export interface DeliveryRouteOption {
  choice: DeliveryChoice;
  label: string;
  description: string;
  income: number;
  energyCost: number;
  outcome: string;
}

export interface DeliveryStop {
  title: string;
  briefing: string;
  options: readonly DeliveryRouteOption[];
}

export const deliveryStops: readonly DeliveryStop[] = [
  {
    title: '午高峰 · 老城餐馆',
    briefing: '导航提示：主干道拥堵，小巷目前畅通。订单要求 20 分钟内送到。',
    options: [
      { choice: 'MAIN', label: '走主干道', description: '稳妥，但堵车会拖慢送达', income: 35, energyCost: 10, outcome: '堵车耽误了时间，基础配送费到手。' },
      { choice: 'ALLEY', label: '穿小巷', description: '绕开拥堵，路窄更费体力', income: 62, energyCost: 12, outcome: '你绕过拥堵路段，准时送达并拿到加价。' },
    ],
  },
  {
    title: '阵雨 · 河边小区',
    briefing: '导航提示：小巷积水，主路有遮雨连廊。顾客备注“餐别洒了”。',
    options: [
      { choice: 'MAIN', label: '走主路连廊', description: '路程稍长，路面稳定', income: 58, energyCost: 12, outcome: '餐食完好送达，顾客留下了小费。' },
      { choice: 'ALLEY', label: '抄近路', description: '距离短，积水路段容易耽误', income: 28, energyCost: 10, outcome: '积水拖慢了速度，只拿到基础配送费。' },
    ],
  },
  {
    title: '晚高峰 · 商务楼',
    briefing: '订单即将超时，楼下可临停；你已经连续跑了两单，体力开始下降。',
    options: [
      { choice: 'RUSH', label: '加速冲单', description: '收入更高，额外消耗 12 点精力', income: 64, energyCost: 22, outcome: '你抓住加价窗口，赶在超时前送到。' },
      { choice: 'STEADY', label: '稳速送达', description: '收入较低，节省精力', income: 45, energyCost: 10, outcome: '你稳稳完成配送，没有额外加价。' },
    ],
  },
];

export const minimumDeliveryEnergy = deliveryStops.reduce(
  (total, stop) => total + Math.min(...stop.options.map((option) => option.energyCost)),
  0,
);

export function minimumEnergyAfterDeliveryStop(stopIndex: number): number {
  return deliveryStops.slice(stopIndex + 1).reduce(
    (total, stop) => total + Math.min(...stop.options.map((option) => option.energyCost)),
    0,
  );
}

export function createDeliveryRun(day: number): DeliveryRunState {
  return {
    id: 'WANG_DELIVERY',
    day,
    status: 'ACTIVE',
    stopIndex: 0,
    totalIncome: 0,
    energySpent: 0,
    decisions: [],
  };
}

export function resolveDeliveryChoice(
  stopIndex: number,
  choice: DeliveryChoice,
): DeliveryDecision | null {
  const option = deliveryStops[stopIndex]?.options.find((candidate) => candidate.choice === choice);
  if (!option) return null;
  return {
    stopIndex,
    choice,
    income: option.income,
    energyCost: option.energyCost,
    outcome: option.outcome,
  };
}

export function advanceDeliveryRun(
  run: DeliveryRunState,
  decision: DeliveryDecision,
): DeliveryRunState {
  const stopIndex = run.stopIndex + 1;
  return {
    ...run,
    status: stopIndex >= deliveryStops.length ? 'RESULT' : 'ACTIVE',
    stopIndex,
    totalIncome: run.totalIncome + decision.income,
    energySpent: run.energySpent + decision.energyCost,
    decisions: [...run.decisions, decision],
  };
}

export function abandonDeliveryRun(state: GameState): GameState {
  const run = state.activeActivity;
  if (state.phase !== 'DAYTIME' || !run || run.id !== 'WANG_DELIVERY' || run.status !== 'ACTIVE' || run.day !== state.day) {
    return state;
  }
  if (run.decisions.length === 0) return { ...state, activeActivity: null };
  return {
    ...state,
    cash: Number((state.cash + run.totalIncome).toFixed(2)),
    dailyWorkIncome: Number((state.dailyWorkIncome + run.totalIncome).toFixed(2)),
    workedToday: true,
    activeActivity: null,
  };
}
