import type { MarketIntel } from './types';

export type ChartLessonStep = 0 | 1 | 2;
export type ChartLessonChoice =
  | 'RIDE_HIGHER_LOWS' | 'CHASE_LAST_SPIKE' | 'SELL_FIRST_PULLBACK'
  | 'WAIT_FOR_VOLUME' | 'BUY_ANY_BREAKOUT' | 'IGNORE_VOLUME'
  | 'WAIT_FOR_RANGE_BREAK' | 'ASSUME_REVERSAL' | 'DOUBLE_POSITION';
export type ChartLessonSignal = 'HIGHER_LOWS' | 'WEAK_BREAKOUT' | 'NARROW_RANGE';

export interface ChartLessonDecision {
  step: ChartLessonStep;
  choice: ChartLessonChoice;
  correct: boolean;
}

export interface ChartLessonActiveState {
  id: 'BODHISATTVA_CHART_LESSON';
  day: number;
  stockId: string;
  status: 'ACTIVE';
  step: ChartLessonStep;
  decisions: ChartLessonDecision[];
  energySpent: number;
}

export interface ChartLessonResultState extends Omit<ChartLessonActiveState, 'status' | 'step' | 'decisions'> {
  status: 'RESULT';
  step: 3;
  decisions: [ChartLessonDecision, ChartLessonDecision, ChartLessonDecision];
  score: number;
  intel: MarketIntel | null;
}

export type ChartLessonState = ChartLessonActiveState | ChartLessonResultState;

export type ChartLessonAction =
  | { type: 'START_CHART_LESSON' }
  | { type: 'ANSWER_CHART_LESSON'; choice: ChartLessonChoice }
  | { type: 'ABANDON_CHART_LESSON' };
