import { z } from 'zod';

const factoryDecisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  choice: z.enum(['REWORK', 'PASS']),
  correct: z.boolean(),
  energyCost: z.union([z.literal(5), z.literal(9)]),
});
const qualityBonusSchema = z.union([z.literal(0), z.literal(20), z.literal(40), z.literal(60)]);
const energySpentSchema = z.number().int().min(0).max(27);

export const factoryShiftSchema = z.discriminatedUnion('status', [
  z.object({
    id: z.literal('WANG_FACTORY'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    step: z.union([z.literal(0), z.literal(1), z.literal(2)]), qualityBonus: qualityBonusSchema,
    energySpent: energySpentSchema, decisions: z.array(factoryDecisionSchema).max(2),
  }).superRefine((run, context) => {
    if (run.decisions.length !== run.step) context.addIssue({ code: 'custom', message: 'Factory decisions must match the active step.' });
  }),
  z.object({
    id: z.literal('WANG_FACTORY'), day: z.number().int().positive(), status: z.literal('RESULT'), step: z.literal(3),
    qualityBonus: qualityBonusSchema, energySpent: energySpentSchema,
    decisions: z.tuple([factoryDecisionSchema, factoryDecisionSchema, factoryDecisionSchema]),
    income: z.number().int().min(60).max(120),
  }).superRefine((run, context) => {
    const correctCount = run.decisions.filter((decision) => decision.correct).length;
    if (run.qualityBonus !== correctCount * 20 || run.income !== 60 + run.qualityBonus) {
      context.addIssue({ code: 'custom', message: 'Factory result does not match its inspection record.' });
    }
  }),
]);
