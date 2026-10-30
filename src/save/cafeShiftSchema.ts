import { z } from 'zod';

const customerSchema = z.enum(['RIDER', 'REGULAR', 'PARENT']);
const choiceSchema = z.enum([
  'BLACK_COFFEE', 'OAT_LATTE', 'CAKE', 'SUGAR_FREE_LATTE', 'CARAMEL_MOCHA',
  'SWEET_TEA', 'WARM_MILK', 'DOUBLE_ESPRESSO', 'ICED_TEA',
]);
const decisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  customer: customerSchema,
  choice: choiceSchema,
  correct: z.boolean(),
});

export const cafeShiftSchema = z.discriminatedUnion('status', [
  z.object({
    id: z.literal('SUJIE_CAFE_SHIFT'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    step: z.union([z.literal(0), z.literal(1), z.literal(2)]), decisions: z.array(decisionSchema).max(2),
    energySpent: z.number().int().min(0).max(10), tips: z.number().int().min(0).max(32),
  }),
  z.object({
    id: z.literal('SUJIE_CAFE_SHIFT'), day: z.number().int().positive(), status: z.literal('RESULT'), step: z.literal(3),
    decisions: z.tuple([decisionSchema, decisionSchema, decisionSchema]), energySpent: z.literal(15),
    tips: z.number().int().min(0).max(48), basePay: z.literal(72), income: z.number().int().min(72).max(120),
  }),
]);
