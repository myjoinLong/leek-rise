import type { DeliveryChoice, DeliveryDecision, DeliveryReturnContext, DeliveryRunState, GameState } from '../types';
import type { GameAction } from '../reducer';
import { deliveryDayScenarioFor, deliveryDayScenarios } from '../deliveryScenarios';
import { deliveryContinuationFor } from '../deliveryScenarioVariants';

export interface DeliveryRouteOption {
  choice: DeliveryChoice;
  label: string;
  description: string;
  income: number;
  energyCost: number;
  outcome: string;
}

export interface DeliveryStop {
  id: string;
  title: string;
  briefing: string;
  options: readonly DeliveryRouteOption[];
}

export const deliveryStops: readonly DeliveryStop[] = [
  {
    id: 'delivery-v1-0',
    title: '午高峰 · 老城餐馆',
    briefing: '导航提示：主干道拥堵，小巷目前畅通。订单要求 20 分钟内送到。',
    options: [
      { choice: 'MAIN', label: '走主干道', description: '稳妥，但堵车会拖慢送达', income: 35, energyCost: 10, outcome: '堵车耽误了时间，基础配送费到手。' },
      { choice: 'ALLEY', label: '穿小巷', description: '绕开拥堵，路窄更费体力', income: 62, energyCost: 12, outcome: '你绕过拥堵路段，准时送达并拿到加价。' },
    ],
  },
  {
    id: 'delivery-v1-1',
    title: '阵雨 · 河边小区',
    briefing: '导航提示：小巷积水，主路有遮雨连廊。顾客备注“餐别洒了”。',
    options: [
      { choice: 'MAIN', label: '走主路连廊', description: '路程稍长，路面稳定', income: 58, energyCost: 12, outcome: '餐食完好送达，顾客留下了小费。' },
      { choice: 'ALLEY', label: '抄近路', description: '距离短，积水路段容易耽误', income: 28, energyCost: 10, outcome: '积水拖慢了速度，只拿到基础配送费。' },
    ],
  },
  {
    id: 'delivery-v1-2',
    title: '晚高峰 · 商务楼',
    briefing: '订单即将超时，楼下可临停；你已经连续跑了两单，体力开始下降。',
    options: [
      { choice: 'RUSH', label: '加速冲单', description: '收入更高，额外消耗 12 点精力', income: 64, energyCost: 22, outcome: '你抓住加价窗口，赶在超时前送到。' },
      { choice: 'STEADY', label: '稳速送达', description: '收入较低，节省精力', income: 45, energyCost: 10, outcome: '你稳稳完成配送，没有额外加价。' },
    ],
  },
];

export const deliveryScenarioCount = deliveryDayScenarios.length;

export function deliveryStopsFor(
  day: number,
  version = 1,
  seed = 4,
  returnContext: DeliveryReturnContext | null = null,
): readonly DeliveryStop[] {
  const safeDay = Math.max(1, Math.floor(day));
  const scenario = version === 3 && safeDay > deliveryDayScenarios.length
    ? deliveryContinuationFor(safeDay, seed)
    : version === 2 || version === 3 ? deliveryDayScenarioFor(safeDay, seed) : null;
  const stories = scenario?.stops ?? deliveryStops;
  return stories.map((story, index) => ({
    ...story,
    options: deliveryStops[index]!.options.map((option) => {
      const effect = 'routeEffects' in story ? story.routeEffects?.[option.choice] : undefined;
      const returnEffect = returnOrderEffect(index, option.choice, returnContext);
      if (!effect && !returnEffect) return option;
      return {
        ...option,
        description: [option.description, effect?.description, returnEffect?.description].filter(Boolean).join(' '),
        income: Math.max(1, option.income + (effect?.incomeDelta ?? 0) + (returnEffect?.incomeDelta ?? 0)),
        energyCost: Math.max(1, option.energyCost + (effect?.energyDelta ?? 0) + (returnEffect?.energyDelta ?? 0)),
        outcome: [option.outcome, effect?.outcome, returnEffect?.outcome].filter(Boolean).join(' '),
      };
    }),
  }));
}

export const minimumDeliveryEnergy = deliveryStops.reduce(
  (total, stop) => total + Math.min(...stop.options.map((option) => option.energyCost)),
  0,
);

export const deliveryReturnPolicy = { reliableBonus: 8, rushBonus: 15, rushEnergyCost: 3, reliableEnergySaving: 2 } as const;

export function deliveryReturnContextFor(state: GameState): DeliveryReturnContext | null {
  const trace = state.npcActivityMemory.delivery.lastTrace;
  const choices = trace?.choiceKeys;
  if (trace?.activityId !== 'WANG_DELIVERY' || typeof trace.day !== 'number' || !Number.isInteger(trace.day)
    || trace.day <= 0 || trace.day >= state.day || !choices || choices.length !== deliveryStops.length
    || choices.some((choice) => !(['MAIN', 'ALLEY', 'RUSH', 'STEADY'] as const).includes(choice as DeliveryChoice))) return null;
  if (choices.every((choice) => choice === 'MAIN' || choice === 'STEADY')) return { previousDay: trace.day, kind: 'RELIABLE' };
  if (choices.includes('RUSH')) return { previousDay: trace.day, kind: 'RUSH' };
  return null;
}

function returnOrderEffect(stopIndex: number, choice: DeliveryChoice, context: DeliveryReturnContext | null) {
  if (stopIndex !== 2 || !context) return null;
  if (context.kind === 'RELIABLE' && choice === 'STEADY') return {
    incomeDelta: deliveryReturnPolicy.reliableBonus,
    energyDelta: -deliveryReturnPolicy.reliableEnergySaving,
    description: `熟客服务委托稳速返 ¥${deliveryReturnPolicy.reliableBonus}，少耗 ${deliveryReturnPolicy.reliableEnergySaving} 点精力。`,
    outcome: '熟客确认准时收到，平台服务返还到账。',
  };
  if (context.kind === 'RUSH' && choice === 'RUSH') return {
    incomeDelta: deliveryReturnPolicy.rushBonus,
    energyDelta: deliveryReturnPolicy.rushEnergyCost,
    description: `高峰加急补贴 ¥${deliveryReturnPolicy.rushBonus}，额外耗 ${deliveryReturnPolicy.rushEnergyCost} 点精力。`,
    outcome: '你接下高峰加急单，补贴到账，也多消耗了精力。',
  };
  return null;
}

export interface DeliveryRunProfile {
  minimumIncome: number;
  maximumIncome: number;
  minimumEnergy: number;
  maximumEnergy: number;
}

export function deliveryRunProfile(day: number, version = 3, seed = 4, returnContext: DeliveryReturnContext | null = null): DeliveryRunProfile {
  const stops = deliveryStopsFor(day, version, seed, returnContext);
  return {
    minimumIncome: stops.reduce((total, stop) => total + Math.min(...stop.options.map((option) => option.income)), 0),
    maximumIncome: stops.reduce((total, stop) => total + Math.max(...stop.options.map((option) => option.income)), 0),
    minimumEnergy: stops.reduce((total, stop) => total + Math.min(...stop.options.map((option) => option.energyCost)), 0),
    maximumEnergy: stops.reduce((total, stop) => total + Math.max(...stop.options.map((option) => option.energyCost)), 0),
  };
}

export function deliveryRunProfileForState(state: GameState): DeliveryRunProfile {
  return deliveryRunProfile(state.day, 3, state.scenarioSeed, deliveryReturnContextFor(state));
}

export function minimumDeliveryEnergyFor(day: number, version = 3, seed = 4, returnContext: DeliveryReturnContext | null = null): number {
  return deliveryRunProfile(day, version, seed, returnContext).minimumEnergy;
}

export function minimumEnergyAfterDeliveryStop(stopIndex: number, stops: readonly DeliveryStop[] = deliveryStops): number {
  return stops.slice(stopIndex + 1).reduce(
    (total, stop) => total + Math.min(...stop.options.map((option) => option.energyCost)),
    0,
  );
}

export function createDeliveryRun(
  day: number,
  seed = 4,
  scenarioVersion: 1 | 2 | 3 = 2,
  returnContext: DeliveryReturnContext | null = null,
): DeliveryRunState {
  return {
    id: 'WANG_DELIVERY',
    day,
    status: 'ACTIVE',
    scenarioVersion,
    scenarioSeed: seed >>> 0,
    ...(returnContext ? { returnContext } : {}),
    stopIndex: 0,
    totalIncome: 0,
    energySpent: 0,
    decisions: [],
  };
}

export function resolveDeliveryChoice(
  stopIndex: number,
  choice: DeliveryChoice,
  stops: readonly DeliveryStop[] = deliveryStops,
): DeliveryDecision | null {
  const option = stops[stopIndex]?.options.find((candidate) => candidate.choice === choice);
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

export function reduceDeliveryRunAction(state: GameState, action: GameAction): GameState | null {
  switch (action.type) {
    case 'START_DELIVERY_RUN':
      {
        const returnContext = deliveryReturnContextFor(state);
        if (state.phase !== 'DAYTIME' || state.workedToday || state.energy < minimumDeliveryEnergyFor(state.day, 3, state.scenarioSeed, returnContext) || state.activeActivity) return state;
        return { ...state, activeActivity: createDeliveryRun(state.day, state.scenarioSeed, 3, returnContext) };
      }
    case 'CHOOSE_DELIVERY_ROUTE': {
      const run = state.activeActivity;
      if (state.phase !== 'DAYTIME' || !run || run.id !== 'WANG_DELIVERY' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
      const stops = deliveryStopsFor(run.day, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
      const decision = resolveDeliveryChoice(run.stopIndex, action.choice, stops);
      if (!decision || state.energy - decision.energyCost < minimumEnergyAfterDeliveryStop(run.stopIndex, stops)) return state;
      const nextRun = advanceDeliveryRun(run, decision);
      const energy = Math.max(0, state.energy - decision.energyCost);
      if (nextRun.status !== 'RESULT') return { ...state, energy, activeActivity: nextRun };
      return {
        ...state,
        energy,
        cash: Number((state.cash + nextRun.totalIncome).toFixed(2)),
        dailyWorkIncome: Number((state.dailyWorkIncome + nextRun.totalIncome).toFixed(2)),
        workedToday: true,
        activeActivity: nextRun,
      };
    }
    case 'ABANDON_DELIVERY_RUN':
      return abandonDeliveryRun(state);
    default:
      return null;
  }
}
