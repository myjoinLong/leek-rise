export type LonggeClueChoice = 'VERIFY_ORIGIN' | 'FOLLOW_REPOST' | 'READ_TAPE' | 'WATCH_PRICE' | 'CHECK_NOTICE' | 'ASK_GROUP' | 'CHECK_GROUP_REPLY' | 'CHECK_PRIVATE_CHAIN';
export type LonggeConclusion = 'DISTRIBUTION' | 'REAL_CATALYST' | 'INSUFFICIENT';
export type LonggeOpeningChoice = 'POST_CORRECTION' | 'KEEP_PRIVATE';
export type LonggeCaseType = 'ACCUMULATION' | 'CATALYST' | 'DISTRIBUTION';

export interface MarketIntel {
  day: number;
  stockId: string;
  confidence: 'HIGH' | 'LOW' | 'UNCERTAIN';
  bias: 'CAUTION' | 'OPPORTUNITY' | 'UNCERTAIN';
  message: string;
  npcName?: string;
}

export interface LonggeChatActiveState {
  id: 'LONGGE_CHAT';
  day: number;
  caseType: LonggeCaseType;
  scenarioVersion?: 2 | 3;
  scenarioSeed?: number;
  scenarioIndex?: number;
  priorConclusion?: LonggeConclusion;
  priorOpeningChoice?: LonggeOpeningChoice;
  openingChoice?: LonggeOpeningChoice;
  status: 'ACTIVE';
  step: 0 | 1 | 2 | 3;
  clues: LonggeClueChoice[];
}

export interface LonggeChatResultState {
  id: 'LONGGE_CHAT';
  day: number;
  caseType: LonggeCaseType;
  scenarioVersion?: 2 | 3;
  scenarioSeed?: number;
  scenarioIndex?: number;
  priorConclusion?: LonggeConclusion;
  priorOpeningChoice?: LonggeOpeningChoice;
  openingChoice?: LonggeOpeningChoice;
  status: 'RESULT';
  clues: LonggeClueChoice[];
  conclusion: LonggeConclusion;
  correct: boolean;
  intel: MarketIntel;
}

export type LonggeChatState = LonggeChatActiveState | LonggeChatResultState;
