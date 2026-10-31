import { z } from 'zod';

const decisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  allocation: z.number().int().min(0).max(100),
  equityBefore: z.number().finite().positive(),
  invested: z.number().finite().nonnegative(),
  stressLoss: z.number().finite().nonnegative(),
  withinBudget: z.boolean(),
  pnl: z.number().finite(),
  fullPositionPnl: z.number().finite(),
});
const priorReviewSchema = z.object({
  previousDay: z.number().int().positive(),
  previousStep: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  previousAllocation: z.number().int().min(0).max(100),
  equityBefore: z.number().finite().positive(),
  stressPercent: z.number().finite().positive(),
  stressLoss: z.number().finite().positive(),
});
const base = z.object({
  id: z.literal('SWEEPER_RISK_REPLAY'), day: z.number().int().positive(),
  scenarioVersion: z.literal(2).optional(),
  scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).optional(),
  scenarioIndex: z.number().int().min(0).max(2699).optional(),
  priorBudgetScore: z.number().int().min(0).max(3).nullable().optional(),
  priorReview: priorReviewSchema.optional(),
  equity: z.number().finite().positive(), energySpent: z.number().int().min(0).max(12),
  decisions: z.array(decisionSchema),
});
export const riskReplaySchema = z.discriminatedUnion('status', [
  base.extend({ status: z.literal('ACTIVE'), step: z.union([z.literal(0), z.literal(1), z.literal(2)]) }),
  base.extend({ status: z.literal('RESULT'), step: z.literal(3), respectedBudget: z.number().int().min(0).max(3) }),
]).superRefine((run, context) => {
  if (run.decisions.length !== run.step || run.energySpent !== run.step * 4
    || run.decisions.some((entry, index) => entry.step !== index)) {
    context.addIssue({ code: 'custom', message: 'Replay progress and decisions must agree.' });
  }
});
