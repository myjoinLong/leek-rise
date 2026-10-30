import { z } from 'zod';

const brokerTurnoverSchema = z.union([z.literal(10000), z.literal(36000), z.literal(60000)]);
const brokerPlanSchema = z.enum(['STANDARD', 'LOW_COMMISSION']);

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
  }).refine((run) => (run.step === 0) === (run.projectedTurnover === null), 'Broker negotiation step and estimate must match.'),
  z.object({
    id: z.literal('ZHOU_BROKER_NEGOTIATION'), day: z.number().int().positive(), status: z.literal('RESULT'), step: z.literal(2),
    projectedTurnover: brokerTurnoverSchema, plan: brokerPlanSchema, serviceFeePaid: z.union([z.literal(0), z.literal(18)]),
    expiresDay: z.number().int().positive().nullable(),
  }).refine((run) => run.plan === 'LOW_COMMISSION'
    ? run.serviceFeePaid === 18 && run.expiresDay === run.day + 6
    : run.serviceFeePaid === 0 && run.expiresDay === null, 'Broker result terms are inconsistent.'),
]);
