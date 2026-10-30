import type { GameAction } from './reducer';
import type { ActiveActivityState } from './types';

export type ActivityPurpose = 'income' | 'information' | 'practice' | 'finance';
type ActivityExitAction = Extract<GameAction, { type: `ABANDON_${string}` }>;

export interface ActivityContract {
  purpose: ActivityPurpose;
  startAction: GameAction;
  exitAction: ActivityExitAction;
  allowedActions: readonly GameAction['type'][];
}

export const activityContracts = {
  WANG_DELIVERY: {
    purpose: 'income',
    startAction: { type: 'START_DELIVERY_RUN' },
    exitAction: { type: 'ABANDON_DELIVERY_RUN' },
    allowedActions: ['CHOOSE_DELIVERY_ROUTE', 'ABANDON_DELIVERY_RUN'],
  },
  LONGGE_CHAT: {
    purpose: 'information',
    startAction: { type: 'START_LONGGE_CHAT' },
    exitAction: { type: 'ABANDON_LONGGE_CHAT' },
    allowedActions: ['CHOOSE_LONGGE_CLUE', 'CONCLUDE_LONGGE_CHAT', 'ABANDON_LONGGE_CHAT'],
  },
  XIAOLIAN_STREAM: {
    purpose: 'income',
    startAction: { type: 'START_STREAM_RUN' },
    exitAction: { type: 'ABANDON_STREAM_RUN' },
    allowedActions: ['CHOOSE_STREAM_OPTION', 'ABANDON_STREAM_RUN'],
  },
  CHEN_DOSSIER: {
    purpose: 'information',
    startAction: { type: 'START_CHEN_DOSSIER' },
    exitAction: { type: 'ABANDON_CHEN_DOSSIER' },
    allowedActions: ['CHOOSE_CHEN_EVIDENCE', 'CONCLUDE_CHEN_DOSSIER', 'ABANDON_CHEN_DOSSIER'],
  },
  JIUGE_NEGOTIATION: {
    purpose: 'finance',
    startAction: { type: 'START_JIUGE_NEGOTIATION' },
    exitAction: { type: 'ABANDON_JIUGE_NEGOTIATION' },
    allowedActions: ['CHOOSE_JIUGE_NEGOTIATION', 'ABANDON_JIUGE_NEGOTIATION'],
  },
  WANG_FACTORY: {
    purpose: 'income',
    startAction: { type: 'START_FACTORY_SHIFT' },
    exitAction: { type: 'ABANDON_FACTORY_SHIFT' },
    allowedActions: ['CHOOSE_FACTORY_CHECK', 'ABANDON_FACTORY_SHIFT'],
  },
  BODHISATTVA_CHART_LESSON: {
    purpose: 'practice',
    startAction: { type: 'START_CHART_LESSON' },
    exitAction: { type: 'ABANDON_CHART_LESSON' },
    allowedActions: ['ANSWER_CHART_LESSON', 'ABANDON_CHART_LESSON'],
  },
  SUJIE_CAFE_SHIFT: {
    purpose: 'income',
    startAction: { type: 'START_CAFE_SHIFT' },
    exitAction: { type: 'ABANDON_CAFE_SHIFT' },
    allowedActions: ['SERVE_CAFE_ORDER', 'ABANDON_CAFE_SHIFT'],
  },
  SWEEPER_RISK_REPLAY: {
    purpose: 'practice',
    startAction: { type: 'START_RISK_REPLAY' },
    exitAction: { type: 'ABANDON_RISK_REPLAY' },
    allowedActions: ['COMMIT_RISK_ALLOCATION', 'ABANDON_RISK_REPLAY'],
  },
  LAOLIANG_MARKET_STALL: {
    purpose: 'income',
    startAction: { type: 'START_LAOLIANG_STALL' },
    exitAction: { type: 'ABANDON_LAOLIANG_STALL' },
    allowedActions: ['SELECT_STALL_PRODUCT', 'SELL_STALL_GOODS', 'ABANDON_LAOLIANG_STALL'],
  },
  ZHOU_BROKER_NEGOTIATION: {
    purpose: 'finance',
    startAction: { type: 'START_BROKER_NEGOTIATION' },
    exitAction: { type: 'ABANDON_BROKER_NEGOTIATION' },
    allowedActions: ['ESTIMATE_BROKER_TURNOVER', 'CHOOSE_BROKER_PLAN', 'ABANDON_BROKER_NEGOTIATION'],
  },
  ZHENG_BIKE_REPAIR: {
    purpose: 'income',
    startAction: { type: 'START_ZHENG_BIKE_REPAIR' },
    exitAction: { type: 'ABANDON_ZHENG_BIKE_REPAIR' },
    allowedActions: ['TEST_BIKE_PART', 'REPAIR_BIKE_FAULT', 'ABANDON_ZHENG_BIKE_REPAIR'],
  },
} satisfies Record<ActiveActivityState['id'], ActivityContract>;

export type ActivityId = keyof typeof activityContracts;
