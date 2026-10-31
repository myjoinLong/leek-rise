import { gameReducer } from '../reducer';
import type { GameAction } from '../reducer';
import { createInitialState } from '../state';
import type { GameState } from '../types';
import { economyStrategies, isBikeRepairCashStrategy, isBikeRepairStreamingStrategy, isBikeRepairStrategy, isPhoneFlipCashStrategy, isPhoneFlipStrategy, tradingAction } from './strategies';
import type { EconomyStrategy } from './strategies';
import { factoryInspectionForDay, factoryShiftStops } from '../systems/factoryShift';
import { runCafeStrategy } from './cafeStrategy';
import { runBikeRepairStrategy } from './bikeRepairStrategy';
import { runPhoneFlipStrategy } from './phoneFlipStrategy';
import { validateBikeRepairSettings } from './bikeRepairValidation';
import { marketTicksPerDay } from '../timeRules';
import type { EconomyDay, EconomyScenario, EconomySimulation } from './economyTypes';
export type { EconomyDay, EconomyScenario, EconomySimulation } from './economyTypes';

export const prototypeExperiment = {
  horizons: [30, 60, 90],
  ticksPerDay: [0, 20, 60],
  genders: ['MALE', 'FEMALE'],
  deliveryRoute: ['ALLEY', 'MAIN', 'RUSH'],
  streamRoute: ['HONEST_REVIEW', 'ANSWER_QUESTIONS', 'TRANSPARENT_DEAL'],
} as const;

const money = (value: number): number => Number(value.toFixed(2));
const portfolio = (state: GameState): number => money(Object.values(state.stocks).reduce(
  (total, stock) => total + (stock.holding?.shares ?? 0) * stock.price, 0,
));
const equity = (state: GameState): number => money(state.cash + portfolio(state) - state.debt);

export function simulateEconomy(scenario: EconomyScenario): EconomySimulation {
  if (!Number.isInteger(scenario.days) || scenario.days < 1 || scenario.days > 365
    || !Number.isInteger(scenario.ticksPerDay) || scenario.ticksPerDay < 0 || scenario.ticksPerDay > marketTicksPerDay
    || (scenario.seed !== undefined && !Number.isSafeInteger(scenario.seed))) {
    throw new Error(`Simulation requires 1–365 days, 0–${marketTicksPerDay} ticks per day, and a safe-integer seed.`);
  }
  const cafeStrategies: readonly EconomyStrategy[] = ['CAFE', 'CAFE_STREAM', 'CAFE_CASH'];
  if (scenario.cafe && (!cafeStrategies.includes(scenario.strategy)
    || !Number.isInteger(scenario.cafe.mistakesPerShift) || scenario.cafe.mistakesPerShift < 0 || scenario.cafe.mistakesPerShift > 3
    || (scenario.cafe.skipEveryDays !== undefined && (!Number.isInteger(scenario.cafe.skipEveryDays)
      || scenario.cafe.skipEveryDays < 0 || scenario.cafe.skipEveryDays > 365)))) {
    throw new Error('Cafe stress settings require a cafe strategy, 0–3 mistakes, and an optional 0–365 day skip interval.');
  }
  validateBikeRepairSettings(scenario.bikeRepair, scenario.strategy);
  if (scenario.phoneFlip && (!isPhoneFlipStrategy(scenario.strategy)
    || (scenario.phoneFlip.mistakeEveryDays !== undefined && (!Number.isInteger(scenario.phoneFlip.mistakeEveryDays)
      || scenario.phoneFlip.mistakeEveryDays < 1 || scenario.phoneFlip.mistakeEveryDays > 365))
    || (scenario.phoneFlip.skipEveryDays !== undefined && (!Number.isInteger(scenario.phoneFlip.skipEveryDays)
      || scenario.phoneFlip.skipEveryDays < 1 || scenario.phoneFlip.skipEveryDays > 365)))) {
    throw new Error('Phone appraisal stress settings require a phone-flip strategy and optional 1–365 day intervals.');
  }
  if (scenario.repayment && (!Number.isFinite(scenario.repayment.cashReserve)
    || scenario.repayment.cashReserve < 0
    || !Number.isSafeInteger(Math.round(scenario.repayment.cashReserve * 100))
    || money(scenario.repayment.cashReserve) !== scenario.repayment.cashReserve
    || (scenario.repayment.throughDay !== undefined && (!Number.isInteger(scenario.repayment.throughDay)
      || scenario.repayment.throughDay < 1 || scenario.repayment.throughDay > scenario.days)))) {
    throw new Error('Cash reserve must be nonnegative safe-integer cents.');
  }
  if (scenario.resumeInstallmentsOnDays?.some((day) => !Number.isInteger(day) || day < 1 || day > scenario.days)) {
    throw new Error('Installment resumption days must be integers within the simulation horizon.');
  }
  let state = gameReducer(createInitialState(scenario.seed ?? 4), { type: 'SELECT_CHARACTER', gender: scenario.gender });
  const initialEquity = equity(state);
  let peak = initialEquity;
  const daily: EconomyDay[] = [];
  let firstDebtFreeDay: number | null = null;
  const totals = {
    workIncome: 0, activityIncome: 0, fees: 0, interest: 0, operatingCostsPaid: 0, operatingCostsDeferred: 0,
    borrowed: 0, repaid: 0, negotiations: 0, interestGraceEarned: 0, interestGraceWeeksGranted: 0,
    interestGraceApplied: 0, rateRestructureApplied: 0, installmentPaid: 0, installmentShortfalls: 0,
    installmentPeriodsCompleted: 0, contractFees: 0, equityChange: 0, maxDrawdown: 0,
  };
  const dispatch = (action: GameAction): void => {
    const beforeDebt = state.debt;
    const receiptBefore = state.debtInstallmentPlan?.lastReceipt;
    state = gameReducer(state, action);
    const receipt = state.debtInstallmentPlan?.lastReceipt;
    if (receipt && receipt !== receiptBefore) {
      totals.repaid = money(totals.repaid + receipt.paid);
      totals.installmentPaid = money(totals.installmentPaid + receipt.paid);
      if (receipt.shortfall > 0) totals.installmentShortfalls += 1;
      else totals.installmentPeriodsCompleted += 1;
    }
    if (action.type === 'BORROW_FROM_NPC') totals.borrowed = money(totals.borrowed + state.debt - beforeDebt);
    if (action.type === 'REPAY_DEBT') totals.repaid = money(totals.repaid + beforeDebt - state.debt);
    peak = Math.max(peak, equity(state));
    totals.maxDrawdown = Math.max(totals.maxDrawdown, money(peak - equity(state)));
  };
  for (let day = 1; day <= scenario.days; day += 1) {
    const dayStart = { equity: equity(state), assetSaleProceeds: 0 };
    const beforeBorrowed = totals.borrowed;
    const beforeRepaid = totals.repaid;
    let negotiationOutcome: EconomyDay['negotiationOutcome'] = null;
    dispatch({ type: 'ADVANCE_PHASE' });
    if (scenario.strategy === 'BORROW_WORK' && day === 1) dispatch({ type: 'BORROW_FROM_NPC' });
    if (scenario.strategy === 'WORK' || scenario.strategy === 'WORK_CASH' || scenario.strategy === 'BORROW_WORK' || scenario.strategy === 'WORK_STREAM') {
      dispatch({ type: 'START_DELIVERY_RUN' });
      if (!state.activeActivity) throw new Error('Delivery entry was rejected.');
      for (const choice of scenario.deliveryRoute) {
        const previous = state;
        dispatch({ type: 'CHOOSE_DELIVERY_ROUTE', choice });
        if (previous === state) throw new Error('Simulation delivery route is invalid or unaffordable.');
      }
      if (state.activeActivity?.status !== 'RESULT') throw new Error('Simulation delivery route is incomplete.');
      dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    }
    if (scenario.strategy === 'FACTORY' || scenario.strategy === 'FACTORY_STREAM') {
      dispatch({ type: 'START_FACTORY_SHIFT' });
      if (state.activeActivity?.id !== 'WANG_FACTORY') throw new Error('Factory shift entry was rejected.');
      for (let step = 0; step < factoryShiftStops; step += 1) {
        const run = state.activeActivity;
        if (!run || run.id !== 'WANG_FACTORY') throw new Error('Factory inspection state is missing.');
        const inspection = factoryInspectionForDay(state.day, step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
        const previous = state;
        dispatch({ type: 'CHOOSE_FACTORY_CHECK', choice: inspection.correctChoice });
        if (previous === state) throw new Error('Factory inspection sequence was rejected.');
      }
      if (state.activeActivity?.id !== 'WANG_FACTORY' || state.activeActivity.status !== 'RESULT') {
        throw new Error('Factory shift did not settle.');
      }
      dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    }
    if (scenario.strategy === 'CAFE' || scenario.strategy === 'CAFE_STREAM' || scenario.strategy === 'CAFE_CASH') {
      const skipShift = Boolean(scenario.cafe?.skipEveryDays && day % scenario.cafe.skipEveryDays === 0);
      if (!skipShift) {
        runCafeStrategy(state, dispatch, scenario.cafe?.mistakesPerShift ?? 0);
        if (state.activeActivity?.id !== 'SUJIE_CAFE_SHIFT' || state.activeActivity.status !== 'RESULT') throw new Error('Cafe shift did not settle.');
        dispatch({ type: 'RETURN_FROM_ACTIVITY' });
      }
    }
    if (isBikeRepairStrategy(scenario.strategy)) {
      const skipShift = Boolean(scenario.bikeRepair?.skipEveryDays && day % scenario.bikeRepair.skipEveryDays === 0);
      if (!skipShift) {
        runBikeRepairStrategy((action) => { dispatch(action); return state; }, scenario.bikeRepair?.mistakesPerShift ?? 0);
        if (state.activeActivity?.id !== 'ZHENG_BIKE_REPAIR' || state.activeActivity.status !== 'RESULT') throw new Error('Bike repair shift did not settle.');
        dispatch({ type: 'RETURN_FROM_ACTIVITY' });
      }
    }
    if (isPhoneFlipStrategy(scenario.strategy)) {
      const skipShift = Boolean(scenario.phoneFlip?.skipEveryDays && day % scenario.phoneFlip.skipEveryDays === 0);
      if (!skipShift) {
        const misjudgeRiskLot = Boolean(scenario.phoneFlip?.mistakeEveryDays && day % scenario.phoneFlip.mistakeEveryDays === 0);
        runPhoneFlipStrategy((action) => {
          dispatch(action);
          return state;
        }, { misjudgeRiskLot });
        if (state.activeActivity?.id !== 'PHONE_FLIP' || state.activeActivity.status !== 'RESULT') {
          throw new Error('Phone appraisal shift did not settle.');
        }
        dispatch({ type: 'RETURN_FROM_ACTIVITY' });
      }
    }
    if (scenario.strategy === 'STREAM' || scenario.strategy === 'WORK_STREAM' || scenario.strategy === 'FACTORY_STREAM' || scenario.strategy === 'CAFE_STREAM'
      || isBikeRepairStreamingStrategy(scenario.strategy)) {
      dispatch({ type: 'START_STREAM_RUN' });
      if (state.activeActivity?.id !== 'XIAOLIAN_STREAM') throw new Error('Stream entry was rejected.');
      const streamRoute = scenario.streamRoute ?? prototypeExperiment.streamRoute;
      for (const choice of streamRoute) {
        const previous = state;
        dispatch({ type: 'CHOOSE_STREAM_OPTION', choice });
        if (previous === state) throw new Error('Simulation stream choice is invalid or unaffordable.');
      }
      if (state.activeActivity?.id !== 'XIAOLIAN_STREAM' || state.activeActivity.status !== 'RESULT') {
        throw new Error('Simulation stream run is incomplete.');
      }
      dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    }
    const incomeEvidence = state.dailyWorkIncome + state.dailyStreamIncome > 0 || state.weeklyStreamIncome > 0;
    if (scenario.negotiationOffer && state.debtCrisisStarted && !state.debtNegotiationCompleted && incomeEvidence) {
      dispatch({ type: 'START_JIUGE_NEGOTIATION' });
      dispatch({ type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });
      dispatch({ type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'PROVE_INCOME' });
      dispatch({
        type: 'CHOOSE_JIUGE_NEGOTIATION',
        choice: scenario.negotiationOffer === 'RATE_RESTRUCTURE' ? 'SIGN_RATE_RESTRUCTURE' : scenario.negotiationOffer === 'INSTALLMENTS' ? 'SIGN_INSTALLMENTS' : 'ASK_INTEREST_GRACE',
      });
      const activity = state.activeActivity;
      if (activity?.id === 'JIUGE_NEGOTIATION' && activity.status === 'RESULT') {
        negotiationOutcome = activity.outcome;
        totals.negotiations += 1;
        if (activity.outcome === 'INTEREST_GRACE' || activity.outcome === 'RATE_RESTRUCTURE') {
          totals.interestGraceEarned += 1;
          totals.interestGraceWeeksGranted += activity.outcome === 'RATE_RESTRUCTURE' ? state.debtRatePlanWeeksRemaining : 1;
        }
        dispatch({ type: 'RETURN_FROM_ACTIVITY' });
      }
    }
    dispatch({ type: 'ADVANCE_PHASE' });
    if ((scenario.strategy === 'EXIT' || scenario.strategy === 'WORK_CASH' || scenario.strategy === 'CAFE_CASH'
      || isBikeRepairCashStrategy(scenario.strategy) || isPhoneFlipCashStrategy(scenario.strategy)) && day === 1) {
      const saleStart = { cash: state.cash, fees: state.dailyFees };
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const action = tradingAction(state, 'EXIT', 0);
        if (!action) break;
        dispatch(action);
      }
      if (Object.values(state.stocks).some((stock) => stock.holding)) throw new Error('Exit left unsold holdings.');
      dayStart.assetSaleProceeds = money(state.cash - saleStart.cash + state.dailyFees - saleStart.fees);
    }
    for (let tick = 1; tick <= scenario.ticksPerDay; tick += 1) {
      dispatch({ type: 'ADVANCE_TICK' });
      if (state.phase !== 'TRADING') break;
      const action = tradingAction(state, scenario.strategy, tick);
      if (action && scenario.strategy !== 'EXIT') dispatch(action);
    }
    if (state.phase === 'TRADING') dispatch({ type: 'ADVANCE_PHASE' });
    if (scenario.repayment && (scenario.repayment.throughDay === undefined || day <= scenario.repayment.throughDay)) {
      const amount = money(Math.min(state.debt, Math.max(0, state.cash - scenario.repayment.cashReserve)));
      if (amount > 0) dispatch({ type: 'REPAY_DEBT', amount });
    }
    if (scenario.resumeInstallmentsOnDays?.includes(day)) dispatch({ type: 'RESUME_DEBT_INSTALLMENTS' });
    if (state.debt === 0 && firstDebtFreeDay === null) firstDebtFreeDay = state.day;
    const endEquity = equity(state);
    const borrowed = money(totals.borrowed - beforeBorrowed);
    const repaid = money(totals.repaid - beforeRepaid);
    totals.workIncome = money(totals.workIncome + state.dailyWorkIncome);
    totals.activityIncome = money(totals.activityIncome + state.dailyStreamIncome);
    totals.fees = money(totals.fees + state.dailyFees);
    totals.contractFees = money(totals.contractFees + state.dailyContractFees);
    const costLedger = state.periodicCostLedger;
    const installmentReceipt = state.debtInstallmentPlan?.lastReceipt?.day === state.day
      ? state.debtInstallmentPlan.lastReceipt
      : null;
    const operatingCosts = money(costLedger.rent + costLedger.membership + costLedger.equipment + costLedger.platformShare);
    const operatingCostsPaid = money(operatingCosts - costLedger.deferred);
    totals.interest = money(totals.interest + costLedger.interest);
    totals.operatingCostsPaid = money(totals.operatingCostsPaid + operatingCostsPaid);
    totals.operatingCostsDeferred = money(totals.operatingCostsDeferred + costLedger.deferred);
    if (costLedger.interestGraceApplied) totals.interestGraceApplied += 1;
    if (costLedger.rateRestructureApplied) totals.rateRestructureApplied += 1;
    daily.push({
      day: state.day, debtCrisisStarted: state.debtCrisisStarted, cash: state.cash, debt: state.debt, portfolio: portfolio(state), equity: endEquity,
      equityChange: money(endEquity - dayStart.equity), workIncome: state.dailyWorkIncome,
      activityIncome: state.dailyStreamIncome,
      assetSaleProceeds: dayStart.assetSaleProceeds, fees: state.dailyFees, contractFees: state.dailyContractFees, interest: costLedger.interest,
      rateRestructureApplied: costLedger.rateRestructureApplied,
      installmentDue: installmentReceipt?.due ?? 0,
      installmentPaid: installmentReceipt?.paid ?? 0,
      installmentShortfall: installmentReceipt?.shortfall ?? 0,
      operatingCostsPaid,
      operatingCostsDeferred: costLedger.deferred, negotiationOutcome,
      interestGraceApplied: costLedger.interestGraceApplied, borrowed, repaid, energy: state.energy,
      price: state.stocks[state.selectedStockId]?.price ?? 0,
    });
    if (day < scenario.days) dispatch({ type: 'ADVANCE_PHASE' });
  }
  totals.equityChange = money(equity(state) - initialEquity);
  return { scenario, initialEquity, daily, totals, firstDebtFreeDay, finalState: state };
}

export function runPrototypeEconomyMatrix(): EconomySimulation[] {
  return runSeededEconomyMatrix([4]);
}

export function runSeededEconomyMatrix(seeds: readonly number[]): EconomySimulation[] {
  return seeds.flatMap((seed) => prototypeExperiment.horizons.flatMap((days) => prototypeExperiment.ticksPerDay.flatMap((ticksPerDay) =>
    prototypeExperiment.genders.flatMap((gender) => economyStrategies.map((strategy) => simulateEconomy({
      strategy, days, ticksPerDay, gender, seed, deliveryRoute: prototypeExperiment.deliveryRoute,
    }))),
  )));
}
