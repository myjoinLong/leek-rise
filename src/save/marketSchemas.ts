import { z } from 'zod';

export const phaseSchema = z.enum(['PRE_MARKET', 'DAYTIME', 'TRADING', 'NIGHT']);
const scriptPhaseSchema = z.enum(['ACCUMULATE', 'PUMP', 'DISTRIBUTE', 'DUMP']);
const orderSideSchema = z.enum(['BUY', 'SELL']);

const orderFeedbackSchema = z.object({
  id: z.string(),
  stockName: z.string(),
  side: orderSideSchema,
  requestedShares: z.number(),
  filledShares: z.number(),
  requestedPrice: z.number(),
  filledPrice: z.number(),
  slippagePct: z.number(),
  fee: z.number(),
  latencyMs: z.number(),
  result: z.enum(['FILLED', 'PARTIAL', 'REJECTED']),
  rejectReason: z.string().optional(),
  cashAfter: z.number(),
});

const tradeRecordSchema = z.object({
  id: z.string(),
  price: z.number(),
  shares: z.number(),
  side: orderSideSchema,
  isPlayer: z.boolean(),
});

const orderBookLevelSchema = z.object({
  price: z.number(),
  volume: z.number(),
});

const stockStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  volume: z.number(),
  priceHistory: z.array(z.number()),
  bids: z.array(orderBookLevelSchema),
  asks: z.array(orderBookLevelSchema),
  recentTrades: z.array(tradeRecordSchema),
  scriptPhase: scriptPhaseSchema,
  phaseProgress: z.number(),
  holding: z.object({ shares: z.number(), avgCost: z.number() }).optional(),
});

export const marketSchemas = {
  orderFeedback: orderFeedbackSchema,
  stockState: stockStateSchema,
};
