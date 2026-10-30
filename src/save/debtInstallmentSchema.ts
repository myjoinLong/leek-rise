import { z } from 'zod';

export const debtInstallmentSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED', 'DEBT_CLEARED']),
  remaining: z.number().int().min(0).max(8),
  weeklyPayment: z.number().finite().positive().max(1_000_000).refine((value) => Number(value.toFixed(2)) === value),
  lastReceipt: z.object({
    day: z.number().int().positive(),
    due: z.number().finite().nonnegative(),
    paid: z.number().finite().nonnegative(),
    shortfall: z.number().finite().nonnegative(),
  }).nullable(),
});
