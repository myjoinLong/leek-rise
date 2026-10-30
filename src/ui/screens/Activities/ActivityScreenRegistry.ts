import type { GameAction } from '../../../core/reducer';
import type { ActivityId } from '../../../core/activityContracts';
import type { GameState } from '../../../core/types';
import { createDeliveryRunScreen } from './DeliveryRunScreen';
import { createChenDossierScreen } from './ChenDossierScreen';
import { createLonggeChatScreen } from './LonggeChatScreen';
import { createStreamRunScreen } from './StreamRunScreen';
import { createJiugeNegotiationScreen } from './JiugeNegotiationScreen';
import { createFactoryShiftScreen } from './FactoryShiftScreen';
import { createChartLessonScreen } from './ChartLessonScreen';
import { createCafeShiftScreen } from './CafeShiftScreen';
import { RiskReplayScreen } from './RiskReplayScreen';
import { createLaoLiangMarketStallScreen } from './LaoLiangMarketStallScreen';
import { createZhouBrokerNegotiationScreen } from './ZhouBrokerNegotiationScreen';
import { createZhengBikeRepairScreen } from './ZhengBikeRepairScreen';

type ActivityScreenFactory = (
  state: GameState,
  dispatch: (action: GameAction) => GameState,
) => HTMLElement;

export const activityScreens: Record<ActivityId, ActivityScreenFactory> = {
  LONGGE_CHAT: createLonggeChatScreen,
  WANG_DELIVERY: createDeliveryRunScreen,
  XIAOLIAN_STREAM: createStreamRunScreen,
  CHEN_DOSSIER: createChenDossierScreen,
  JIUGE_NEGOTIATION: createJiugeNegotiationScreen,
  WANG_FACTORY: createFactoryShiftScreen,
  BODHISATTVA_CHART_LESSON: createChartLessonScreen,
  SUJIE_CAFE_SHIFT: createCafeShiftScreen,
  SWEEPER_RISK_REPLAY: (state, dispatch) => new RiskReplayScreen(state, dispatch).el,
  LAOLIANG_MARKET_STALL: createLaoLiangMarketStallScreen,
  ZHOU_BROKER_NEGOTIATION: createZhouBrokerNegotiationScreen,
  ZHENG_BIKE_REPAIR: createZhengBikeRepairScreen,
};

export function createActivityScreen(
  state: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement | null {
  const activity = state.activeActivity;
  if (!activity) return null;
  return activityScreens[activity.id](state, dispatch);
}
