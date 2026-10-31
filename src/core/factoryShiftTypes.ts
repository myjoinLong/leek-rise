export type FactoryShiftChoice = 'REWORK' | 'PASS' | 'HOLD';
export type FactoryShiftStep = 0 | 1 | 2;
export type FactoryShiftScenarioVersion = 1 | 2 | 3 | 4 | 5;

export interface FactoryReturnContext {
  previousDay: number;
  step: FactoryShiftStep;
  caseTitle: string;
  choice: FactoryShiftChoice;
  correctChoice: FactoryShiftChoice;
  qualityBonusMissed: 20;
}

export function factoryIsolationAvailable(day: number, scenarioVersion?: FactoryShiftScenarioVersion): boolean {
  return day > 30 && (scenarioVersion === 3 || scenarioVersion === 4 || scenarioVersion === 5);
}

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
  scenarioVersion?: FactoryShiftScenarioVersion;
  scenarioSeed?: number;
  priorReview?: FactoryReturnContext;
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
