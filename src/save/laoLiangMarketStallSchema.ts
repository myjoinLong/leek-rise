import { z } from 'zod';
import { stallReferralMaxCustomerUnits } from '../core/marketStallTypes';

const productSchema = z.enum(['THERMOS', 'RAINCOAT', 'CABLE']);
const priceTierSchema = z.enum(['VALUE', 'STANDARD', 'PREMIUM']);
const returnContextSchema = z.object({ previousDay: z.number().int().positive(), product: productSchema });
const stepSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const decisionSchema = z.object({
  step: stepSchema,
  product: productSchema,
  priceTier: priceTierSchema,
  unitPrice: z.number().int().positive(),
  unitsSold: z.number().int().nonnegative().max(stallReferralMaxCustomerUnits),
  commission: z.number().int().nonnegative(),
});
const base = z.object({
  id: z.literal('LAOLIANG_MARKET_STALL'),
  day: z.number().int().positive(),
  scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
  returnContext: returnContextSchema.optional(),
  energySpent: z.number().int().min(0).max(15),
  decisions: z.array(decisionSchema).max(3),
});

export const laoLiangMarketStallSchema = z.discriminatedUnion('status', [
  base.extend({
    status: z.literal('ACTIVE'),
    step: stepSchema,
    selectedProduct: productSchema.nullable(),
  }),
  base.extend({
    status: z.literal('RESULT'),
    step: z.literal(3),
    income: z.number().int().positive(),
  }),
]).superRefine((run, context) => {
  const valid = run.status === 'ACTIVE'
    ? run.decisions.length === run.step && run.energySpent === run.step * 5
    : run.decisions.length === 3 && run.energySpent === 15
      && run.income === 60 + run.decisions.reduce((total, entry) => total + entry.commission, 0);
  if (!valid || run.decisions.some((entry, index) => entry.step !== index)) {
    context.addIssue({ code: 'custom', message: 'Stall progress and sales decisions must agree.' });
  }
});
