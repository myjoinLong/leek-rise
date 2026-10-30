export type FactoryShiftChoice = 'REWORK' | 'PASS';
export type FactoryShiftStep = 0 | 1 | 2;

export interface FactoryShiftDecision {
  step: FactoryShiftStep;
  choice: FactoryShiftChoice;
  correct: boolean;
  energyCost: number;
}

export interface FactoryShiftActiveState {
  id: 'WANG_FACTORY';
  day: number;
  status: 'ACTIVE';
  step: FactoryShiftStep;
  qualityBonus: number;
  energySpent: number;
  decisions: FactoryShiftDecision[];
}

export interface FactoryShiftResultState extends Omit<FactoryShiftActiveState, 'status' | 'step' | 'decisions'> {
  status: 'RESULT';
  step: 3;
  decisions: [FactoryShiftDecision, FactoryShiftDecision, FactoryShiftDecision];
  income: number;
}

export type FactoryShiftState = FactoryShiftActiveState | FactoryShiftResultState;
export type FactoryShiftAction =
  | { type: 'START_FACTORY_SHIFT' }
  | { type: 'CHOOSE_FACTORY_CHECK'; choice: FactoryShiftChoice }
  | { type: 'ABANDON_FACTORY_SHIFT' };
