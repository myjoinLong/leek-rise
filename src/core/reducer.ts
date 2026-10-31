import { mulberry32 } from './rng';
import * as tradeEngine from './systems/tradeEngine';
import { tickStock } from './systems/scriptEngine';
import { settlePeriodicCosts } from './systems/periodicCosts';
import { firstChapterDeadlineDay, firstChapterMaximumDebt, marketTicksPerDay } from './timeRules';
import { reduceActivityAction } from './systems/activityReducer';
import { permitsActivityAction } from './systems/activityLifecycle';
import { rememberCompletedActivity } from './npcActivityMemory';
import type { DebtInstallmentAction } from './debtInstallmentTypes';
import type { RiskReplayAction } from './riskReplayTypes';
import { reduceDebtInstallmentAction } from './systems/debtInstallments';
import type { BrokerNegotiationAction, CafeShiftAction, ChartLessonAction, CompanyDossierAction, DeliveryChoice, FactoryShiftAction, GamePhase, GameState, JiugeNegotiationAction, LonggeClueChoice, LonggeConclusion, LonggeOpeningChoice, PhoneFlipAction, PlayerGender, StreamChoice, ZhengBikeRepairAction } from './types';
export type GameAction = import('./marketStallTypes').LaoLiangStallAction | RiskReplayAction | DebtInstallmentAction | CafeShiftAction | ChartLessonAction | { type: 'ADVANCE_TICK' }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'SELECT_CHARACTER'; gender: PlayerGender }
  | { type: 'CHANGE_PHASE'; phase: GamePhase }
  | { type: 'SELECT_STOCK'; stockId: string }
  | { type: 'SET_INPUT_SHARES'; shares: number }
  | { type: 'PLACE_ORDER'; side: 'BUY' | 'SELL'; shares: number; leverage?: number }
  | { type: 'START_DELIVERY_RUN' } | { type: 'ABANDON_DELIVERY_RUN' }
  | { type: 'CHOOSE_DELIVERY_ROUTE'; choice: DeliveryChoice }
  | FactoryShiftAction | ZhengBikeRepairAction | { type: 'RETURN_FROM_ACTIVITY' }
  | { type: 'START_LONGGE_CHAT' }
  | { type: 'CHOOSE_LONGGE_OPENING'; choice: LonggeOpeningChoice }
  | { type: 'CHOOSE_LONGGE_CLUE'; choice: LonggeClueChoice }
  | { type: 'CONCLUDE_LONGGE_CHAT'; conclusion: LonggeConclusion }
  | { type: 'ABANDON_LONGGE_CHAT' }
  | { type: 'START_STREAM_RUN' }
  | { type: 'CHOOSE_STREAM_OPTION'; choice: StreamChoice }
  | { type: 'ABANDON_STREAM_RUN' }
  | CompanyDossierAction | JiugeNegotiationAction | BrokerNegotiationAction | PhoneFlipAction
  | { type: 'BORROW_FROM_NPC' }
  | { type: 'REPAY_DEBT'; amount: number }
  | { type: 'CLEAR_ORDER_FEEDBACK' };
function getEquity(state: GameState): number {
  const portfolioValue = Object.values(state.stocks).reduce(
    (total, stock) => total + (stock.holding?.shares ?? 0) * stock.price,
    0,
  );
  return Number((state.cash + portfolioValue - state.debt).toFixed(2));
}
function seedForStock(state: GameState, stockId: string): number {
  let hash = 2166136261;
  for (const character of stockId) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const stock = state.stocks[stockId];
  const historyLength = stock?.priceHistory.length ?? 0;
  const volume = stock?.volume ?? 0;
  const priceCents = Math.round((stock?.price ?? 0) * 100);
  return (hash ^ Math.imul(state.day, 0x9E3779B1) ^ historyLength ^ volume ^ priceCents) >>> 0;
}
function closeTrading(state: GameState): GameState {
  const settled = settlePeriodicCosts(state);
  const crisisRecovered = state.debtCrisisStarted && settled.debt <= firstChapterMaximumDebt;
  return {
    ...settled,
    phase: 'NIGHT',
    debtCrisisStarted: state.debtCrisisStarted && !crisisRecovered,
    debtCrisisRecoveryDay: crisisRecovered ? state.day : state.debtCrisisRecoveryDay,
  };
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (!permitsActivityAction(state.activeActivity, action)) return state;
  if (action.type === 'RESUME_DEBT_INSTALLMENTS' || action.type === 'CANCEL_DEBT_INSTALLMENTS') return reduceDebtInstallmentAction(state, action);
  const activityResult = reduceActivityAction(state, action);
  if (activityResult) return rememberCompletedActivity(state, activityResult);
  switch (action.type) {
    case 'ADVANCE_TICK': {
      if (state.phase !== 'TRADING' || state.marketTicksThisDay >= marketTicksPerDay) return state;
      const stocks: GameState['stocks'] = {};
      for (const [id, stock] of Object.entries(state.stocks)) {
        stocks[id] = tickStock(stock, mulberry32(seedForStock(state, id)));
      }
      const tickedState = { ...state, stocks, marketTicksThisDay: state.marketTicksThisDay + 1 };
      return tickedState.marketTicksThisDay >= marketTicksPerDay ? closeTrading(tickedState) : tickedState;
    }
    case 'ADVANCE_PHASE': {
      switch (state.phase) {
        case 'PRE_MARKET':
          return { ...state, phase: 'DAYTIME' };
        case 'DAYTIME':
          return { ...state, phase: 'TRADING' };
        case 'TRADING':
          return closeTrading(state);
        case 'NIGHT': {
          const day = state.day + 1;
          const isFirstChapterDeadline = state.day === firstChapterDeadlineDay;
          const missedFirstChapterTarget = isFirstChapterDeadline && state.debt > firstChapterMaximumDebt;
          const metFirstChapterTarget = isFirstChapterDeadline && state.debt <= firstChapterMaximumDebt;
          return {
            ...state,
            day,
            phase: 'PRE_MARKET',
            debtCrisisStarted: missedFirstChapterTarget || (state.debtCrisisStarted && state.debt > firstChapterMaximumDebt && !metFirstChapterTarget),
            marketTicksThisDay: 0,
            inputShares: 100,
            lastOrderFeedback: null,
            npcMessage: '龙哥昨晚又在群里发了一堆消息，你决定先看看再说。',
            energy: state.energyMax,
            workedToday: false,
            dayStartEquity: getEquity(state),
            dailyWorkIncome: 0,
            dailyStreamIncome: 0,
            dailyFees: 0,
            dailyContractFees: 0,
            periodicCostLedger: { interest: 0, rent: 0, membership: 0, equipment: 0, platformShare: 0, deferred: 0, interestGraceApplied: false, rateRestructureApplied: false },
            streamedToday: false,
            activeActivity: null,
            marketIntel: null,
            longgeVisitedToday: false,
            chenVisitedToday: false,
            chartLessonVisitedToday: false,
            riskReplayVisitedToday: false, brokerNegotiationVisitedToday: false,
          };
        }
      }
      return state;
    }
    case 'CHANGE_PHASE':
      if (action.phase !== 'NIGHT') return { ...state, phase: action.phase };
      return closeTrading(state);
    case 'SELECT_CHARACTER': {
      const energyMax = action.gender === 'MALE' ? 120 : 100;
      const fame = action.gender === 'FEMALE' ? 30 : 15;
      return { ...state, gender: action.gender, energy: energyMax, energyMax, fame, phase: 'PRE_MARKET' };
    }
    case 'SELECT_STOCK':
      return state.stocks[action.stockId] ? { ...state, selectedStockId: action.stockId } : state;
    case 'SET_INPUT_SHARES':
      return { ...state, inputShares: action.shares };
    case 'PLACE_ORDER': {
      const { newState, feedback } = tradeEngine.executeOrder(
        state,
        action.side,
        action.shares,
        action.leverage ?? 1,
      );
      return {
        ...newState,
        inputShares: 100,
        lastOrderFeedback: feedback,
        orderSequence: state.orderSequence + 1,
        dailyFees: Number((state.dailyFees + feedback.fee).toFixed(2)),
      };
    }
    case 'RETURN_FROM_ACTIVITY':
      return state.activeActivity?.status === 'RESULT' ? { ...state, activeActivity: null } : state;
    case 'BORROW_FROM_NPC':
      if (state.phase !== 'DAYTIME' || state.leechLevel < 10) return state;
      return {
        ...state,
        cash: Number((state.cash + 1000).toFixed(2)),
        debt: Number((state.debt + 1000).toFixed(2)),
        leechLevel: state.leechLevel - 10,
      };
    case 'REPAY_DEBT': {
      if (state.phase !== 'NIGHT' || !Number.isFinite(action.amount) || action.amount <= 0) return state;
      const amount = Number(action.amount.toFixed(2));
      if (amount <= 0 || amount > state.cash || amount > state.debt) return state;
      const remainingDebt = Number((state.debt - amount).toFixed(2));
      const crisisRecovered = state.debtCrisisStarted && remainingDebt <= firstChapterMaximumDebt;
      return {
        ...state,
        cash: Number((state.cash - amount).toFixed(2)),
        debt: remainingDebt,
        debtCrisisStarted: state.debtCrisisStarted && !crisisRecovered,
        debtCrisisRecoveryDay: crisisRecovered ? state.day : state.debtCrisisRecoveryDay,
        debtInterestGraceWeeksRemaining: amount === state.debt ? 0 : state.debtInterestGraceWeeksRemaining,
        debtRatePlanWeeksRemaining: amount === state.debt ? 0 : state.debtRatePlanWeeksRemaining,
        debtInstallmentPlan: amount === state.debt && state.debtInstallmentPlan ? { ...state.debtInstallmentPlan, status: 'DEBT_CLEARED' } : state.debtInstallmentPlan,
      };
    }
    case 'CLEAR_ORDER_FEEDBACK':
      return state.lastOrderFeedback ? { ...state, lastOrderFeedback: null } : state;
    default:
      return state;
  }
}
