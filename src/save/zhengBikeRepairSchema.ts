import { z } from 'zod';

const partSchema = z.enum(['BATTERY', 'BRAKES', 'CONTROLLER']);
const stepSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const testSchema = z.object({ step: stepSchema, part: partSchema, foundFault: z.boolean() });
const decisionSchema = z.object({
  step: stepSchema,
  repairedPart: partSchema,
  correct: z.boolean(),
  qualityBonus: z.union([z.literal(0), z.literal(12)]),
});
const shared = {
  id: z.literal('ZHENG_BIKE_REPAIR'),
  day: z.number().int().positive(),
  energySpent: z.number().int().min(0).max(33),
  income: z.number().int().min(0).max(90),
  qualityBonus: z.union([z.literal(0), z.literal(12), z.literal(24), z.literal(36)]),
  tests: z.array(testSchema).max(9),
};

export const zhengBikeRepairSchema = z.discriminatedUnion('status', [
  z.object({ ...shared, status: z.literal('ACTIVE'), step: stepSchema, decisions: z.array(decisionSchema).max(2) })
    .superRefine((run, context) => {
      if (run.decisions.length !== run.step) context.addIssue({ code: 'custom', message: 'Bike repair decisions must match the active ticket.' });
      if (run.energySpent !== run.tests.length * 2 + run.decisions.length * 5) context.addIssue({ code: 'custom', message: 'Bike repair energy ledger is inconsistent.' });
      if (run.income !== run.decisions.length * 18 + run.qualityBonus) context.addIssue({ code: 'custom', message: 'Bike repair income ledger is inconsistent.' });
    }),
  z.object({ ...shared, status: z.literal('RESULT'), step: z.literal(3), decisions: z.tuple([decisionSchema, decisionSchema, decisionSchema]) })
    .superRefine((run, context) => {
      const bonus = run.decisions.reduce((total, decision) => total + decision.qualityBonus, 0);
      if (run.qualityBonus !== bonus || run.income !== 54 + bonus) context.addIssue({ code: 'custom', message: 'Bike repair settlement does not match its work record.' });
      if (run.energySpent !== run.tests.length * 2 + 15) context.addIssue({ code: 'custom', message: 'Bike repair energy ledger is inconsistent.' });
    }),
]);
