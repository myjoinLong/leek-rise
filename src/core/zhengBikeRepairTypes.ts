export type BikeRepairPart = 'BATTERY' | 'BRAKES' | 'CONTROLLER';
export type BikeRepairStep = 0 | 1 | 2;

export interface BikeRepairTest {
  step: BikeRepairStep;
  part: BikeRepairPart;
  foundFault: boolean;
}

export interface BikeRepairDecision {
  step: BikeRepairStep;
  repairedPart: BikeRepairPart;
  correct: boolean;
  qualityBonus: number;
}

export interface ZhengBikeRepairActiveState {
  id: 'ZHENG_BIKE_REPAIR';
  day: number;
  status: 'ACTIVE';
  step: BikeRepairStep;
  energySpent: number;
  income: number;
  qualityBonus: number;
  tests: BikeRepairTest[];
  decisions: BikeRepairDecision[];
}

export interface ZhengBikeRepairResultState extends Omit<ZhengBikeRepairActiveState, 'status' | 'step' | 'decisions'> {
  status: 'RESULT';
  step: 3;
  decisions: [BikeRepairDecision, BikeRepairDecision, BikeRepairDecision];
}

export type ZhengBikeRepairState = ZhengBikeRepairActiveState | ZhengBikeRepairResultState;

export type ZhengBikeRepairAction =
  | { type: 'START_ZHENG_BIKE_REPAIR' }
  | { type: 'TEST_BIKE_PART'; part: BikeRepairPart }
  | { type: 'REPAIR_BIKE_FAULT'; part: BikeRepairPart }
  | { type: 'ABANDON_ZHENG_BIKE_REPAIR' };
