import { z } from 'zod';
import { factoryIsolationAvailable } from '../core/factoryShiftTypes';

export const factoryReturnContextSchema = z.object({
  previousDay: z.number().int().positive(),
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  caseTitle: z.string().min(1).max(160),
  choice: z.enum(['REWORK', 'PASS', 'HOLD']),
  correctChoice: z.enum(['REWORK', 'PASS', 'HOLD']),
  qualityBonusMissed: z.literal(20),
}).superRefine((review, context) => {
  if (review.choice === review.correctChoice) {
    context.addIssue({ code: 'custom', message: 'A factory review must describe a missed inspection.' });
  }
});

const factoryDecisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  choice: z.enum(['REWORK', 'PASS', 'HOLD']),
  correct: z.boolean(),
  energyCost: z.union([z.literal(5), z.literal(7), z.literal(9)]),
}).superRefine((decision, context) => {
  const expectedCost = decision.choice === 'REWORK' ? 9 : decision.choice === 'HOLD' ? 7 : 5;
  if (decision.energyCost !== expectedCost) context.addIssue({ code: 'custom', message: 'Factory choice energy cost is inconsistent.' });
});
const qualityBonusSchema = z.union([z.literal(0), z.literal(20), z.literal(40), z.literal(60)]);
const energySpentSchema = z.number().int().min(0).max(27);

export const factoryShiftSchema = z.discriminatedUnion('status', [
  z.object({
    id: z.literal('WANG_FACTORY'), day: z.number().int().positive(), status: z.literal('ACTIVE'),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(), scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    priorReview: factoryReturnContextSchema.optional(),
    step: z.union([z.literal(0), z.literal(1), z.literal(2)]), qualityBonus: qualityBonusSchema,
    energySpent: energySpentSchema, decisions: z.array(factoryDecisionSchema).max(2),
  }).superRefine((run, context) => {
    if (run.priorReview && run.priorReview.previousDay >= run.day) {
      context.addIssue({ code: 'custom', message: 'Factory reviews must come from an earlier day.' });
    }
    if (run.decisions.length !== run.step) context.addIssue({ code: 'custom', message: 'Factory decisions must match the active step.' });
    if (run.decisions.some((decision) => decision.choice === 'HOLD') && !factoryIsolationAvailable(run.day, run.scenarioVersion)) {
      context.addIssue({ code: 'custom', message: 'Isolation review is only available in continuation shifts.' });
    }
  }),
  z.object({
    id: z.literal('WANG_FACTORY'), day: z.number().int().positive(), status: z.literal('RESULT'), step: z.literal(3),
    scenarioVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(), scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    priorReview: factoryReturnContextSchema.optional(),
    qualityBonus: qualityBonusSchema, energySpent: energySpentSchema,
    decisions: z.tuple([factoryDecisionSchema, factoryDecisionSchema, factoryDecisionSchema]),
    income: z.number().int().min(60).max(120),
  }).superRefine((run, context) => {
    if (run.priorReview && run.priorReview.previousDay >= run.day) {
      context.addIssue({ code: 'custom', message: 'Factory reviews must come from an earlier day.' });
    }
    const correctCount = run.decisions.filter((decision) => decision.correct).length;
    if (run.qualityBonus !== correctCount * 20 || run.income !== 60 + run.qualityBonus) {
      context.addIssue({ code: 'custom', message: 'Factory result does not match its inspection record.' });
    }
    if (run.decisions.some((decision) => decision.choice === 'HOLD') && !factoryIsolationAvailable(run.day, run.scenarioVersion)) {
      context.addIssue({ code: 'custom', message: 'Isolation review is only available in continuation shifts.' });
    }
  }),
]);
