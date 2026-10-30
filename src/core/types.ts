import type { FactoryShiftState } from './factoryShiftTypes';
import type { ChartLessonState } from './chartLessonTypes';
import type { CafeShiftState } from './cafeShiftTypes';
import type { DebtInstallmentPlan } from './debtInstallmentTypes';
import type { RiskReplayState } from './riskReplayTypes';
import type { LaoLiangStallState } from './marketStallTypes';
import type { BrokerNegotiationState, BrokerageContract } from './brokerNegotiationTypes';
import type { ZhengBikeRepairState } from './zhengBikeRepairTypes';
export type { BrokerNegotiationAction, BrokerNegotiationState, BrokerPlan, BrokerTurnover, BrokerageContract } from './brokerNegotiationTypes';
export type { FactoryShiftAction, FactoryShiftChoice, FactoryShiftDecision, FactoryShiftState } from './factoryShiftTypes';
export type { ChartLessonAction, ChartLessonChoice, ChartLessonDecision, ChartLessonState, ChartLessonStep } from './chartLessonTypes';
export type { CafeShiftAction, CafeShiftChoice, CafeShiftDecision, CafeShiftState } from './cafeShiftTypes';
export type { BikeRepairDecision, BikeRepairPart, BikeRepairStep, BikeRepairTest, ZhengBikeRepairAction, ZhengBikeRepairActiveState, ZhengBikeRepairResultState, ZhengBikeRepairState } from './zhengBikeRepairTypes';
export type GamePhase = 'PRE_MARKET' | 'DAYTIME' | 'TRADING' | 'NIGHT';
export type ScriptPhase = 'ACCUMULATE' | 'PUMP' | 'DISTRIBUTE' | 'DUMP';
export type OrderSide = 'BUY' | 'SELL';
export type PlayerGender = 'MALE' | 'FEMALE';
export type DeliveryChoice = 'ALLEY' | 'MAIN' | 'RUSH' | 'STEADY';
export type LonggeClueChoice = 'VERIFY_ORIGIN' | 'FOLLOW_REPOST' | 'READ_TAPE' | 'WATCH_PRICE' | 'CHECK_NOTICE' | 'ASK_GROUP';
export type LonggeConclusion = 'DISTRIBUTION' | 'REAL_CATALYST' | 'INSUFFICIENT';
export type LonggeCaseType = 'ACCUMULATION' | 'CATALYST' | 'DISTRIBUTION';
export type StreamChoice = 'HONEST_REVIEW' | 'HYPE_CLAIM' | 'ANSWER_QUESTIONS' | 'REPEAT_CTA' | 'TRANSPARENT_DEAL' | 'FAKE_SCARCITY';
export type StreamStep = 0 | 1 | 2;
export type CompanyDossierChoice = 'VERIFY_FILING' | 'SKIM_PITCH' | 'CHECK_SUPPLIER' | 'ASK_SALES' | 'MATCH_INVOICES' | 'READ_FORECAST';
export type CompanyDossierConclusion = 'BUY' | 'AVOID' | 'WAIT';
export type CompanyDossierCaseType = 'REAL_CONTRACT' | 'INFLATED_ORDER' | 'NO_CATALYST';
export type CompanyDossierFinding = 'CONTRACT' | 'HYPE' | 'NO_CATALYST' | 'UNVERIFIED';
export type JiugeNegotiationChoice = 'SHOW_LEDGER' | 'BLUFF_CASHFLOW' | 'PROVE_INCOME' | 'PROMISE_FULL' | 'ASK_INTEREST_GRACE' | 'SIGN_RATE_RESTRUCTURE' | 'SIGN_INSTALLMENTS' | 'SIGN_STANDARD';
export type JiugeNegotiationStep = 0 | 1 | 2;
export type CompanyDossierAction =
  | { type: 'START_CHEN_DOSSIER' }
  | { type: 'CHOOSE_CHEN_EVIDENCE'; choice: CompanyDossierChoice }
  | { type: 'CONCLUDE_CHEN_DOSSIER'; conclusion: CompanyDossierConclusion }
  | { type: 'ABANDON_CHEN_DOSSIER' };
export interface MarketIntel {
  day: number;
  stockId: string;
  confidence: 'HIGH' | 'LOW' | 'UNCERTAIN';
  bias: 'CAUTION' | 'OPPORTUNITY' | 'UNCERTAIN';
  message: string;
  npcName?: string;
}
export interface DeliveryDecision {
  stopIndex: number;
  choice: DeliveryChoice;
  income: number;
  energyCost: number;
  outcome: string;
}
export interface DeliveryRunState {
  id: 'WANG_DELIVERY';
  day: number;
  status: 'ACTIVE' | 'RESULT';
  stopIndex: number;
  totalIncome: number;
  energySpent: number;
  decisions: DeliveryDecision[];
}
export interface LonggeChatActiveState {
  id: 'LONGGE_CHAT';
  day: number;
  caseType: LonggeCaseType;
  status: 'ACTIVE';
  step: 0 | 1 | 2 | 3;
  clues: LonggeClueChoice[];
}
export interface LonggeChatResultState {
  id: 'LONGGE_CHAT';
  day: number;
  caseType: LonggeCaseType;
  status: 'RESULT';
  clues: LonggeClueChoice[];
  conclusion: LonggeConclusion;
  correct: boolean;
  intel: MarketIntel;
}
export type LonggeChatState = LonggeChatActiveState | LonggeChatResultState;
export interface StreamDecision {
  step: StreamStep;
  choice: StreamChoice;
  audienceDelta: number;
  trustDelta: number;
  salesPoints: number;
}
export interface StreamRunActiveState {
  id: 'XIAOLIAN_STREAM';
  day: number;
  status: 'ACTIVE';
  step: StreamStep;
  audience: number;
  trust: number;
  salesPoints: number;
  energySpent: number;
  decisions: StreamDecision[];
}
export interface StreamRunResultState {
  id: 'XIAOLIAN_STREAM';
  day: number;
  status: 'RESULT';
  step: 3;
  audience: number;
  trust: number;
  salesPoints: number;
  energySpent: number;
  decisions: StreamDecision[];
  income: number;
  fameDelta: number;
}
export type StreamRunState = StreamRunActiveState | StreamRunResultState;
export interface CompanyDossierEvidence {
  step: 0 | 1 | 2;
  choice: CompanyDossierChoice;
  finding: CompanyDossierFinding;
}
export interface CompanyDossierActiveState {
  id: 'CHEN_DOSSIER';
  day: number;
  stockId: string;
  caseType: CompanyDossierCaseType;
  status: 'ACTIVE';
  step: 0 | 1 | 2 | 3;
  evidence: CompanyDossierEvidence[];
}
export interface CompanyDossierResultState extends Omit<CompanyDossierActiveState, 'status' | 'step'> {
  status: 'RESULT';
  step: 3;
  evidence: [CompanyDossierEvidence, CompanyDossierEvidence, CompanyDossierEvidence];
  conclusion: CompanyDossierConclusion;
  correct: boolean;
  reliableCount: number;
  intel: MarketIntel;
}
export type CompanyDossierState = CompanyDossierActiveState | CompanyDossierResultState;
export interface JiugeNegotiationDecision { step: JiugeNegotiationStep; choice: JiugeNegotiationChoice; }
export interface JiugeNegotiationActiveState {
  id: 'JIUGE_NEGOTIATION'; day: number; status: 'ACTIVE'; step: JiugeNegotiationStep; decisions: JiugeNegotiationDecision[];
}
export interface JiugeNegotiationResultState extends Omit<JiugeNegotiationActiveState, 'status' | 'step'> {
  status: 'RESULT'; step: 3; outcome: 'INTEREST_GRACE' | 'RATE_RESTRUCTURE' | 'INSTALLMENTS' | 'STANDARD_TERMS';
}
export type JiugeNegotiationState = JiugeNegotiationActiveState | JiugeNegotiationResultState;
export type JiugeNegotiationAction =
  | { type: 'START_JIUGE_NEGOTIATION' }
  | { type: 'CHOOSE_JIUGE_NEGOTIATION'; choice: JiugeNegotiationChoice }
  | { type: 'ABANDON_JIUGE_NEGOTIATION' };
export type ActiveActivityState = DeliveryRunState | LonggeChatState | StreamRunState | CompanyDossierState | JiugeNegotiationState | FactoryShiftState | ChartLessonState | CafeShiftState | RiskReplayState | LaoLiangStallState | BrokerNegotiationState | ZhengBikeRepairState;
export interface PeriodicCostLedger {
  interest: number;
  rent: number;
  membership: number;
  equipment: number;
  platformShare: number;
  deferred: number;
  interestGraceApplied: boolean;
  rateRestructureApplied: boolean;
}
export interface GameState {
  day: number;
  phase: GamePhase;
  cash: number;
  debt: number;
  stocks: Record<string, StockState>;
  selectedStockId: string;
  inputShares: number;
  lastOrderFeedback: OrderFeedback | null;
  orderSequence: number;
  npcMessage: string;
  energy: number;
  workedToday: boolean;
  dayStartEquity: number;
  dailyWorkIncome: number;
  dailyStreamIncome: number;
  dailyFees: number;
  dailyContractFees: number;
  weeklyStreamIncome: number;
  periodicCostLedger: PeriodicCostLedger;
  lastPeriodicSettlementDay: number;
  debtCrisisStarted: boolean;
  debtNegotiationCompleted: boolean;
  debtInterestGraceWeeksRemaining: number;
  debtRatePlanWeeksRemaining: number;
  debtInstallmentPlan: DebtInstallmentPlan | null;
  fame: number;
  streamedToday: boolean;
  gender: PlayerGender | null;
  energyMax: number;
  leechLevel: number;
  activeActivity: ActiveActivityState | null;
  marketIntel: MarketIntel | null;
  longgeVisitedToday: boolean;
  chenVisitedToday: boolean;
  chartLessonVisitedToday: boolean;
  riskReplayVisitedToday: boolean;
  brokerContract: BrokerageContract | null;
  brokerNegotiationVisitedToday: boolean;
}
export interface OrderFeedback {
  id: string;
  stockName: string;
  side: OrderSide;
  requestedShares: number;
  filledShares: number;
  requestedPrice: number;
  filledPrice: number;
  slippagePct: number;
  fee: number;
  latencyMs: number;
  result: 'FILLED' | 'PARTIAL' | 'REJECTED';
  rejectReason?: string;
  cashAfter: number;
}
export interface TradeRecord {
  id: string;
  price: number;
  shares: number;
  side: OrderSide;
  isPlayer: boolean;
}
export interface OrderBookLevel {
  price: number;
  volume: number;
}
export interface StockState {
  id: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  priceHistory: number[];
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  recentTrades: TradeRecord[];
  scriptPhase: ScriptPhase;
  phaseProgress: number;
  holding?: { shares: number; avgCost: number };
}
