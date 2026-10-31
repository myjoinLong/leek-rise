import type {
  CompanyDossierAction,
  CompanyDossierActiveState,
  CompanyDossierCaseType,
  CompanyDossierChoice,
  CompanyDossierConclusion,
  CompanyDossierEvidence,
  CompanyDossierFinding,
  CompanyDossierPriorReview,
  CompanyDossierResultState,
  GameState,
  MarketIntel,
  StockState,
} from '../types';
import { companyDossierScenarioIndex, companyDossierScenarioVersion } from './companyDossierScenarios';

interface EvidenceOption {
  step: 0 | 1 | 2;
  energyCost: number;
}

const evidenceOptions: Record<CompanyDossierChoice, EvidenceOption> = {
  VERIFY_FILING: { step: 0, energyCost: 6 },
  SKIM_PITCH: { step: 0, energyCost: 1 },
  CHECK_SUPPLIER: { step: 1, energyCost: 6 },
  ASK_SALES: { step: 1, energyCost: 1 },
  MATCH_INVOICES: { step: 2, energyCost: 6 },
  READ_FORECAST: { step: 2, energyCost: 1 },
};

const findingBySource: Record<CompanyDossierCaseType, Record<CompanyDossierChoice, CompanyDossierFinding>> = {
  REAL_CONTRACT: {
    VERIFY_FILING: 'CONTRACT',
    SKIM_PITCH: 'UNVERIFIED',
    CHECK_SUPPLIER: 'CONTRACT',
    ASK_SALES: 'UNVERIFIED',
    MATCH_INVOICES: 'CONTRACT',
    READ_FORECAST: 'UNVERIFIED',
  },
  INFLATED_ORDER: {
    VERIFY_FILING: 'HYPE',
    SKIM_PITCH: 'UNVERIFIED',
    CHECK_SUPPLIER: 'CONTRACT',
    ASK_SALES: 'UNVERIFIED',
    MATCH_INVOICES: 'HYPE',
    READ_FORECAST: 'UNVERIFIED',
  },
  NO_CATALYST: {
    VERIFY_FILING: 'NO_CATALYST',
    SKIM_PITCH: 'UNVERIFIED',
    CHECK_SUPPLIER: 'NO_CATALYST',
    ASK_SALES: 'UNVERIFIED',
    MATCH_INVOICES: 'NO_CATALYST',
    READ_FORECAST: 'UNVERIFIED',
  },
};

export const minimumDossierEnergy = 3;

export function createCompanyDossier(
  day: number,
  stock: StockState,
  scenarioSeed = 4,
  priorReview?: CompanyDossierPriorReview,
): CompanyDossierActiveState {
  const caseType = stock.scriptPhase === 'PUMP'
    ? 'REAL_CONTRACT'
    : stock.scriptPhase === 'ACCUMULATE' ? 'NO_CATALYST' : 'INFLATED_ORDER';
  return {
    id: 'CHEN_DOSSIER',
    day,
    stockId: stock.id,
    caseType,
    scenarioVersion: companyDossierScenarioVersion,
    scenarioSeed,
    scenarioIndex: companyDossierScenarioIndex(day, scenarioSeed),
    ...(priorReview ? { priorReview } : {}),
    status: 'ACTIVE',
    step: 0,
    evidence: [],
  };
}

function priorReviewFor(state: GameState): CompanyDossierPriorReview | undefined {
  const trace = state.npcActivityMemory.chen.lastTrace;
  if (trace?.activityId !== 'CHEN_DOSSIER' || trace.day === undefined
    || !Number.isInteger(trace.day) || trace.day < 1 || trace.day >= state.day) return undefined;
  if (trace.outcomeCode !== 'BUY' && trace.outcomeCode !== 'AVOID' && trace.outcomeCode !== 'WAIT') return undefined;
  return { previousDay: trace.day, conclusion: trace.outcomeCode };
}

function getFindingsSummary(evidence: CompanyDossierEvidence[]): string {
  const contractCount = evidence.filter((item) => item.finding === 'CONTRACT').length;
  const hypeCount = evidence.filter((item) => item.finding === 'HYPE').length;
  const noCatalystCount = evidence.filter((item) => item.finding === 'NO_CATALYST').length;

  if (contractCount > 0 && hypeCount > 0) {
    return `材料存在冲突：${contractCount} 项支持部分交付，${hypeCount} 项与订单宣传不符。`;
  }
  if (contractCount >= 2) return `${contractCount} 项材料支持合同、交付与回款方向基本相符。`;
  if (hypeCount >= 2) return `${hypeCount} 项材料与订单宣传不符，订单口径存在夸大风险。`;
  if (noCatalystCount >= 2) return '多项原始记录均未发现能推动当前交易的新订单。';
  if (contractCount === 1) return '目前只有一项材料支持合同落地，证据不足以单独支撑重仓。';
  if (hypeCount === 1) return '目前只有一项材料指出订单宣传存在问题，仍需继续核验。';
  if (noCatalystCount === 1) return '目前只有一项原始记录未发现新增订单，仍需继续核验。';
  return '目前只有宣传、口头说明或预测材料，缺少可独立核验的原始记录。';
}

function createResult(
  run: CompanyDossierActiveState,
  conclusion: CompanyDossierConclusion,
): CompanyDossierResultState | null {
  const [first, second, third] = run.evidence;
  if (run.step !== 3 || !first || !second || !third) return null;

  const evidence: [CompanyDossierEvidence, CompanyDossierEvidence, CompanyDossierEvidence] = [first, second, third];
  const reliableCount = evidence.filter((item) => item.finding !== 'UNVERIFIED').length;
  const contractCount = evidence.filter((item) => item.finding === 'CONTRACT').length;
  const hypeCount = evidence.filter((item) => item.finding === 'HYPE').length;
  const noCatalystCount = evidence.filter((item) => item.finding === 'NO_CATALYST').length;
  const hasConflict = contractCount > 0 && hypeCount > 0;
  const consistentFindingCount = Math.max(contractCount, hypeCount, noCatalystCount);
  const confidence: MarketIntel['confidence'] = reliableCount === 0
    ? 'UNCERTAIN'
    : reliableCount >= 2 && consistentFindingCount >= 2 && !hasConflict ? 'HIGH' : 'LOW';
  const expectedConclusion: CompanyDossierConclusion = reliableCount < 2
    ? 'WAIT'
    : contractCount >= 2 && contractCount > hypeCount
      ? 'BUY'
      : hypeCount >= 2 && hypeCount > contractCount ? 'AVOID' : 'WAIT';
  const bias: MarketIntel['bias'] = contractCount >= 2 && contractCount > hypeCount
    ? 'OPPORTUNITY'
    : hypeCount >= 2 && hypeCount > contractCount ? 'CAUTION' : 'UNCERTAIN';
  const finding = getFindingsSummary(evidence);
  const guidance = confidence === 'HIGH'
    ? '仍需控制仓位并留意后续公告。'
    : '证据不足以单独支撑重仓。';
  const message = finding + guidance;
  const intel: MarketIntel = {
    day: run.day,
    stockId: run.stockId,
    npcName: '陈总',
    confidence,
    bias,
    message: conclusion === 'WAIT' ? '你选择暂缓入场。' + message : message,
  };

  return {
    ...run,
    status: 'RESULT',
    step: 3,
    evidence,
    conclusion,
    correct: conclusion === 'WAIT' || conclusion === expectedConclusion,
    reliableCount,
    intel,
  };
}

export function reduceCompanyDossier(
  state: GameState,
  action: CompanyDossierAction,
): GameState {
  switch (action.type) {
    case 'START_CHEN_DOSSIER': {
      const stock = state.stocks[state.selectedStockId];
      if (state.phase !== 'DAYTIME' || state.activeActivity || state.chenVisitedToday || state.energy < minimumDossierEnergy || !stock) return state;
      return {
        ...state,
        activeActivity: createCompanyDossier(state.day, stock, state.scenarioSeed, priorReviewFor(state)),
        chenVisitedToday: true,
      };
    }
    case 'CHOOSE_CHEN_EVIDENCE': {
      const run = state.activeActivity;
      if (state.phase !== 'DAYTIME' || !run || run.id !== 'CHEN_DOSSIER' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
      const option = evidenceOptions[action.choice];
      if (option.step !== run.step || state.energy < option.energyCost) return state;
      const evidence: CompanyDossierEvidence = {
        step: option.step,
        choice: action.choice,
        finding: findingBySource[run.caseType][action.choice],
      };
      return {
        ...state,
        energy: state.energy - option.energyCost,
        activeActivity: { ...run, step: (run.step + 1) as CompanyDossierActiveState['step'], evidence: [...run.evidence, evidence] },
      };
    }
    case 'CONCLUDE_CHEN_DOSSIER': {
      const run = state.activeActivity;
      if (state.phase !== 'DAYTIME' || !run || run.id !== 'CHEN_DOSSIER' || run.status !== 'ACTIVE' || run.day !== state.day) return state;
      const result = createResult(run, action.conclusion);
      return result ? { ...state, activeActivity: result, marketIntel: result.intel } : state;
    }
    case 'ABANDON_CHEN_DOSSIER':
      return state.activeActivity?.id === 'CHEN_DOSSIER' && state.activeActivity.status === 'ACTIVE'
        ? { ...state, activeActivity: null }
        : state;
  }
}
