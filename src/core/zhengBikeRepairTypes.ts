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
  verified?: boolean;
}

export interface BikeRepairReturnContext {
  previousDay: number;
  customerName: string;
  issueTitle: string;
  faultPart: BikeRepairPart;
  kind: 'MISSED_REPAIR' | 'MISSING_PROOF';
}

export interface ZhengBikeRepairActiveState {
  id: 'ZHENG_BIKE_REPAIR';
  day: number;
  status: 'ACTIVE';
  scenarioVersion?: 1 | 2 | 3 | 4 | 5;
  scenarioSeed?: number;
  returnContext?: BikeRepairReturnContext | null;
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
