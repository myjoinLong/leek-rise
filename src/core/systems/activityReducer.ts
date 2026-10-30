import { reduceCompanyDossier } from './companyDossier';
import { reduceFactoryShift } from './factoryShift';
import { reduceJiugeNegotiation } from './jiugeNegotiation';
import { reduceChartLessonAction } from './chartLesson';
import { reduceCafeShiftAction } from './cafeShift';
import { reduceRiskReplay } from './riskReplay';
import { reduceLaoLiangStall } from './laoLiangMarketStall';
import { reduceBrokerNegotiation } from './brokerNegotiation';
import { reduceZhengBikeRepair } from './zhengBikeRepair';
import { abandonDeliveryRun } from './deliveryRun';
import type { GameAction } from '../reducer';
import type { GameState } from '../types';

export function reduceActivityAction(state: GameState, action: GameAction): GameState | null {
  if (action.type === 'START_ZHENG_BIKE_REPAIR' || action.type === 'TEST_BIKE_PART'
    || action.type === 'REPAIR_BIKE_FAULT' || action.type === 'ABANDON_ZHENG_BIKE_REPAIR') {
    return reduceZhengBikeRepair(state, action);
  }
  if (action.type === 'START_LAOLIANG_STALL' || action.type === 'SELECT_STALL_PRODUCT'
    || action.type === 'SELL_STALL_GOODS' || action.type === 'ABANDON_LAOLIANG_STALL') {
    return reduceLaoLiangStall(state, action);
  }
  const chartLessonState = reduceChartLessonAction(state, action);
  if (chartLessonState) return chartLessonState;
  const cafeShiftState = reduceCafeShiftAction(state, action);
  if (cafeShiftState) return cafeShiftState;
  switch (action.type) {
    case 'ABANDON_DELIVERY_RUN':
      return abandonDeliveryRun(state);
    case 'START_RISK_REPLAY':
    case 'COMMIT_RISK_ALLOCATION':
    case 'ABANDON_RISK_REPLAY':
      return reduceRiskReplay(state, action);
    case 'START_CHEN_DOSSIER':
    case 'CHOOSE_CHEN_EVIDENCE':
    case 'CONCLUDE_CHEN_DOSSIER':
    case 'ABANDON_CHEN_DOSSIER':
      return reduceCompanyDossier(state, action);
    case 'START_JIUGE_NEGOTIATION':
    case 'CHOOSE_JIUGE_NEGOTIATION':
    case 'ABANDON_JIUGE_NEGOTIATION':
      return reduceJiugeNegotiation(state, action);
    case 'START_BROKER_NEGOTIATION':
    case 'ESTIMATE_BROKER_TURNOVER':
    case 'CHOOSE_BROKER_PLAN':
    case 'ABANDON_BROKER_NEGOTIATION':
      return reduceBrokerNegotiation(state, action);
    case 'START_FACTORY_SHIFT':
    case 'CHOOSE_FACTORY_CHECK':
    case 'ABANDON_FACTORY_SHIFT':
      return reduceFactoryShift(state, action);
    default:
      return null;
  }
}
