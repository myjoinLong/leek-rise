import type { GameState } from '../types';
import type { LaoLiangStallAction, StallPriceTier, StallProduct, StallStep, StallDecision } from '../marketStallTypes';

export const stallPolicy = { baseWage: 60, energyPerSale: 5, minimumEnergy: 15, commissionShare: 0.5 } as const;

export const stallProducts: Record<StallProduct, { name: string; cost: number; prices: Record<StallPriceTier, number> }> = {
  THERMOS: { name: '保温杯', cost: 12, prices: { VALUE: 20, STANDARD: 30, PREMIUM: 42 } },
  RAINCOAT: { name: '儿童雨披', cost: 18, prices: { VALUE: 28, STANDARD: 38, PREMIUM: 52 } },
  CABLE: { name: '快充线', cost: 5, prices: { VALUE: 10, STANDARD: 18, PREMIUM: 28 } },
};

export const stallCustomers = [
  { name: '早高峰通勤客', clue: '夜里降温，附近通勤客在找保温杯。预算 ¥38，预计需求 3 件。', product: 'THERMOS', budget: 38, units: 3 },
  { name: '亲子活动家长', clue: '活动场地突然下雨，家长要结实的儿童雨披。预算 ¥52，预计需求 3 件。', product: 'RAINCOAT', budget: 52, units: 3 },
  { name: '晚班通勤客', clue: '手机快没电，只想买条能应急的快充线。预算 ¥25，预计需求 4 件。', product: 'CABLE', budget: 25, units: 4 },
] as const;

export function quoteStallSale(step: StallStep, product: StallProduct, priceTier: StallPriceTier): Omit<StallDecision, 'step'> {
  const customer = stallCustomers[step];
  const item = stallProducts[product];
  const unitPrice = item.prices[priceTier];
  const matched = customer.product === product;
  const withinBudget = unitPrice <= customer.budget;
  const unitsSold = matched && withinBudget
    ? Math.max(0, customer.units - (priceTier === 'VALUE' ? 0 : priceTier === 'STANDARD' ? 1 : 2))
    : 0;
  const commission = Math.floor((unitPrice - item.cost) * unitsSold * stallPolicy.commissionShare);
  return { product, priceTier, unitPrice, unitsSold, commission };
}

export function reduceLaoLiangStall(state: GameState, action: LaoLiangStallAction): GameState {
  if (action.type === 'START_LAOLIANG_STALL') {
    if (state.phase !== 'DAYTIME' || state.activeActivity || state.workedToday || state.energy < stallPolicy.minimumEnergy) return state;
    return {
      ...state,
      workedToday: true,
      activeActivity: { id: 'LAOLIANG_MARKET_STALL', day: state.day, status: 'ACTIVE', step: 0, selectedProduct: null, energySpent: 0, decisions: [] },
    };
  }

  const run = state.activeActivity;
  if (state.phase !== 'DAYTIME' || run?.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
  if (action.type === 'ABANDON_LAOLIANG_STALL') return { ...state, activeActivity: null };
  if (action.type === 'SELECT_STALL_PRODUCT') return { ...state, activeActivity: { ...run, selectedProduct: action.product } };
  if (action.type !== 'SELL_STALL_GOODS' || !run.selectedProduct || state.energy < stallPolicy.energyPerSale) return state;

  const decision: StallDecision = { step: run.step, ...quoteStallSale(run.step, run.selectedProduct, action.priceTier) };
  const decisions = [...run.decisions, decision];
  const energy = state.energy - stallPolicy.energyPerSale;
  const energySpent = run.energySpent + stallPolicy.energyPerSale;
  if (run.step < 2) {
    return {
      ...state,
      energy,
      activeActivity: { ...run, step: (run.step + 1) as StallStep, selectedProduct: null, energySpent, decisions },
    };
  }

  const income = stallPolicy.baseWage + decisions.reduce((total, entry) => total + entry.commission, 0);
  return {
    ...state,
    energy,
    cash: Number((state.cash + income).toFixed(2)),
    dailyWorkIncome: Number((state.dailyWorkIncome + income).toFixed(2)),
    activeActivity: { id: run.id, day: run.day, status: 'RESULT', step: 3, energySpent, decisions, income },
  };
}
