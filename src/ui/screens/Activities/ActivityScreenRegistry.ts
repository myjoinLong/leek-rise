import type { GameAction } from '../../../core/reducer';
import type { ActivityId } from '../../../core/activityContracts';
import type { GameState } from '../../../core/types';

type ActivityScreenLoader = (
  state: GameState,
  dispatch: (action: GameAction) => GameState,
) => Promise<HTMLElement>;

export const activityScreens: Record<ActivityId, ActivityScreenLoader> = {
  LONGGE_CHAT: async (state, dispatch) => (await import('./LonggeChatScreen')).createLonggeChatScreen(state, dispatch),
  WANG_DELIVERY: async (state, dispatch) => (await import('./DeliveryRunScreen')).createDeliveryRunScreen(state, dispatch),
  XIAOLIAN_STREAM: async (state, dispatch) => (await import('./StreamRunScreen')).createStreamRunScreen(state, dispatch),
  CHEN_DOSSIER: async (state, dispatch) => (await import('./ChenDossierScreen')).createChenDossierScreen(state, dispatch),
  JIUGE_NEGOTIATION: async (state, dispatch) => (await import('./JiugeNegotiationScreen')).createJiugeNegotiationScreen(state, dispatch),
  WANG_FACTORY: async (state, dispatch) => (await import('./FactoryShiftScreen')).createFactoryShiftScreen(state, dispatch),
  BODHISATTVA_CHART_LESSON: async (state, dispatch) => (await import('./ChartLessonScreen')).createChartLessonScreen(state, dispatch),
  SUJIE_CAFE_SHIFT: async (state, dispatch) => (await import('./CafeShiftScreen')).createCafeShiftScreen(state, dispatch),
  SWEEPER_RISK_REPLAY: async (state, dispatch) => {
    const { RiskReplayScreen } = await import('./RiskReplayScreen');
    return new RiskReplayScreen(state, dispatch).el;
  },
  LAOLIANG_MARKET_STALL: async (state, dispatch) => (await import('./LaoLiangMarketStallScreen')).createLaoLiangMarketStallScreen(state, dispatch),
  ZHOU_BROKER_NEGOTIATION: async (state, dispatch) => (await import('./ZhouBrokerNegotiationScreen')).createZhouBrokerNegotiationScreen(state, dispatch),
  ZHENG_BIKE_REPAIR: async (state, dispatch) => (await import('./ZhengBikeRepairScreen')).createZhengBikeRepairScreen(state, dispatch),
  PHONE_FLIP: async (state, dispatch) => (await import('./PhoneFlipScreen')).createPhoneFlipScreen(state, dispatch),
};

export async function createActivityScreen(
  state: GameState,
  dispatch: (action: GameAction) => GameState,
): Promise<HTMLElement | null> {
  const activity = state.activeActivity;
  if (!activity) return null;
  return activityScreens[activity.id](state, dispatch);
}
