export type StallProduct = 'THERMOS' | 'RAINCOAT' | 'CABLE';
export type StallPriceTier = 'VALUE' | 'STANDARD' | 'PREMIUM';
export type StallStep = 0 | 1 | 2;
export type StallScenarioVersion = 1 | 2 | 3;
export const stallMaxCustomerUnits = 10;
export const stallReferralMaxCustomerUnits = stallMaxCustomerUnits + 1;

export interface LaoLiangReturnContext {
  previousDay: number;
  product: StallProduct;
}

export interface StallDecision {
  step: StallStep;
  product: StallProduct;
  priceTier: StallPriceTier;
  unitPrice: number;
  unitsSold: number;
  commission: number;
}

interface StallRunBase {
  id: 'LAOLIANG_MARKET_STALL';
  day: number;
  scenarioVersion?: StallScenarioVersion;
  scenarioSeed?: number;
  returnContext?: LaoLiangReturnContext;
  energySpent: number;
  decisions: StallDecision[];
}

export interface StallRunActiveState extends StallRunBase {
  status: 'ACTIVE';
  step: StallStep;
  selectedProduct: StallProduct | null;
}

export interface StallRunResultState extends StallRunBase {
  status: 'RESULT';
  step: 3;
  income: number;
}

export type LaoLiangStallState = StallRunActiveState | StallRunResultState;

export type LaoLiangStallAction =
  | { type: 'START_LAOLIANG_STALL' }
  | { type: 'SELECT_STALL_PRODUCT'; product: StallProduct }
  | { type: 'SELL_STALL_GOODS'; priceTier: StallPriceTier }
  | { type: 'ABANDON_LAOLIANG_STALL' };
