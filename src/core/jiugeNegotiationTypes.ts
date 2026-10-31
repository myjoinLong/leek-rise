export type JiugeNegotiationChoice =
  | 'SHOW_LEDGER'
  | 'BLUFF_CASHFLOW'
  | 'PROVE_INCOME'
  | 'PROMISE_FULL'
  | 'ASK_INTEREST_GRACE'
  | 'SIGN_RATE_RESTRUCTURE'
  | 'SIGN_INSTALLMENTS'
  | 'SIGN_STANDARD';

export type JiugeNegotiationStep = 0 | 1 | 2;

export interface JiugeNegotiationDecision {
  step: JiugeNegotiationStep;
  choice: JiugeNegotiationChoice;
}

export interface JiugeNegotiationActiveState {
  id: 'JIUGE_NEGOTIATION';
  day: number;
  status: 'ACTIVE';
  step: JiugeNegotiationStep;
  decisions: JiugeNegotiationDecision[];
  askedAboutHistory?: boolean;
  scenarioVersion?: 2;
  scenarioSeed?: number;
  scenarioIndex?: number;
}

export interface JiugeNegotiationResultState extends Omit<JiugeNegotiationActiveState, 'status' | 'step'> {
  status: 'RESULT';
  step: 3;
  outcome: 'INTEREST_GRACE' | 'RATE_RESTRUCTURE' | 'INSTALLMENTS' | 'STANDARD_TERMS';
}

export type JiugeNegotiationState = JiugeNegotiationActiveState | JiugeNegotiationResultState;

export type JiugeNegotiationAction =
  | { type: 'START_JIUGE_NEGOTIATION' }
  | { type: 'ASK_JIUGE_HISTORY' }
  | { type: 'CHOOSE_JIUGE_NEGOTIATION'; choice: JiugeNegotiationChoice }
  | { type: 'ABANDON_JIUGE_NEGOTIATION' };
