import { z } from 'zod';
import { activitySchema, activitySchemaBeforeBroker, activitySchemaBeforeCafe, activitySchemaBeforeChart, activitySchemaBeforeMarketStall, activitySchemaBeforeZhengRepair, legacyActivitySchema, marketIntelSchema } from './activitySchemas';
import { marketSchemas, phaseSchema } from './marketSchemas';
import { debtInstallmentSchema } from './debtInstallmentSchema';
import { brokerageContractSchema } from './brokerNegotiationSchema';

export const saveVersion = 18;

export const gameStateSchema = z.object({
  day: z.number(),
  phase: phaseSchema,
  cash: z.number(),
  debt: z.number(),
  stocks: z.record(z.string(), marketSchemas.stockState),
  selectedStockId: z.string(),
  inputShares: z.number(),
  lastOrderFeedback: marketSchemas.orderFeedback.nullable(),
  orderSequence: z.number(),
  npcMessage: z.string(),
  energy: z.number(),
  workedToday: z.boolean(),
  dayStartEquity: z.number(),
  dailyWorkIncome: z.number(),
  dailyStreamIncome: z.number().finite().nonnegative(),
  dailyFees: z.number(),
  dailyContractFees: z.number().finite().nonnegative(),
  weeklyStreamIncome: z.number().finite().nonnegative(),
  periodicCostLedger: z.object({
    interest: z.number().finite().nonnegative(),
    rent: z.number().finite().nonnegative(),
    membership: z.number().finite().nonnegative(),
    equipment: z.number().finite().nonnegative(),
    platformShare: z.number().finite().nonnegative(),
    deferred: z.number().finite().nonnegative(),
    interestGraceApplied: z.boolean(),
    rateRestructureApplied: z.boolean(),
  }),
  lastPeriodicSettlementDay: z.number().int().nonnegative(),
  debtCrisisStarted: z.boolean(),
  debtNegotiationCompleted: z.boolean(),
  debtInterestGraceWeeksRemaining: z.number().int().min(0).max(1),
  debtRatePlanWeeksRemaining: z.number().int().min(0).max(8),
  debtInstallmentPlan: debtInstallmentSchema.nullable().default(null),
  fame: z.number().int().min(0).max(100),
  streamedToday: z.boolean(),
  gender: z.enum(['MALE', 'FEMALE']).nullable(),
  energyMax: z.number(),
  leechLevel: z.number(),
  activeActivity: activitySchema.nullable(),
  marketIntel: marketIntelSchema.nullable(),
  longgeVisitedToday: z.boolean(),
  chenVisitedToday: z.boolean(),
  chartLessonVisitedToday: z.boolean(),
  riskReplayVisitedToday: z.boolean().default(false),
  brokerContract: brokerageContractSchema.nullable(),
  brokerNegotiationVisitedToday: z.boolean(),
});

const versionEightCostLedgerSchema = z.object({
  interest: z.number().finite().nonnegative(),
  rent: z.number().finite().nonnegative(),
  membership: z.number().finite().nonnegative(),
  equipment: z.number().finite().nonnegative(),
  platformShare: z.number().finite().nonnegative(),
  deferred: z.number().finite().nonnegative(),
  interestGraceApplied: z.boolean(),
});
const previousGameStateSchema = gameStateSchema.omit({ activeActivity: true, chartLessonVisitedToday: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: legacyActivitySchema.nullable() });
const versionEightGameStateSchema = previousGameStateSchema.extend({ periodicCostLedger: versionEightCostLedgerSchema }).omit({
  debtRatePlanWeeksRemaining: true,
  dailyContractFees: true,
});
const versionSevenCostLedgerSchema = z.object({
  interest: z.number().finite().nonnegative(),
  rent: z.number().finite().nonnegative(),
  membership: z.number().finite().nonnegative(),
  equipment: z.number().finite().nonnegative(),
  platformShare: z.number().finite().nonnegative(),
  deferred: z.number().finite().nonnegative(),
});
const versionSevenGameStateSchema = versionEightGameStateSchema.extend({ periodicCostLedger: versionSevenCostLedgerSchema }).omit({
  debtNegotiationCompleted: true,
  debtInterestGraceWeeksRemaining: true,
});
const versionSixGameStateSchema = versionSevenGameStateSchema.omit({ debtCrisisStarted: true });
const versionFiveGameStateSchema = versionSixGameStateSchema.omit({
  weeklyStreamIncome: true,
  periodicCostLedger: true,
  lastPeriodicSettlementDay: true,
});
const versionFourGameStateSchema = versionFiveGameStateSchema.omit({ chenVisitedToday: true });
const versionThreeGameStateSchema = versionFourGameStateSchema.omit({ dailyStreamIncome: true, fame: true, streamedToday: true });
const versionTwoGameStateSchema = versionThreeGameStateSchema.omit({ marketIntel: true, longgeVisitedToday: true });
const legacyGameStateSchema = versionTwoGameStateSchema.omit({ activeActivity: true });
const versionNineGameStateSchema = previousGameStateSchema;
const versionTenGameStateSchema = gameStateSchema.omit({ activeActivity: true, chartLessonVisitedToday: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: activitySchemaBeforeChart.nullable() });
const versionElevenGameStateSchema = gameStateSchema.omit({ activeActivity: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: activitySchemaBeforeCafe.nullable() });
const versionFourteenGameStateSchema = gameStateSchema.omit({ activeActivity: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: activitySchemaBeforeMarketStall.nullable() });
const versionFifteenGameStateSchema = gameStateSchema.omit({ activeActivity: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: activitySchemaBeforeBroker.nullable() });
const versionSeventeenGameStateSchema = gameStateSchema.omit({ activeActivity: true })
  .extend({ activeActivity: activitySchemaBeforeZhengRepair.nullable() });

export const saveEnvelopeSchema = z.discriminatedUnion('version', [
  z.object({ version: z.literal(1), savedAt: z.number(), state: legacyGameStateSchema }),
  z.object({ version: z.literal(2), savedAt: z.number(), state: versionTwoGameStateSchema }),
  z.object({ version: z.literal(3), savedAt: z.number(), state: versionThreeGameStateSchema }),
  z.object({ version: z.literal(4), savedAt: z.number(), state: versionFourGameStateSchema }),
  z.object({ version: z.literal(5), savedAt: z.number(), state: versionFiveGameStateSchema }),
  z.object({ version: z.literal(6), savedAt: z.number(), state: versionSixGameStateSchema }),
  z.object({ version: z.literal(7), savedAt: z.number(), state: versionSevenGameStateSchema }),
  z.object({ version: z.literal(8), savedAt: z.number(), state: versionEightGameStateSchema }),
  z.object({ version: z.literal(9), savedAt: z.number(), state: versionNineGameStateSchema }),
  z.object({ version: z.literal(10), savedAt: z.number(), state: versionTenGameStateSchema }),
  z.object({ version: z.literal(11), savedAt: z.number(), state: versionElevenGameStateSchema }),
  z.object({ version: z.literal(12), savedAt: z.number(), state: versionFourteenGameStateSchema }),
  z.object({ version: z.literal(13), savedAt: z.number(), state: versionFourteenGameStateSchema }),
  z.object({ version: z.literal(14), savedAt: z.number(), state: versionFourteenGameStateSchema }),
  z.object({ version: z.literal(15), savedAt: z.number(), state: versionFifteenGameStateSchema }),
  z.object({ version: z.literal(16), savedAt: z.number(), state: versionSeventeenGameStateSchema }),
  z.object({ version: z.literal(17), savedAt: z.number(), state: versionSeventeenGameStateSchema }),
  z.object({ version: z.literal(saveVersion), savedAt: z.number(), state: gameStateSchema }),
]);
