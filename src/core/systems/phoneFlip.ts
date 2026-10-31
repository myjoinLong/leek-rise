import type { GameAction } from '../reducer';
import type { GameState } from '../types';
import type { PhoneFlipActiveState, PhoneFlipChoice, PhoneFlipDecision, PhoneFlipOfferPreview, PhoneFlipReturnContext, PhoneFlipStep, PhoneInspection } from '../phoneFlipTypes';
import { phoneFlipScenarioFor } from '../phoneFlipScenarios';
import type { PhoneFlipProfile } from '../phoneFlipScenarios';
import { phoneFlipReturnContextFor } from '../phoneFlipMemory';

export const phoneFlipPolicy = { jobs: 3, inspectEnergy: 3, minimumEnergy: 6, maxUninspectedRepairReserve: 300 } as const;

export interface PhoneLotBrief {
  id: string;
  profile: PhoneFlipProfile;
  name: string;
  sellerName: string;
  askingPrice: number;
  bargainPrice: number | null;
  sellerLine: string;
  clue: string;
  appraiserLine: string;
}

interface PhoneLot extends Omit<PhoneLotBrief, 'id' | 'profile' | 'name' | 'sellerName' | 'sellerLine' | 'clue' | 'appraiserLine'> {
  profile: PhoneFlipProfile;
  name: string;
  sellerLine: string;
  clue: string;
  acceptsBargain: boolean;
  condition: string;
  diagnosis: string;
  repairCost: number;
  resaleAsIs: number;
  resaleRefurbished: number;
}

const lots: readonly PhoneLot[] = [
  {
    profile: 'CLEAN', name: '轻薄旗舰机', askingPrice: 620, bargainPrice: 558, sellerLine: '卖家急着回现金，愿意听还价。',
    clue: '机身只有轻微磨损，开机和触控看起来正常。', acceptsBargain: true, condition: '外观轻微使用痕迹，主要功能正常。',
    diagnosis: '验机未发现功能故障。整备只需清洁。', repairCost: 0, resaleAsIs: 770, resaleRefurbished: 790,
  },
  {
    profile: 'BATTERY', name: '续航旧款机', askingPrice: 460, bargainPrice: null, sellerLine: '卖家称底价已经谈好，不接受还价。',
    clue: '卖家说一直插着电，没法确认离电后的续航。', acceptsBargain: false, condition: '电池健康度偏低。',
    diagnosis: '电池健康度 69%，更换电芯约 ¥90。', repairCost: 90, resaleAsIs: 510, resaleRefurbished: 670,
  },
  {
    profile: 'CORROSION', name: '低价大屏机', askingPrice: 420, bargainPrice: 378, sellerLine: '卖家急着处理，愿意小幅议价。',
    clue: '充电口附近有氧化痕迹，卖家说不影响使用。', acceptsBargain: true, condition: '主板有进液腐蚀痕迹。',
    diagnosis: '主板腐蚀，深度维修约 ¥300，返修风险仍高。', repairCost: 300, resaleAsIs: 180, resaleRefurbished: 680,
  },
];

const roundMoney = (value: number): number => Number(value.toFixed(2));

function legacyLotFor(day: number, step: PhoneFlipStep): PhoneLot {
  const index = (Math.max(1, day) - 1 + step) % lots.length;
  return lots[index]!;
}

function lotFor(
  day: number,
  step: PhoneFlipStep,
  version: 1 | 2 | 3 | 4 | 5,
  seed: number,
  returnContext: PhoneFlipReturnContext | null = null,
): PhoneLot {
  if (version === 1) return legacyLotFor(day, step);
  const scenario = phoneFlipScenarioFor(day, step, seed, version, returnContext);
  const profile = lots.find((lot) => lot.profile === scenario.profile)!;
  const delta = scenario.pricingDelta ?? { asking: 0, bargain: 0, repair: 0 };
  return {
    ...profile,
    askingPrice: profile.askingPrice + delta.asking,
    bargainPrice: profile.bargainPrice === null ? null : profile.bargainPrice + delta.asking + delta.bargain,
    repairCost: Math.max(0, profile.repairCost + delta.repair),
    resaleAsIs: profile.resaleAsIs + delta.asking + delta.bargain,
    resaleRefurbished: profile.resaleRefurbished + delta.asking + delta.repair,
    name: scenario.name, sellerLine: scenario.sellerLine, clue: scenario.clue,
  };
}

export function phoneLotBriefFor(
  day: number,
  step: PhoneFlipStep,
  version: 1 | 2 | 3 | 4 | 5 = 2,
  seed = 4,
  returnContext: PhoneFlipReturnContext | null = null,
): PhoneLotBrief {
  const lot = lotFor(day, step, version, seed, returnContext);
  if (version === 1) return { id: `phone-v1-${day}-${step}`, profile: lot.profile, name: lot.name, sellerName: '卖家', askingPrice: lot.askingPrice,
    bargainPrice: lot.bargainPrice, sellerLine: lot.sellerLine, clue: lot.clue, appraiserLine: '阿浩提醒你先核对机况，再算收购成本。' };
  const scenario = phoneFlipScenarioFor(day, step, seed, version, returnContext);
  return { ...scenario, askingPrice: lot.askingPrice, bargainPrice: lot.bargainPrice };
}

export function phoneLotPriceRangeFor(day: number, seed = 4, version: 2 | 3 | 4 | 5 = 5): { minimumOffer: number; maximumOffer: number } {
  const steps: readonly PhoneFlipStep[] = [0, 1, 2];
  const lotsForDay = steps.map((step) => phoneLotBriefFor(day, step, version, seed));
  const offers = lotsForDay.flatMap((lot) => lot.bargainPrice === null
    ? [lot.askingPrice]
    : [lot.askingPrice, lot.bargainPrice]);
  return { minimumOffer: Math.min(...offers), maximumOffer: Math.max(...offers) };
}

function inspectLot(lot: PhoneLot): PhoneInspection {
  const bargainPrice = lot.bargainPrice;
  return {
    condition: lot.condition,
    diagnosis: lot.diagnosis,
    repairCost: lot.repairCost,
    resaleAsIs: lot.resaleAsIs,
    resaleRefurbished: lot.resaleRefurbished,
    quickProfitAtAsk: roundMoney(lot.resaleAsIs - lot.askingPrice),
    refurbProfitAtAsk: roundMoney(lot.resaleRefurbished - lot.askingPrice - lot.repairCost),
    quickProfitAtBargain: bargainPrice === null ? null : roundMoney(lot.resaleAsIs - bargainPrice),
    refurbProfitAtBargain: bargainPrice === null ? null : roundMoney(lot.resaleRefurbished - bargainPrice - lot.repairCost),
  };
}

function createRun(day: number, seed: number, returnContext: PhoneFlipReturnContext | null): PhoneFlipActiveState {
  return { id: 'PHONE_FLIP', day, scenarioVersion: 5, scenarioSeed: seed >>> 0, status: 'ACTIVE', step: 0,
    returnContext, energySpent: 0, decisions: [], totalProfit: 0, inspection: null };
}

function choiceParts(choice: PhoneFlipChoice): { pass: boolean; bargain: boolean; refurbish: boolean } {
  return {
    pass: choice === 'PASS',
    bargain: choice === 'BARGAIN_QUICK' || choice === 'BARGAIN_REFURB',
    refurbish: choice === 'ASK_REFURB' || choice === 'BARGAIN_REFURB',
  };
}

interface PhoneFlipDeal {
  parts: ReturnType<typeof choiceParts>;
  offerPrice: number;
  bargainRejected: boolean;
  bought: boolean;
  repairCost: number;
  salePrice: number;
  profit: number;
  projectedProfit: number;
}

function dealForLot(lot: PhoneLot, choice: PhoneFlipChoice): PhoneFlipDeal {
  const parts = choiceParts(choice);
  const offerPrice = parts.bargain ? (lot.bargainPrice ?? lot.askingPrice) : lot.askingPrice;
  const bargainRejected = !parts.pass && parts.bargain && !lot.acceptsBargain;
  const bought = !parts.pass && !bargainRejected;
  const repairCost = bought && parts.refurbish ? lot.repairCost : 0;
  const salePrice = bought ? (parts.refurbish ? lot.resaleRefurbished : lot.resaleAsIs) : 0;
  const profit = bought ? roundMoney(salePrice - offerPrice - repairCost) : 0;
  const projectedRepair = parts.refurbish ? lot.repairCost : 0;
  const projectedSale = parts.refurbish ? lot.resaleRefurbished : lot.resaleAsIs;
  const projectedProfit = parts.pass ? 0 : roundMoney(projectedSale - offerPrice - projectedRepair);
  return { parts, offerPrice, bargainRejected, bought, repairCost, salePrice, profit, projectedProfit };
}

export function quotePhoneFlipOffer(
  state: Pick<GameState, 'cash'>,
  run: PhoneFlipActiveState,
  choice: PhoneFlipChoice,
): PhoneFlipOfferPreview {
  const lot = lotFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
  const deal = dealForLot(lot, choice);
  const parts = deal.parts;
  const repairReserve = parts.refurbish
    ? run.inspection?.repairCost ?? phoneFlipPolicy.maxUninspectedRepairReserve
    : 0;
  const cashRequired = parts.pass ? 0 : deal.offerPrice + repairReserve;
  const projectedProfit = run.inspection ? deal.projectedProfit : null;
  return {
    cashRequired,
    affordable: state.cash >= cashRequired,
    projectedProfit,
    projectedCashAfterSale: projectedProfit === null ? null : roundMoney(state.cash + projectedProfit),
  };
}

function resolveLot(state: GameState, run: PhoneFlipActiveState, choice: PhoneFlipChoice): GameState {
  const lot = lotFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
  const deal = dealForLot(lot, choice);
  const { parts, offerPrice, bargainRejected, bought, repairCost, salePrice, profit } = deal;
  const inspection = inspectLot(lot);
  if (bought && state.cash < offerPrice + repairCost) return state;

  let explanation = parts.pass ? run.inspection
    ? `验机显示${inspection.condition}：${inspection.diagnosis} 你选择放弃，保住现金。`
    : '你放弃了这台，保住现金。' : bargainRejected
    ? '卖家拒绝还价，这笔交易没有发生。' : '';
  if (bought) {
    const condition = inspection.condition.replace(/[。！？]$/, '');
    const discovery = run.inspection
      ? `验机发现：${condition}（${inspection.diagnosis}）。`
      : `未验机收购，成交后才发现：${condition}。`;
    const purchase = parts.bargain ? '议价收购' : '按标价收购';
    const handling = parts.refurbish ? '整备后转卖' : '直接转卖';
    const result = profit >= 0 ? `净收益 +¥${profit}` : `净亏损 −¥${Math.abs(profit)}`;
    explanation = `${discovery}你选择${purchase}、${handling}。转售价 ¥${salePrice} − 收购 ¥${offerPrice} − 整备 ¥${repairCost} = ${result}。`;
  }
  const decision: PhoneFlipDecision = {
    step: run.step, phoneName: lot.name, choice, inspection: run.inspection, offerPrice, bought, bargainRejected,
    purchaseCost: bought ? offerPrice : 0, repairCost, salePrice, profit, explanation,
  };
  const decisions = [...run.decisions, decision];
  const totalProfit = roundMoney(run.totalProfit + profit);
  const stateAfterDeal: GameState = bought ? {
    ...state,
    cash: roundMoney(state.cash + profit),
    dailyWorkIncome: roundMoney(state.dailyWorkIncome + profit),
  } : state;

  if (run.step < phoneFlipPolicy.jobs - 1) {
    return {
      ...stateAfterDeal,
      activeActivity: { ...run, step: (run.step + 1) as PhoneFlipStep, inspection: null, decisions, totalProfit },
    };
  }
  const result = {
    id: 'PHONE_FLIP' as const,
    day: run.day,
    scenarioVersion: run.scenarioVersion,
    scenarioSeed: run.scenarioSeed,
    status: 'RESULT' as const,
    step: 3 as const,
    energySpent: run.energySpent,
    decisions: [decisions[0]!, decisions[1]!, decisions[2]!] as [PhoneFlipDecision, PhoneFlipDecision, PhoneFlipDecision],
    totalProfit,
  };
  return { ...stateAfterDeal, activeActivity: result };
}

export function reducePhoneFlip(state: GameState, action: GameAction): GameState | null {
  if (action.type === 'START_PHONE_FLIP') {
    if (state.phase !== 'DAYTIME' || state.activeActivity || state.workedToday || state.energy < phoneFlipPolicy.minimumEnergy) return state;
    return { ...state, workedToday: true, activeActivity: createRun(state.day, state.scenarioSeed, phoneFlipReturnContextFor(state)) };
  }

  const run = state.activeActivity;
  if (action.type === 'ABANDON_PHONE_FLIP') {
    return run?.id === 'PHONE_FLIP' && run.status === 'ACTIVE' ? { ...state, activeActivity: null } : null;
  }
  if (state.phase !== 'DAYTIME' || run?.id !== 'PHONE_FLIP' || run.status !== 'ACTIVE' || run.day !== state.day) return null;

  if (action.type === 'INSPECT_PHONE_LOT') {
    if (run.inspection || state.energy < phoneFlipPolicy.inspectEnergy) return state;
    return {
      ...state,
      energy: state.energy - phoneFlipPolicy.inspectEnergy,
      activeActivity: { ...run, energySpent: run.energySpent + phoneFlipPolicy.inspectEnergy,
        inspection: inspectLot(lotFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null)) },
    };
  }
  if (action.type === 'RESOLVE_PHONE_LOT') return resolveLot(state, run, action.choice);
  return null;
}
