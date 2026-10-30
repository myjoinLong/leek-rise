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
const deliveryRunSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('WANG_DELIVERY'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    stopIndex: z.number().int().min(0).max(2), totalIncome: z.number().finite().nonnegative(),
    energySpent: z.number().int().nonnegative(), decisions: z.array(deliveryDecisionSchema).max(2) }),
  z.object({ id: z.literal('WANG_DELIVERY'), day: z.number().int().positive(), status: z.literal('RESULT'),
    stopIndex: z.literal(3), totalIncome: z.number().finite().nonnegative(),
    energySpent: z.number().int().nonnegative(), decisions: z.array(deliveryDecisionSchema).length(3) }),
]);

export const marketIntelSchema = z.object({
  day: z.number().int().positive(), stockId: z.string(), npcName: z.string().optional(),
  confidence: z.enum(['HIGH', 'LOW', 'UNCERTAIN']), bias: z.enum(['CAUTION', 'OPPORTUNITY', 'UNCERTAIN']), message: z.string(),
});
const longgeClueSchema = z.enum(['VERIFY_ORIGIN', 'FOLLOW_REPOST', 'READ_TAPE', 'WATCH_PRICE', 'CHECK_NOTICE', 'ASK_GROUP']);
const longgeChatSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('LONGGE_CHAT'), day: z.number().int().positive(), caseType: z.enum(['ACCUMULATION', 'DISTRIBUTION', 'CATALYST']),
    status: z.literal('ACTIVE'), step: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), clues: z.array(longgeClueSchema).max(3) }),
  z.object({ id: z.literal('LONGGE_CHAT'), day: z.number().int().positive(), caseType: z.enum(['ACCUMULATION', 'DISTRIBUTION', 'CATALYST']),
    status: z.literal('RESULT'), clues: z.array(longgeClueSchema).length(3),
    conclusion: z.enum(['DISTRIBUTION', 'REAL_CATALYST', 'INSUFFICIENT']), correct: z.boolean(), intel: marketIntelSchema }),
]);

const streamChoiceSchema = z.enum(['HONEST_REVIEW', 'HYPE_CLAIM', 'ANSWER_QUESTIONS', 'REPEAT_CTA', 'TRANSPARENT_DEAL', 'FAKE_SCARCITY']);
const streamDecisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]), choice: streamChoiceSchema,
  audienceDelta: z.number().int(), trustDelta: z.number().int(), salesPoints: z.number().int().nonnegative(),
});
const streamRunSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('XIAOLIAN_STREAM'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    step: z.union([z.literal(0), z.literal(1), z.literal(2)]), audience: z.number().int().min(0).max(100),
    trust: z.number().int().min(0).max(100), salesPoints: z.number().int().nonnegative(), energySpent: z.number().int().nonnegative(),
    decisions: z.array(streamDecisionSchema).max(2) }),
  z.object({ id: z.literal('XIAOLIAN_STREAM'), day: z.number().int().positive(), status: z.literal('RESULT'), step: z.literal(3),
    audience: z.number().int().min(0).max(100), trust: z.number().int().min(0).max(100), salesPoints: z.number().int().nonnegative(),
    energySpent: z.number().int().nonnegative(), decisions: z.array(streamDecisionSchema).length(3),
    income: z.number().finite().nonnegative(), fameDelta: z.number().int().min(-5).max(6) }),
]);

const companyDossierChoiceSchema = z.enum(['VERIFY_FILING', 'SKIM_PITCH', 'CHECK_SUPPLIER', 'ASK_SALES', 'MATCH_INVOICES', 'READ_FORECAST']);
const companyDossierEvidenceSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]), choice: companyDossierChoiceSchema,
  finding: z.enum(['CONTRACT', 'HYPE', 'NO_CATALYST', 'UNVERIFIED']),
});
const companyDossierSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('CHEN_DOSSIER'), day: z.number().int().positive(), stockId: z.string(),
    caseType: z.enum(['REAL_CONTRACT', 'INFLATED_ORDER', 'NO_CATALYST']), status: z.literal('ACTIVE'),
    step: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), evidence: z.array(companyDossierEvidenceSchema).max(3) }),
  z.object({ id: z.literal('CHEN_DOSSIER'), day: z.number().int().positive(), stockId: z.string(),
    caseType: z.enum(['REAL_CONTRACT', 'INFLATED_ORDER', 'NO_CATALYST']), status: z.literal('RESULT'), step: z.literal(3),
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
export const chartLessonSchema = z.discriminatedUnion('status', [
  z.object({ id: z.literal('BODHISATTVA_CHART_LESSON'), day: z.number().int().positive(), stockId: z.string(),
    status: z.literal('ACTIVE'), step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    decisions: z.array(chartLessonDecisionSchema).max(2), energySpent: z.number().int().min(0).max(6) }),
  z.object({ id: z.literal('BODHISATTVA_CHART_LESSON'), day: z.number().int().positive(), stockId: z.string(),
    status: z.literal('RESULT'), step: z.literal(3), decisions: z.tuple([
      chartLessonDecisionSchema, chartLessonDecisionSchema, chartLessonDecisionSchema,
    ]), energySpent: z.literal(9), score: z.number().int().min(0).max(3), intel: marketIntelSchema.nullable() }),
]);

const previousActivities = [deliveryRunSchema, longgeChatSchema, streamRunSchema, companyDossierSchema, jiugeNegotiationSchema] as const;
export const legacyActivitySchema = z.union(previousActivities);
export const activitySchemaBeforeChart = z.union([...previousActivities, factoryShiftSchema]);
export const activitySchemaBeforeCafe = z.union([...previousActivities, factoryShiftSchema, chartLessonSchema]);
export const activitySchemaBeforeReplay = z.union([...previousActivities, factoryShiftSchema, chartLessonSchema, cafeShiftSchema]);
export const activitySchemaBeforeMarketStall = z.union([activitySchemaBeforeReplay, riskReplaySchema]);
export const activitySchemaBeforeBroker = z.union([activitySchemaBeforeMarketStall, laoLiangMarketStallSchema]);
export const activitySchemaBeforeZhengRepair = z.union([activitySchemaBeforeBroker, brokerNegotiationSchema]);
export const activitySchema = z.union([activitySchemaBeforeZhengRepair, zhengBikeRepairSchema]);
