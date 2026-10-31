import { z } from 'zod';

const partSchema = z.enum(['BATTERY', 'BRAKES', 'CONTROLLER']);
const stepSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const returnContextSchema = z.object({
  previousDay: z.number().int().positive(),
  customerName: z.string().min(1).max(96),
  issueTitle: z.string().min(1).max(128),
  faultPart: partSchema,
  kind: z.enum(['MISSED_REPAIR', 'MISSING_PROOF']),
});
const testSchema = z.object({ step: stepSchema, part: partSchema, foundFault: z.boolean() });
const decisionSchema = z.object({
  step: stepSchema,
  repairedPart: partSchema,
  correct: z.boolean(),
  qualityBonus: z.union([z.literal(0), z.literal(12)]),
  verified: z.boolean().optional(),
});
function matchesWorkLedger(decisions: readonly { qualityBonus: number }[], income: number, qualityBonus: number): boolean {
  const bonus = decisions.reduce((total, decision) => total + decision.qualityBonus, 0);
  if (qualityBonus !== bonus) return false;
  const jobCount = decisions.length;
  return Array.from({ length: jobCount + 1 }, (_, newRateJobs) =>
    (jobCount - newRateJobs) * 18 + newRateJobs * 48 + bonus,
  ).includes(income);
}
const shared = {
  id: z.literal('ZHENG_BIKE_REPAIR'),
  day: z.number().int().positive(),
  scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
  returnContext: returnContextSchema.nullable().optional(),
  energySpent: z.number().int().min(0).max(33),
  income: z.number().int().min(0).max(180),
  qualityBonus: z.number().int().min(0).max(36),
  tests: z.array(testSchema).max(9),
};

export const zhengBikeRepairSchema = z.discriminatedUnion('status', [
  z.object({ ...shared, status: z.literal('ACTIVE'), step: stepSchema, decisions: z.array(decisionSchema).max(2) })
    .superRefine((run, context) => {
      if (run.decisions.length !== run.step) context.addIssue({ code: 'custom', message: 'Bike repair decisions must match the active ticket.' });
      if (run.energySpent !== run.tests.length * 2 + run.decisions.length * 5) context.addIssue({ code: 'custom', message: 'Bike repair energy ledger is inconsistent.' });
      if (!matchesWorkLedger(run.decisions, run.income, run.qualityBonus)) context.addIssue({ code: 'custom', message: 'Bike repair income ledger is inconsistent.' });
    }),
  z.object({ ...shared, status: z.literal('RESULT'), step: z.literal(3), decisions: z.tuple([decisionSchema, decisionSchema, decisionSchema]) })
    .superRefine((run, context) => {
      if (!matchesWorkLedger(run.decisions, run.income, run.qualityBonus)) context.addIssue({ code: 'custom', message: 'Bike repair settlement does not match its work record.' });
      if (run.energySpent !== run.tests.length * 2 + 15) context.addIssue({ code: 'custom', message: 'Bike repair energy ledger is inconsistent.' });
    }),
]);
