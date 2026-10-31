import { gameReducer } from '../reducer';
import type { GameAction } from '../reducer';
import { createInitialState } from '../state';
import type { DeliveryChoice, GameState, PhoneFlipChoice, PlayerGender, StreamChoice } from '../types';
import { stallCustomerForRun, quoteStallSale } from '../systems/laoLiangMarketStall';
import type { StallPriceTier, StallProduct } from '../marketStallTypes';
import { factoryInspectionForDay, factoryShiftStops } from '../systems/factoryShift';
import type { FactoryShiftChoice } from '../factoryShiftTypes';
import { deliveryStopsFor } from '../systems/deliveryRun';
import { laoLiangReturnContextFor } from '../laoLiangStallMemory';
import { runCafeStrategy } from './cafeStrategy';
import { runBikeRepairStrategy } from './bikeRepairStrategy';
import { phoneLotBriefFor } from '../systems/phoneFlip';
import { tradingAction } from './strategies';
import type { EconomyStrategy } from './strategies';
import { firstChapterMaximumDebt, marketTicksPerDay } from '../timeRules';

export const mixedIncomeActivities = ['DELIVERY', 'STREAM', 'FACTORY', 'CAFE', 'STALL', 'BIKE_REPAIR', 'PHONE_FLIP'] as const;
export type MixedIncomeActivity = typeof mixedIncomeActivities[number];
export type MixedIncomeTradingStrategy = Extract<EconomyStrategy, 'LOW_FREQUENCY' | 'HEAVY'>;

export interface MixedIncomeRouteOptions {
  days: number;
  gender: PlayerGender;
  seed: number;
  ticksPerDay?: number;
  cashReserve?: number;
  activities?: readonly MixedIncomeActivity[];
  tradingStrategy?: MixedIncomeTradingStrategy;
  stress?: { mistakesPerShift: 0 | 1; skipEveryDays?: number };
}

export interface MixedIncomeDay {
  day: number;
  activity: MixedIncomeActivity;
  activityIncome: number;
  cash: number;
  debt: number;
  interest: number;
  repaid: number;
  tradingEquityChange: number;
  tradingFees: number;
  missedShift: boolean;
}

export interface MixedIncomeSimulation {
  daily: MixedIncomeDay[];
  finalState: GameState;
  targetMet: boolean;
  totalActivityIncome: number;
  totalInterest: number;
  totalRepaid: number;
  totalTradingEquityChange: number;
  totalTradingFees: number;
}

const money = (value: number): number => Number(value.toFixed(2));
const equity = (state: GameState): number => money(state.cash + Object.values(state.stocks).reduce(
  (total, stock) => total + (stock.holding?.shares ?? 0) * stock.price, 0,
) - state.debt);

export function simulateMixedIncomeRoute(options: MixedIncomeRouteOptions): MixedIncomeSimulation {
  const activities = options.activities ?? mixedIncomeActivities;
  const ticksPerDay = options.ticksPerDay ?? marketTicksPerDay;
  const cashReserve = options.cashReserve ?? 0;
  if (!Number.isInteger(options.days) || options.days < 1 || options.days > 365
    || !Number.isSafeInteger(options.seed)
    || !Number.isInteger(ticksPerDay) || ticksPerDay < 0 || ticksPerDay > marketTicksPerDay
    || !Number.isFinite(cashReserve) || cashReserve < 0 || money(cashReserve) !== cashReserve
    || activities.length === 0
    || (options.stress?.skipEveryDays !== undefined && (!Number.isInteger(options.stress.skipEveryDays)
      || options.stress.skipEveryDays < 1 || options.stress.skipEveryDays > options.days))) {
    throw new Error('Mixed route needs 1–365 days, a safe seed, valid ticks, a nonnegative cash reserve, and at least one activity.');
  }

  let state = gameReducer(createInitialState(options.seed), { type: 'SELECT_CHARACTER', gender: options.gender });
  const daily: MixedIncomeDay[] = [];
  let totalActivityIncome = 0;
  let totalInterest = 0;
  let totalRepaid = 0;
  let totalTradingEquityChange = 0;
  let totalTradingFees = 0;
  const dispatch = (action: GameAction): GameState => {
    state = gameReducer(state, action);
    return state;
  };

  for (let dayIndex = 0; dayIndex < options.days; dayIndex += 1) {
    const activity = activities[dayIndex % activities.length];
    if (!activity) throw new Error('Mixed route activity is missing.');
    dispatch({ type: 'ADVANCE_PHASE' });
    const incomeBefore = state.dailyWorkIncome + state.dailyStreamIncome;
    const missedShift = Boolean(options.stress?.skipEveryDays && state.day % options.stress.skipEveryDays === 0);
    if (!missedShift) runActivity(activity, state, dispatch, options.stress?.mistakesPerShift === 1);
    if (state.activeActivity?.status === 'RESULT') dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    if (state.activeActivity) throw new Error(`Activity ${activity} did not finish on day ${state.day}.`);
    const activityIncome = money(state.dailyWorkIncome + state.dailyStreamIncome - incomeBefore);

    dispatch({ type: 'ADVANCE_PHASE' });
    const tradingEquityBefore = equity(state);
    const tradingFeesBefore = state.dailyFees;
    if (dayIndex === 0) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const action = tradingAction(state, 'EXIT', 0);
        if (!action) break;
        dispatch(action);
      }
    }
    let advancedTicks = 0;
    while (advancedTicks < ticksPerDay && state.phase === 'TRADING') {
      const untilDecision = options.tradingStrategy ? 5 - (advancedTicks % 5) : ticksPerDay - advancedTicks;
      const count = Math.min(untilDecision, ticksPerDay - advancedTicks);
      // Unselected listings without holdings cannot change this simulation's cash, debt, or drawdown.
      const relevantStockIds = [state.selectedStockId, ...Object.entries(state.stocks)
        .filter(([, stock]) => (stock.holding?.shares ?? 0) > 0)
        .map(([id]) => id)];
      dispatch({ type: 'ADVANCE_TICKS', count, stockIds: relevantStockIds });
      advancedTicks += count;
      if (state.phase !== 'TRADING' || !options.tradingStrategy || advancedTicks % 5 !== 0) continue;
      const action = tradingAction(state, options.tradingStrategy, advancedTicks);
      if (action) dispatch(action);
    }
    if (state.phase === 'TRADING') dispatch({ type: 'ADVANCE_PHASE' });
    if (state.phase !== 'NIGHT') throw new Error(`Trading did not settle on day ${state.day}.`);

    const settledCosts = state.periodicCostLedger;
    const tradingEquityChange = money(equity(state) - tradingEquityBefore
      + settledCosts.interest + settledCosts.rent + settledCosts.membership + settledCosts.equipment + settledCosts.platformShare);
    const tradingFees = money(state.dailyFees - tradingFeesBefore);
    const interest = state.periodicCostLedger.interest;
    const cashBeforeRepayment = state.cash;
    const repayment = money(Math.min(state.debt, Math.max(0, cashBeforeRepayment - cashReserve)));
    if (repayment > 0) dispatch({ type: 'REPAY_DEBT', amount: repayment });
    const repaid = money(cashBeforeRepayment - state.cash);
    daily.push({ day: state.day, activity, activityIncome, cash: state.cash, debt: state.debt, interest, repaid, tradingEquityChange, tradingFees, missedShift });
    totalActivityIncome = money(totalActivityIncome + activityIncome);
    totalInterest = money(totalInterest + interest);
    totalRepaid = money(totalRepaid + repaid);
    totalTradingEquityChange = money(totalTradingEquityChange + tradingEquityChange);
    totalTradingFees = money(totalTradingFees + tradingFees);
    if (dayIndex + 1 < options.days) dispatch({ type: 'ADVANCE_PHASE' });
  }

  return {
    daily,
    finalState: state,
    targetMet: state.debt <= firstChapterMaximumDebt,
    totalActivityIncome,
    totalInterest,
    totalRepaid,
    totalTradingEquityChange,
    totalTradingFees,
  };
}

function runActivity(
  activity: MixedIncomeActivity,
  initialState: GameState,
  dispatch: (action: GameAction) => GameState,
  makeMistake: boolean,
): void {
  if (activity === 'DELIVERY') {
    dispatch({ type: 'START_DELIVERY_RUN' });
    const route = ['ALLEY', 'MAIN', 'RUSH'] as const;
    const stops = deliveryStopsFor(initialState.day, 3, initialState.scenarioSeed);
    route.forEach((preferred, index) => {
      const options = stops[index]?.options ?? [];
      const choice = makeMistake && index === 0
        ? options.reduce((lowest, option) => option.income < lowest.income ? option : lowest, options[0]!).choice
        : preferred;
      dispatch({ type: 'CHOOSE_DELIVERY_ROUTE', choice: choice as DeliveryChoice });
    });
    return;
  }
  if (activity === 'STREAM') {
    dispatch({ type: 'START_STREAM_RUN' });
    const route: readonly StreamChoice[] = ['HONEST_REVIEW', 'ANSWER_QUESTIONS', 'TRANSPARENT_DEAL'];
    route.forEach((preferred, index) => {
      const choice = makeMistake && index === 0 ? 'HYPE_CLAIM' : preferred;
      dispatch({ type: 'CHOOSE_STREAM_OPTION', choice });
    });
    return;
  }
  if (activity === 'FACTORY') {
    dispatch({ type: 'START_FACTORY_SHIFT' });
    for (let step = 0; step < factoryShiftStops; step += 1) {
      const inspection = factoryInspectionForDay(initialState.day, step, 4, initialState.scenarioSeed);
      const wrongChoice: FactoryShiftChoice = inspection.correctChoice === 'PASS' ? 'REWORK' : 'PASS';
      dispatch({ type: 'CHOOSE_FACTORY_CHECK', choice: makeMistake && step === 0 ? wrongChoice : inspection.correctChoice });
    }
    return;
  }
  if (activity === 'CAFE') {
    runCafeStrategy(initialState, dispatch, makeMistake ? 1 : 0);
    return;
  }
  if (activity === 'STALL') {
    const returnContext = laoLiangReturnContextFor(initialState);
    dispatch({ type: 'START_LAOLIANG_STALL' });
    for (let step = 0; step < 3; step += 1) {
      const run = initialState.activeActivity;
      const scenarioVersion = run?.id === 'LAOLIANG_MARKET_STALL' ? run.scenarioVersion ?? 3 : 3;
      const seed = run?.id === 'LAOLIANG_MARKET_STALL' ? run.scenarioSeed ?? initialState.scenarioSeed : initialState.scenarioSeed;
      const customer = stallCustomerForRun(initialState.day, step as 0 | 1 | 2, scenarioVersion, seed, returnContext);
      const tiers: readonly StallPriceTier[] = ['VALUE', 'STANDARD', 'PREMIUM'];
      const otherProducts: readonly StallProduct[] = ['THERMOS', 'RAINCOAT', 'CABLE'];
      const product = makeMistake && step === 0
        ? otherProducts.find((candidate) => candidate !== customer.product) ?? customer.product
        : customer.product;
      const tier = tiers.reduce((best, candidate) => quoteStallSale(step as 0 | 1 | 2, customer.product, candidate, initialState.day, seed, scenarioVersion, returnContext).commission
        > quoteStallSale(step as 0 | 1 | 2, customer.product, best, initialState.day, seed, scenarioVersion, returnContext).commission ? candidate : best, tiers[0] ?? 'VALUE');
      dispatch({ type: 'SELECT_STALL_PRODUCT', product });
      dispatch({ type: 'SELL_STALL_GOODS', priceTier: tier });
    }
    return;
  }
  if (activity === 'BIKE_REPAIR') {
    runBikeRepairStrategy(dispatch, makeMistake ? 1 : 0);
    return;
  }
  runPhoneFlipRoute(initialState, dispatch, makeMistake);
}

function runPhoneFlipRoute(
  initialState: GameState,
  dispatch: (action: GameAction) => GameState,
  makeMistake: boolean,
): void {
  let state = dispatch({ type: 'START_PHONE_FLIP' });
  if (state.activeActivity?.id !== 'PHONE_FLIP') return;
  const preferredChoices: Record<ReturnType<typeof phoneLotBriefFor>['profile'], PhoneFlipChoice> = {
    CLEAN: 'BARGAIN_QUICK',
    BATTERY: 'ASK_REFURB',
    CORROSION: 'PASS',
  };
  let mistakeUsed = false;
  while (state.activeActivity?.id === 'PHONE_FLIP' && state.activeActivity.status === 'ACTIVE') {
    const run = state.activeActivity;
    const lot = phoneLotBriefFor(run.day, run.step, run.scenarioVersion ?? 4, run.scenarioSeed ?? initialState.scenarioSeed, run.returnContext ?? null);
    if (!run.inspection && state.energy >= 3) state = dispatch({ type: 'INSPECT_PHONE_LOT' });
    const activeRun = state.activeActivity;
    if (activeRun?.id !== 'PHONE_FLIP' || activeRun.status !== 'ACTIVE') break;
    const forceMistake = makeMistake && !mistakeUsed && lot.profile === 'CORROSION';
    let choice = forceMistake ? 'BARGAIN_QUICK' : preferredChoices[lot.profile];
    const inspection = activeRun.inspection;
    const bargain = choice === 'BARGAIN_QUICK' || choice === 'BARGAIN_REFURB';
    const refurbish = choice === 'ASK_REFURB' || choice === 'BARGAIN_REFURB';
    const offer = bargain ? lot.bargainPrice ?? lot.askingPrice : lot.askingPrice;
    const requiredCash = offer + (refurbish ? inspection?.repairCost ?? 0 : 0);
    if (choice !== 'PASS' && state.cash < requiredCash) choice = 'PASS';
    if (forceMistake && choice !== 'PASS') mistakeUsed = true;
    const previous = state;
    state = dispatch({ type: 'RESOLVE_PHONE_LOT', choice });
    if (state === previous) throw new Error('Phone appraisal decision was rejected.');
  }
}
