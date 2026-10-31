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
const returnContextSchema = z.object({
  previousDay: z.number().int().positive(),
  customerName: z.string().min(1).max(96),
  previousChoice: choiceSchema,
});
function tipsMatchDecisions(tips: number, decisions: readonly { correct: boolean }[]): boolean {
  const correctCount = decisions.filter((decision) => decision.correct).length;
  return Array.from({ length: correctCount + 1 }, (_, newRateOrders) =>
    newRateOrders * 35 + (correctCount - newRateOrders) * 16,
  ).includes(tips);
}

export const cafeShiftSchema = z.discriminatedUnion('status', [
  z.object({
    id: z.literal('SUJIE_CAFE_SHIFT'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).optional(),
    returnContext: returnContextSchema.nullable().optional(),
    step: z.union([z.literal(0), z.literal(1), z.literal(2)]), decisions: z.array(decisionSchema).max(2),
    energySpent: z.number().int().min(0).max(10), tips: z.number().int().min(0).max(70),
  }).superRefine((run, context) => {
    if (run.decisions.length !== run.step || !tipsMatchDecisions(run.tips, run.decisions)) {
      context.addIssue({ code: 'custom', message: 'Cafe tips must match the completed service decisions.' });
    }
  }),
  z.object({
    id: z.literal('SUJIE_CAFE_SHIFT'), day: z.number().int().positive(), status: z.literal('RESULT'),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).optional(),
    returnContext: returnContextSchema.nullable().optional(), step: z.literal(3),
    decisions: z.tuple([decisionSchema, decisionSchema, decisionSchema]), energySpent: z.literal(15),
    tips: z.number().int().min(0).max(105), basePay: z.literal(72), income: z.number().int().min(72).max(177),
  }).superRefine((run, context) => {
    if (!tipsMatchDecisions(run.tips, run.decisions) || run.income !== run.basePay + run.tips) {
      context.addIssue({ code: 'custom', message: 'Cafe settlement must match the completed service decisions.' });
    }
  }),
]);
