import { z } from 'zod';

const brokerTurnoverSchema = z.union([z.literal(10000), z.literal(36000), z.literal(60000)]);
const brokerPlanSchema = z.enum(['STANDARD', 'LOW_COMMISSION']);
const brokerScenarioFields = {
  scenarioVersion: z.literal(2).optional(),
  scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).optional(),
  scenarioIndex: z.number().int().min(0).max(29).optional(),
  marketSnapshot: z.object({
    stockId: z.string(), stockName: z.string(),
    currentPrice: z.number().finite().positive(), openPrice: z.number().finite().positive(),
    dayVolume: z.number().finite().nonnegative(), recentTradeCount: z.number().int().nonnegative(),
    recentTurnover: z.number().finite().nonnegative(), recentBuyShares: z.number().finite().nonnegative(),
    recentSellShares: z.number().finite().nonnegative(), bestSpread: z.number().finite().nullable(),
  }).optional(),
};

export const brokerContractReviewSchema = z.object({
  signedDay: z.number().int().positive(),
  expiresDay: z.number().int().positive(),
  projectedTurnover: brokerTurnoverSchema.nullable(),
  actualTurnover: z.number().finite().nonnegative(),
  discountedFeesPaid: z.number().finite().nonnegative(),
  standardFeesEquivalent: z.number().finite().nonnegative(),
  serviceFee: z.literal(18),
  netSavingsVsStandard: z.number().finite(),
}).refine((review) => review.expiresDay === review.signedDay + 6, 'Broker review must cover a seven-day contract.');

export const brokerageContractSchema = z.object({
  plan: z.literal('LOW_COMMISSION'),
  signedDay: z.number().int().positive(),
  expiresDay: z.number().int().positive(),
  projectedTurnover: brokerTurnoverSchema.nullable().default(null),
  actualTurnover: z.number().finite().nonnegative().default(0),
  discountedFeesPaid: z.number().finite().nonnegative().default(0),
  standardFeesEquivalent: z.number().finite().nonnegative().default(0),
  serviceFee: z.literal(18),
}).refine((contract) => contract.expiresDay === contract.signedDay + 6, 'Brokerage contract must cover seven calendar days.');

export const brokerNegotiationSchema = z.discriminatedUnion('status', [
  z.object({
    id: z.literal('ZHOU_BROKER_NEGOTIATION'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    step: z.union([z.literal(0), z.literal(1)]), projectedTurnover: brokerTurnoverSchema.nullable(),
    ...brokerScenarioFields,
    previousReview: brokerContractReviewSchema.optional(),
  }).refine((run) => (run.step === 0) === (run.projectedTurnover === null), 'Broker negotiation step and estimate must match.'),
  z.object({
    id: z.literal('ZHOU_BROKER_NEGOTIATION'), day: z.number().int().positive(), status: z.literal('RESULT'), step: z.literal(2),
    projectedTurnover: brokerTurnoverSchema, plan: brokerPlanSchema, serviceFeePaid: z.union([z.literal(0), z.literal(18)]),
    ...brokerScenarioFields,
    expiresDay: z.number().int().positive().nullable(),
    previousReview: brokerContractReviewSchema.optional(),
  }).refine((run) => run.plan === 'LOW_COMMISSION'
    ? run.serviceFeePaid === 18 && run.expiresDay === run.day + 6
    : run.serviceFeePaid === 0 && run.expiresDay === null, 'Broker result terms are inconsistent.'),
]);
