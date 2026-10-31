import { z } from 'zod';

const choiceSchema = z.enum([
  'SHOW_LEDGER', 'BLUFF_CASHFLOW', 'PROVE_INCOME', 'PROMISE_FULL', 'ASK_INTEREST_GRACE', 'SIGN_RATE_RESTRUCTURE', 'SIGN_INSTALLMENTS', 'SIGN_STANDARD',
]);
const decisionSchema = z.object({
  step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  choice: choiceSchema,
});

export const jiugeNegotiationSchema = z.discriminatedUnion('status', [
  z.object({
    id: z.literal('JIUGE_NEGOTIATION'),
    day: z.number().int().positive(),
    status: z.literal('ACTIVE'),
    askedAboutHistory: z.boolean().optional(),
    scenarioVersion: z.literal(2).optional(),
    scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    scenarioIndex: z.number().int().min(0).max(29).optional(),
    step: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    decisions: z.array(decisionSchema).max(2),
  }),
  z.object({
    id: z.literal('JIUGE_NEGOTIATION'),
    day: z.number().int().positive(),
    status: z.literal('RESULT'),
    askedAboutHistory: z.boolean().optional(),
    scenarioVersion: z.literal(2).optional(),
    scenarioSeed: z.number().int().nonnegative().max(0xFFFFFFFF).optional(),
    scenarioIndex: z.number().int().min(0).max(29).optional(),
    step: z.literal(3),
    decisions: z.array(decisionSchema).length(3),
    outcome: z.enum(['INTEREST_GRACE', 'RATE_RESTRUCTURE', 'INSTALLMENTS', 'STANDARD_TERMS']),
  }),
]);
