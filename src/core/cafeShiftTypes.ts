export type CafeCustomerId = 'RIDER' | 'REGULAR' | 'PARENT';
export type CafeShiftStep = 0 | 1 | 2;
export type CafeShiftChoice =
  | 'BLACK_COFFEE' | 'OAT_LATTE' | 'CAKE'
  | 'SUGAR_FREE_LATTE' | 'CARAMEL_MOCHA' | 'SWEET_TEA'
  | 'WARM_MILK' | 'DOUBLE_ESPRESSO' | 'ICED_TEA';

export interface CafeShiftDecision {
  step: CafeShiftStep;
  customer: CafeCustomerId;
  choice: CafeShiftChoice;
  correct: boolean;
}

export interface CafeShiftActiveState {
  id: 'SUJIE_CAFE_SHIFT';
  day: number;
  status: 'ACTIVE';
  step: CafeShiftStep;
  decisions: CafeShiftDecision[];
  energySpent: number;
  tips: number;
}

export interface CafeShiftResultState extends Omit<CafeShiftActiveState, 'status' | 'step' | 'decisions'> {
  status: 'RESULT';
  step: 3;
  decisions: [CafeShiftDecision, CafeShiftDecision, CafeShiftDecision];
  basePay: number;
  income: number;
}

export type CafeShiftState = CafeShiftActiveState | CafeShiftResultState;

export type CafeShiftAction =
  | { type: 'START_CAFE_SHIFT' }
  | { type: 'SERVE_CAFE_ORDER'; choice: CafeShiftChoice }
  | { type: 'ABANDON_CAFE_SHIFT' };
