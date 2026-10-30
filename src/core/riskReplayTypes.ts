export type RiskReplayStep = 0 | 1 | 2;

export interface RiskReplayDecision {
  step: RiskReplayStep;
  allocation: number;
  equityBefore: number;
  invested: number;
  stressLoss: number;
  withinBudget: boolean;
  pnl: number;
  fullPositionPnl: number;
}

interface RiskReplayBase {
  id: 'SWEEPER_RISK_REPLAY';
  day: number;
  equity: number;
  energySpent: number;
  decisions: RiskReplayDecision[];
}

export interface RiskReplayActiveState extends RiskReplayBase {
  status: 'ACTIVE';
  step: RiskReplayStep;
}

export interface RiskReplayResultState extends RiskReplayBase {
  status: 'RESULT';
  step: 3;
  respectedBudget: number;
}

export type RiskReplayState = RiskReplayActiveState | RiskReplayResultState;
export type RiskReplayAction =
  | { type: 'START_RISK_REPLAY' }
  | { type: 'COMMIT_RISK_ALLOCATION'; allocation: number }
  | { type: 'ABANDON_RISK_REPLAY' };
