import { z } from 'zod';
import { factoryShiftSchema } from './factoryShiftSchema';
import { jiugeNegotiationSchema } from './jiugeNegotiationSchema';
import { cafeShiftSchema } from './cafeShiftSchema';
import { riskReplaySchema } from './riskReplaySchema';
import { laoLiangMarketStallSchema } from './laoLiangMarketStallSchema';
import { brokerNegotiationSchema } from './brokerNegotiationSchema';
import { zhengBikeRepairSchema } from './zhengBikeRepairSchema';

const deliveryChoiceSchema = z.enum(['ALLEY', 'MAIN', 'RUSH', 'STEADY']);
const deliveryDecisionSchema = z.object({
  stopIndex: z.number().int().min(0).max(2), choice: deliveryChoiceSchema,
  income: z.number().finite().nonnegative(), energyCost: z.number().int().positive(), outcome: z.string(),
});
const deliveryReturnContextSchema = z.object({
  previousDay: z.number().int().positive(),
  kind: z.enum(['RELIABLE', 'RUSH']),
});
const deliveryRunSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('WANG_DELIVERY'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(), scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    returnContext: deliveryReturnContextSchema.optional(),
    stopIndex: z.number().int().min(0).max(2), totalIncome: z.number().finite().nonnegative(),
    energySpent: z.number().int().nonnegative(), decisions: z.array(deliveryDecisionSchema).max(2) }),
  z.object({ id: z.literal('WANG_DELIVERY'), day: z.number().int().positive(), status: z.literal('RESULT'),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(), scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    returnContext: deliveryReturnContextSchema.optional(),
    stopIndex: z.literal(3), totalIncome: z.number().finite().nonnegative(),
    energySpent: z.number().int().nonnegative(), decisions: z.array(deliveryDecisionSchema).length(3) }),
]);

export const marketIntelSchema = z.object({
  day: z.number().int().positive(), stockId: z.string(), npcName: z.string().optional(),
  confidence: z.enum(['HIGH', 'LOW', 'UNCERTAIN']), bias: z.enum(['CAUTION', 'OPPORTUNITY', 'UNCERTAIN']), message: z.string(),
});
const longgeClueSchema = z.enum(['VERIFY_ORIGIN', 'FOLLOW_REPOST', 'READ_TAPE', 'WATCH_PRICE', 'CHECK_NOTICE', 'ASK_GROUP', 'CHECK_GROUP_REPLY', 'CHECK_PRIVATE_CHAIN']);
const companyDossierScenarioFields = {
  scenarioVersion: z.literal(2).optional(),
  scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).optional(),
  scenarioIndex: z.number().int().min(0).max(16199).optional(),
};
const longgeScenarioFields = {
  scenarioVersion: z.union([z.literal(2), z.literal(3)]).optional(),
  scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
  scenarioIndex: z.number().int().min(0).max(12959).optional(),
  priorConclusion: z.enum(['DISTRIBUTION', 'REAL_CATALYST', 'INSUFFICIENT']).optional(),
  priorOpeningChoice: z.enum(['POST_CORRECTION', 'KEEP_PRIVATE']).optional(),
  openingChoice: z.enum(['POST_CORRECTION', 'KEEP_PRIVATE']).optional(),
};
function validateLonggeScenarioIndex(
  activity: { scenarioVersion?: 2 | 3; scenarioIndex?: number; priorConclusion?: string },
  context: z.RefinementCtx,
): void {
  if (activity.scenarioVersion === 2 && activity.scenarioIndex !== undefined && activity.scenarioIndex > 29) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['scenarioIndex'], message: 'Legacy Longge scenarios must use an index below 30.' });
  }
}
const longgeChatSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('LONGGE_CHAT'), day: z.number().int().positive(), caseType: z.enum(['ACCUMULATION', 'DISTRIBUTION', 'CATALYST']), ...longgeScenarioFields,
    status: z.literal('ACTIVE'), step: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), clues: z.array(longgeClueSchema).max(3) }).superRefine(validateLonggeScenarioIndex),
  z.object({ id: z.literal('LONGGE_CHAT'), day: z.number().int().positive(), caseType: z.enum(['ACCUMULATION', 'DISTRIBUTION', 'CATALYST']), ...longgeScenarioFields,
    status: z.literal('RESULT'), clues: z.array(longgeClueSchema).length(3),
    conclusion: z.enum(['DISTRIBUTION', 'REAL_CATALYST', 'INSUFFICIENT']), correct: z.boolean(), intel: marketIntelSchema }).superRefine(validateLonggeScenarioIndex),
]);

const streamChoiceSchema = z.enum(['HONEST_REVIEW', 'HYPE_CLAIM', 'ANSWER_QUESTIONS', 'REPEAT_CTA', 'TRANSPARENT_DEAL', 'FAKE_SCARCITY']);
const streamDecisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]), choice: streamChoiceSchema,
  audienceDelta: z.number().int(), trustDelta: z.number().int(), salesPoints: z.number().int().nonnegative(),
});
const streamReturnContextSchema = z.object({
  previousDay: z.number().int().positive(),
  previousProduct: z.string().min(1).max(160),
  kind: z.enum(['OVERCLAIM', 'FAKE_SCARCITY']),
});
const streamRunSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('XIAOLIAN_STREAM'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(), scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    returnContext: streamReturnContextSchema.optional(),
    step: z.union([z.literal(0), z.literal(1), z.literal(2)]), audience: z.number().int().min(0).max(100),
    trust: z.number().int().min(0).max(100), salesPoints: z.number().int().nonnegative(), energySpent: z.number().int().nonnegative(),
    decisions: z.array(streamDecisionSchema).max(2) }),
  z.object({ id: z.literal('XIAOLIAN_STREAM'), day: z.number().int().positive(), status: z.literal('RESULT'), step: z.literal(3),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(), scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    returnContext: streamReturnContextSchema.optional(),
    audience: z.number().int().min(0).max(100), trust: z.number().int().min(0).max(100), salesPoints: z.number().int().nonnegative(),
    energySpent: z.number().int().nonnegative(), decisions: z.array(streamDecisionSchema).length(3),
    income: z.number().finite().nonnegative(), fameDelta: z.number().int().min(-5).max(6) }),
]);

const companyDossierChoiceSchema = z.enum(['VERIFY_FILING', 'SKIM_PITCH', 'CHECK_SUPPLIER', 'ASK_SALES', 'MATCH_INVOICES', 'READ_FORECAST']);
const companyDossierEvidenceSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]), choice: companyDossierChoiceSchema,
  finding: z.enum(['CONTRACT', 'HYPE', 'NO_CATALYST', 'UNVERIFIED']),
});
const companyDossierPriorReviewSchema = z.object({
  previousDay: z.number().int().positive(), conclusion: z.enum(['BUY', 'AVOID', 'WAIT']),
});
const companyDossierSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('CHEN_DOSSIER'), day: z.number().int().positive(), stockId: z.string(),
      caseType: z.enum(['REAL_CONTRACT', 'INFLATED_ORDER', 'NO_CATALYST']), ...companyDossierScenarioFields,
    priorReview: companyDossierPriorReviewSchema.optional(), status: z.literal('ACTIVE'),
    step: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), evidence: z.array(companyDossierEvidenceSchema).max(3) }),
  z.object({ id: z.literal('CHEN_DOSSIER'), day: z.number().int().positive(), stockId: z.string(),
      caseType: z.enum(['REAL_CONTRACT', 'INFLATED_ORDER', 'NO_CATALYST']), ...companyDossierScenarioFields,
    priorReview: companyDossierPriorReviewSchema.optional(), status: z.literal('RESULT'), step: z.literal(3),
    evidence: z.tuple([companyDossierEvidenceSchema, companyDossierEvidenceSchema, companyDossierEvidenceSchema]),
    conclusion: z.enum(['BUY', 'AVOID', 'WAIT']), correct: z.boolean(), reliableCount: z.number().int().min(0).max(3), intel: marketIntelSchema }),
]);

const chartLessonChoiceSchema = z.enum([
  'RIDE_HIGHER_LOWS', 'CHASE_LAST_SPIKE', 'SELL_FIRST_PULLBACK', 'WAIT_FOR_VOLUME',
  'BUY_ANY_BREAKOUT', 'IGNORE_VOLUME', 'WAIT_FOR_RANGE_BREAK', 'ASSUME_REVERSAL', 'DOUBLE_POSITION',
]);
const chartLessonDecisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  choice: chartLessonChoiceSchema,
  correct: z.boolean(),
});
const chartLessonReviewSchema = z.object({
  previousDay: z.number().int().positive(),
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  choice: chartLessonChoiceSchema,
  signal: z.enum(['HIGHER_LOWS', 'WEAK_BREAKOUT', 'NARROW_RANGE']),
});
export const chartLessonSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('BODHISATTVA_CHART_LESSON'), day: z.number().int().positive(), stockId: z.string(),
    scenarioVersion: z.literal(2).optional(), scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).optional(),
    scenarioIndex: z.number().int().min(0).max(2699).optional(), priorScore: z.number().int().min(0).max(3).nullable().optional(),
    priorReview: chartLessonReviewSchema.optional(),
    status: z.literal('ACTIVE'), step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    decisions: z.array(chartLessonDecisionSchema).max(2), energySpent: z.number().int().min(0).max(6) }),
  z.object({ id: z.literal('BODHISATTVA_CHART_LESSON'), day: z.number().int().positive(), stockId: z.string(),
    scenarioVersion: z.literal(2).optional(), scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).optional(),
    scenarioIndex: z.number().int().min(0).max(2699).optional(), priorScore: z.number().int().min(0).max(3).nullable().optional(),
    priorReview: chartLessonReviewSchema.optional(),
    status: z.literal('RESULT'), step: z.literal(3), decisions: z.tuple([
      chartLessonDecisionSchema, chartLessonDecisionSchema, chartLessonDecisionSchema,
    ]), energySpent: z.literal(9), score: z.number().int().min(0).max(3), intel: marketIntelSchema.nullable() }),
]);

const phoneFlipChoiceSchema = z.enum(['PASS', 'ASK_QUICK', 'ASK_REFURB', 'BARGAIN_QUICK', 'BARGAIN_REFURB']);
const phoneFlipInspectionSchema = z.object({
  condition: z.string(), diagnosis: z.string(), repairCost: z.number().finite().nonnegative(),
  resaleAsIs: z.number().finite().nonnegative(), resaleRefurbished: z.number().finite().nonnegative(),
  quickProfitAtAsk: z.number().finite(), refurbProfitAtAsk: z.number().finite(),
  quickProfitAtBargain: z.number().finite().nullable(), refurbProfitAtBargain: z.number().finite().nullable(),
});
const phoneFlipReturnContextSchema = z.object({
  previousDay: z.number().int().positive(),
  phoneName: z.string().min(1).max(128),
  loss: z.number().finite().positive(),
});
const phoneFlipDecisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]), phoneName: z.string(), choice: phoneFlipChoiceSchema,
  inspection: phoneFlipInspectionSchema.nullable(),
  offerPrice: z.number().finite().nonnegative(), bought: z.boolean(), bargainRejected: z.boolean(),
  purchaseCost: z.number().finite().nonnegative(), repairCost: z.number().finite().nonnegative(),
  salePrice: z.number().finite().nonnegative(), profit: z.number().finite(), explanation: z.string(),
});
export const phoneFlipSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('PHONE_FLIP'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(), scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    returnContext: phoneFlipReturnContextSchema.nullable().optional(),
    step: z.union([z.literal(0), z.literal(1), z.literal(2)]), energySpent: z.number().int().nonnegative(),
    decisions: z.array(phoneFlipDecisionSchema).max(2), totalProfit: z.number().finite(), inspection: phoneFlipInspectionSchema.nullable() })
    .superRefine((run, context) => {
      if (run.decisions.length !== run.step) context.addIssue({ code: 'custom', message: 'Phone flip decisions must match the active lot.' });
      const profit = run.decisions.reduce((total, decision) => total + decision.profit, 0);
      const energy = run.decisions.filter((decision) => decision.inspection !== null).length * 3 + (run.inspection ? 3 : 0);
      if (run.totalProfit !== Number(profit.toFixed(2))) context.addIssue({ code: 'custom', message: 'Phone flip profit ledger is inconsistent.' });
      if (run.energySpent !== energy) context.addIssue({ code: 'custom', message: 'Phone flip inspection energy is inconsistent.' });
    }),
  z.object({ id: z.literal('PHONE_FLIP'), day: z.number().int().positive(), status: z.literal('RESULT'), step: z.literal(3),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(), scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    energySpent: z.number().int().nonnegative(), decisions: z.tuple([phoneFlipDecisionSchema, phoneFlipDecisionSchema, phoneFlipDecisionSchema]),
    totalProfit: z.number().finite() }).superRefine((run, context) => {
      const profit = run.decisions.reduce((total, decision) => total + decision.profit, 0);
      const energy = run.decisions.filter((decision) => decision.inspection !== null).length * 3;
      if (run.totalProfit !== Number(profit.toFixed(2))) context.addIssue({ code: 'custom', message: 'Phone flip settlement does not match its transaction record.' });
      if (run.energySpent !== energy) context.addIssue({ code: 'custom', message: 'Phone flip inspection energy is inconsistent.' });
    }),
]);

const previousActivities = [deliveryRunSchema, longgeChatSchema, streamRunSchema, companyDossierSchema, jiugeNegotiationSchema] as const;
export const legacyActivitySchema = z.union(previousActivities);
export const activitySchemaBeforeChart = z.union([...previousActivities, factoryShiftSchema]);
export const activitySchemaBeforeCafe = z.union([...previousActivities, factoryShiftSchema, chartLessonSchema]);
export const activitySchemaBeforeReplay = z.union([...previousActivities, factoryShiftSchema, chartLessonSchema, cafeShiftSchema]);
export const activitySchemaBeforeMarketStall = z.union([activitySchemaBeforeReplay, riskReplaySchema]);
export const activitySchemaBeforeBroker = z.union([activitySchemaBeforeMarketStall, laoLiangMarketStallSchema]);
export const activitySchemaBeforeZhengRepair = z.union([activitySchemaBeforeBroker, brokerNegotiationSchema]);
export const activitySchemaBeforePhoneFlip = z.union([activitySchemaBeforeZhengRepair, zhengBikeRepairSchema]);
export const activitySchema = z.union([activitySchemaBeforePhoneFlip, phoneFlipSchema]);
