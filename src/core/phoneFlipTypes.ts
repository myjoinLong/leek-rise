export type PhoneFlipChoice = 'PASS' | 'ASK_QUICK' | 'ASK_REFURB' | 'BARGAIN_QUICK' | 'BARGAIN_REFURB';
export type PhoneFlipStep = 0 | 1 | 2;

export interface PhoneInspection {
  condition: string;
  diagnosis: string;
  repairCost: number;
  resaleAsIs: number;
  resaleRefurbished: number;
  quickProfitAtAsk: number;
  refurbProfitAtAsk: number;
  quickProfitAtBargain: number | null;
  refurbProfitAtBargain: number | null;
}

export interface PhoneFlipOfferPreview {
  cashRequired: number;
  affordable: boolean;
  projectedProfit: number | null;
  projectedCashAfterSale: number | null;
}

export interface PhoneFlipReturnContext {
  previousDay: number;
  phoneName: string;
  loss: number;
}

export interface PhoneFlipDecision {
  step: PhoneFlipStep;
  phoneName: string;
  choice: PhoneFlipChoice;
  inspection: PhoneInspection | null;
  offerPrice: number;
  bought: boolean;
  bargainRejected: boolean;
  purchaseCost: number;
  repairCost: number;
  salePrice: number;
  profit: number;
  explanation: string;
}

interface PhoneFlipRunBase {
  id: 'PHONE_FLIP';
  day: number;
  scenarioVersion?: 1 | 2 | 3 | 4 | 5;
  scenarioSeed?: number;
  returnContext?: PhoneFlipReturnContext | null;
  energySpent: number;
  decisions: PhoneFlipDecision[];
  totalProfit: number;
}

export interface PhoneFlipActiveState extends PhoneFlipRunBase {
  status: 'ACTIVE';
  step: PhoneFlipStep;
  inspection: PhoneInspection | null;
}

export interface PhoneFlipResultState extends PhoneFlipRunBase {
  status: 'RESULT';
  step: 3;
  decisions: [PhoneFlipDecision, PhoneFlipDecision, PhoneFlipDecision];
}

export type PhoneFlipState = PhoneFlipActiveState | PhoneFlipResultState;

export type PhoneFlipAction =
  | { type: 'START_PHONE_FLIP' }
  | { type: 'INSPECT_PHONE_LOT' }
  | { type: 'RESOLVE_PHONE_LOT'; choice: PhoneFlipChoice }
  | { type: 'ABANDON_PHONE_FLIP' };
