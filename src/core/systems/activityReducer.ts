import { activityContracts, type ActivityId } from '../activityContracts';
import type { GameAction } from '../reducer';
import type { GameState } from '../types';
import { reduceBrokerNegotiation } from './brokerNegotiation';
import { reduceCafeShiftAction } from './cafeShift';
import { reduceCompanyDossier } from './companyDossier';
import { reduceChartLessonAction } from './chartLesson';
import { reduceDeliveryRunAction } from './deliveryRun';
import { reduceFactoryShift } from './factoryShift';
import { reduceJiugeNegotiation } from './jiugeNegotiation';
import { reduceLaoLiangStall } from './laoLiangMarketStall';
import { reduceLonggeChatAction } from './longgeChat';
import { reducePhoneFlip } from './phoneFlip';
import { reduceRiskReplay } from './riskReplay';
import { reduceStreamRunAction } from './streamRun';
import { reduceZhengBikeRepair } from './zhengBikeRepair';

type ActivityReducer = (state: GameState, action: GameAction) => GameState | null;

const activityReducers: Record<ActivityId, ActivityReducer> = {
  WANG_DELIVERY: reduceDeliveryRunAction,
  LONGGE_CHAT: reduceLonggeChatAction,
  XIAOLIAN_STREAM: reduceStreamRunAction,
  CHEN_DOSSIER: (state, action) => {
    if (action.type === 'START_CHEN_DOSSIER' || action.type === 'CHOOSE_CHEN_EVIDENCE'
      || action.type === 'CONCLUDE_CHEN_DOSSIER' || action.type === 'ABANDON_CHEN_DOSSIER') {
      return reduceCompanyDossier(state, action);
    }
    return null;
  },
  JIUGE_NEGOTIATION: (state, action) => {
    if (action.type === 'START_JIUGE_NEGOTIATION' || action.type === 'ASK_JIUGE_HISTORY'
      || action.type === 'CHOOSE_JIUGE_NEGOTIATION' || action.type === 'ABANDON_JIUGE_NEGOTIATION') {
      return reduceJiugeNegotiation(state, action);
    }
    return null;
  },
  WANG_FACTORY: (state, action) => {
    if (action.type === 'START_FACTORY_SHIFT' || action.type === 'CHOOSE_FACTORY_CHECK'
      || action.type === 'ABANDON_FACTORY_SHIFT') {
      return reduceFactoryShift(state, action);
    }
    return null;
  },
  BODHISATTVA_CHART_LESSON: reduceChartLessonAction,
  SUJIE_CAFE_SHIFT: reduceCafeShiftAction,
  SWEEPER_RISK_REPLAY: (state, action) => {
    if (action.type === 'START_RISK_REPLAY' || action.type === 'COMMIT_RISK_ALLOCATION'
      || action.type === 'ABANDON_RISK_REPLAY') {
      return reduceRiskReplay(state, action);
    }
    return null;
  },
  LAOLIANG_MARKET_STALL: (state, action) => {
    if (action.type === 'START_LAOLIANG_STALL' || action.type === 'SELECT_STALL_PRODUCT'
      || action.type === 'SELL_STALL_GOODS' || action.type === 'ABANDON_LAOLIANG_STALL') {
      return reduceLaoLiangStall(state, action);
    }
    return null;
  },
  ZHOU_BROKER_NEGOTIATION: (state, action) => {
    if (action.type === 'START_BROKER_NEGOTIATION' || action.type === 'ESTIMATE_BROKER_TURNOVER'
      || action.type === 'CHOOSE_BROKER_PLAN' || action.type === 'ABANDON_BROKER_NEGOTIATION') {
      return reduceBrokerNegotiation(state, action);
    }
    return null;
  },
  ZHENG_BIKE_REPAIR: (state, action) => {
    if (action.type === 'START_ZHENG_BIKE_REPAIR' || action.type === 'TEST_BIKE_PART'
      || action.type === 'REPAIR_BIKE_FAULT' || action.type === 'ABANDON_ZHENG_BIKE_REPAIR') {
      return reduceZhengBikeRepair(state, action);
    }
    return null;
  },
  PHONE_FLIP: reducePhoneFlip,
};

const activityIds = Object.keys(activityContracts) as ActivityId[];

function activityIdForStartAction(action: GameAction): ActivityId | null {
  return activityIds.find((id) => activityContracts[id].startAction.type === action.type) ?? null;
}

export function reduceActivityAction(state: GameState, action: GameAction): GameState | null {
  const activityId = state.activeActivity?.id ?? activityIdForStartAction(action);
  if (!activityId) return null;

  if (state.activeActivity && !activityContracts[activityId].allowedActions.some((type) => type === action.type)) return null;
  return activityReducers[activityId](state, action);
}
