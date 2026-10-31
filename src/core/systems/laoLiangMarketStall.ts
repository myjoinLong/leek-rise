import type { GameState } from '../types';
import type { LaoLiangReturnContext, LaoLiangStallAction, StallPriceTier, StallProduct, StallScenarioVersion, StallStep, StallDecision } from '../marketStallTypes';
import { stallReferralMaxCustomerUnits } from '../marketStallTypes';
import { stallCustomerFor } from '../marketStallScenarios';
import { laoLiangReturnContextFor } from '../laoLiangStallMemory';

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

export function stallCustomerForRun(
  day: number,
  step: StallStep,
  scenarioVersion: StallScenarioVersion = 1,
  seed = 4,
  returnContext: LaoLiangReturnContext | null = null,
) {
  const customer = scenarioVersion === 1 ? stallCustomers[step] : stallCustomerFor(day, step, seed, scenarioVersion);
  if (scenarioVersion !== 3 || !returnContext || customer.product !== returnContext.product || !('ownerLine' in customer)) return customer;
  const units = Math.min(stallReferralMaxCustomerUnits, customer.units + 1);
  return {
    ...customer,
    units,
    clue: customer.clue.replace(`预计需求 ${customer.units} 件。`, `熟客转介绍增加 1 件，预计需求 ${units} 件。`),
    ownerLine: customer.ownerLine + ` 第 ${returnContext.previousDay} 天你按街坊价卖出的${stallProducts[returnContext.product].name}，有熟客带朋友来买。`,
  };
}

export function quoteStallSale(
  step: StallStep,
  product: StallProduct,
  priceTier: StallPriceTier,
  day = 1,
  seed = 4,
  scenarioVersion: StallScenarioVersion = 1,
  returnContext: LaoLiangReturnContext | null = null,
): Omit<StallDecision, 'step'> {
  const customer = stallCustomerForRun(day, step, scenarioVersion, seed, returnContext);
  const item = stallProducts[product];
  const unitPrice = item.prices[priceTier];
  const matched = customer.product === product;
  const withinBudget = unitPrice <= customer.budget;
  const demandDrop = priceTier === 'VALUE' ? 0 : priceTier === 'STANDARD'
    ? ('standardDemandDrop' in customer ? customer.standardDemandDrop : 1)
    : ('premiumDemandDrop' in customer ? customer.premiumDemandDrop : 2);
  const unitsSold = matched && withinBudget
    ? Math.max(0, customer.units - demandDrop)
    : 0;
  const commission = Math.floor((unitPrice - item.cost) * unitsSold * stallPolicy.commissionShare);
  return { product, priceTier, unitPrice, unitsSold, commission };
}

export function stallIncomeRange(day = 1, seed = 4, scenarioVersion: StallScenarioVersion = 3, returnContext: LaoLiangReturnContext | null = null): { minimum: number; maximum: number } {
  const steps: readonly StallStep[] = [0, 1, 2];
  const products: readonly StallProduct[] = ['THERMOS', 'RAINCOAT', 'CABLE'];
  const tiers: readonly StallPriceTier[] = ['VALUE', 'STANDARD', 'PREMIUM'];
  const stepBounds = steps.map((step) => {
    const commissions = products.flatMap((product) => tiers.map((tier) =>
      quoteStallSale(step, product, tier, day, seed, scenarioVersion, returnContext).commission));
    return { minimum: Math.min(...commissions), maximum: Math.max(...commissions) };
  });
  return {
    minimum: stallPolicy.baseWage + stepBounds.reduce((total, range) => total + range.minimum, 0),
    maximum: stallPolicy.baseWage + stepBounds.reduce((total, range) => total + range.maximum, 0),
  };
}

export function reduceLaoLiangStall(state: GameState, action: LaoLiangStallAction): GameState {
  if (action.type === 'START_LAOLIANG_STALL') {
    if (state.phase !== 'DAYTIME' || state.activeActivity || state.workedToday || state.energy < stallPolicy.minimumEnergy) return state;
    const returnContext = laoLiangReturnContextFor(state);
    return {
      ...state,
      workedToday: true,
      activeActivity: { id: 'LAOLIANG_MARKET_STALL', day: state.day, scenarioVersion: 3, scenarioSeed: state.scenarioSeed,
        ...(returnContext ? { returnContext } : {}),
        status: 'ACTIVE', step: 0, selectedProduct: null, energySpent: 0, decisions: [] },
    };
  }

  const run = state.activeActivity;
  if (state.phase !== 'DAYTIME' || run?.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
  if (action.type === 'ABANDON_LAOLIANG_STALL') return { ...state, activeActivity: null };
  if (action.type === 'SELECT_STALL_PRODUCT') return { ...state, activeActivity: { ...run, selectedProduct: action.product } };
  if (action.type !== 'SELL_STALL_GOODS' || !run.selectedProduct || state.energy < stallPolicy.energyPerSale) return state;

  const decision: StallDecision = {
    step: run.step,
    ...quoteStallSale(run.step, run.selectedProduct, action.priceTier, run.day, run.scenarioSeed ?? 4, run.scenarioVersion ?? 1, run.returnContext ?? null),
  };
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
    activeActivity: {
      id: run.id, day: run.day, scenarioVersion: run.scenarioVersion, scenarioSeed: run.scenarioSeed,
      ...(run.returnContext ? { returnContext: run.returnContext } : {}),
      status: 'RESULT', step: 3, energySpent, decisions, income,
    },
  };
}
