import { z } from 'zod';
import { activitySchema, activitySchemaBeforeBroker, activitySchemaBeforeCafe, activitySchemaBeforeChart, activitySchemaBeforeMarketStall, activitySchemaBeforePhoneFlip, activitySchemaBeforeZhengRepair, legacyActivitySchema, marketIntelSchema } from './activitySchemas';
import { marketSchemas, phaseSchema } from './marketSchemas';
import { debtInstallmentSchema } from './debtInstallmentSchema';
import { brokerageContractSchema, brokerContractReviewSchema } from './brokerNegotiationSchema';
import { marketTicksPerDay } from '../core/timeRules';
import { createEmptyNpcActivityMemory, npcMemoryTraceLimit } from '../core/npcActivityMemory';
import { factoryReturnContextSchema } from './factoryShiftSchema';

export const saveVersion = 28;

const npcActivityMemoryTraceSchema = z.object({
  day: z.number().int().positive().optional(),
  scenarioVersion: z.number().int().positive().optional(),
  scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).optional(),
  scenarioIndex: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  chartLessonOrder: z.tuple([
    z.union([z.literal(0), z.literal(1), z.literal(2)]),
    z.union([z.literal(0), z.literal(1), z.literal(2)]),
    z.union([z.literal(0), z.literal(1), z.literal(2)]),
  ]).refine((order) => new Set(order).size === 3).optional(),
  factoryReturnContext: factoryReturnContextSchema.optional(),
  sujieRegularCustomerName: z.string().min(1).max(96).optional(),
  streamScenarioTitle: z.string().min(1).max(160).optional(),
  brokerContractReview: brokerContractReviewSchema.optional(),
  laoLiangReturnContext: z.object({
    previousDay: z.number().int().positive(),
    product: z.enum(['THERMOS', 'RAINCOAT', 'CABLE']),
  }).optional(),
  zhengRepairReturnContext: z.object({
    previousDay: z.number().int().positive(),
    customerName: z.string().min(1).max(96),
    issueTitle: z.string().min(1).max(128),
    faultPart: z.enum(['BATTERY', 'BRAKES', 'CONTROLLER']),
    kind: z.enum(['MISSED_REPAIR', 'MISSING_PROOF']),
  }).optional(),
  phoneFlipReturnContext: z.object({
    previousDay: z.number().int().positive(),
    phoneName: z.string().min(1).max(128),
    loss: z.number().finite().positive(),
  }).optional(),
  activityId: z.enum([
    'WANG_DELIVERY', 'LONGGE_CHAT', 'XIAOLIAN_STREAM', 'CHEN_DOSSIER', 'JIUGE_NEGOTIATION',
    'WANG_FACTORY', 'BODHISATTVA_CHART_LESSON', 'SUJIE_CAFE_SHIFT', 'SWEEPER_RISK_REPLAY',
    'LAOLIANG_MARKET_STALL', 'ZHOU_BROKER_NEGOTIATION', 'ZHENG_BIKE_REPAIR', 'PHONE_FLIP',
  ]),
  choiceKeys: z.array(z.string().min(1).max(96)).max(12),
  outcomeCode: z.string().max(96).nullable(),
  cashDelta: z.number().finite().nullable(),
  score: z.number().finite().nullable(),
});

const npcActivityMemoryEntrySchema = z.object({
  completedRuns: z.number().int().nonnegative(),
  lastCompletedDay: z.number().int().positive().nullable(),
  lastTrace: npcActivityMemoryTraceSchema.nullable().default(null),
  recentTraces: z.array(npcActivityMemoryTraceSchema).max(npcMemoryTraceLimit).default([]),
});

export const gameStateSchema = z.object({
  day: z.number(),
  scenarioSeed: z.number().int().min(0).max(0xFFFFFFFF).default(4),
  phase: phaseSchema,
  marketTicksThisDay: z.number().int().min(0).max(marketTicksPerDay),
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
  debtCrisisRecoveryDay: z.number().int().positive().nullable().default(null),
  debtNegotiationCompleted: z.boolean(),
  debtInterestGraceWeeksRemaining: z.number().int().min(0).max(1),
  debtRatePlanWeeksRemaining: z.number().int().min(0).max(8),
  debtInstallmentPlan: debtInstallmentSchema.nullable().default(null),
  fame: z.number().int().min(0).max(100),
  streamedToday: z.boolean(),
  gender: z.enum(['MALE', 'FEMALE']).nullable(),
  codename: z.string().trim().min(1).max(12).default('盘城新客'),
  energyMax: z.number(),
  leechLevel: z.number(),
  activeActivity: activitySchema.nullable(),
  marketIntel: marketIntelSchema.nullable(),
  longgeLastConclusion: z.enum(['DISTRIBUTION', 'REAL_CATALYST', 'INSUFFICIENT']).nullable().default(null),
  longgeVisitedToday: z.boolean(),
  chenVisitedToday: z.boolean(),
  chartLessonVisitedToday: z.boolean(),
  riskReplayVisitedToday: z.boolean().default(false),
  brokerContract: brokerageContractSchema.nullable(),
  brokerNegotiationVisitedToday: z.boolean(),
  npcActivityMemory: z.object({
    jiuge: npcActivityMemoryEntrySchema,
    longge: npcActivityMemoryEntrySchema,
    chen: npcActivityMemoryEntrySchema,
    bodhisattva: npcActivityMemoryEntrySchema,
    xiaolian: npcActivityMemoryEntrySchema,
    sujie: npcActivityMemoryEntrySchema,
    zhou: npcActivityMemoryEntrySchema,
    wang: npcActivityMemoryEntrySchema,
    laoliang: npcActivityMemoryEntrySchema,
    sweeper: npcActivityMemoryEntrySchema,
    delivery: npcActivityMemoryEntrySchema,
    zheng: npcActivityMemoryEntrySchema,
    phoneflip: npcActivityMemoryEntrySchema,
  }).default(() => createEmptyNpcActivityMemory()),
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
const versionNineteenGameStateSchema = gameStateSchema.omit({ activeActivity: true })
  .extend({ activeActivity: activitySchemaBeforePhoneFlip.nullable() });
const versionTwentyGameStateSchema = gameStateSchema.omit({ debtCrisisRecoveryDay: true });
const versionTwentyOneGameStateSchema = gameStateSchema.omit({ npcActivityMemory: true, longgeLastConclusion: true });
const versionTwentyTwoGameStateSchema = versionTwentyOneGameStateSchema;
const versionTwentyThreeGameStateSchema = gameStateSchema.omit({ longgeLastConclusion: true });
const versionEighteenGameStateSchema = versionNineteenGameStateSchema.omit({ marketTicksThisDay: true });
const previousGameStateSchema = versionEighteenGameStateSchema.omit({ activeActivity: true, chartLessonVisitedToday: true, brokerContract: true, brokerNegotiationVisitedToday: true })
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
const versionTenGameStateSchema = versionEighteenGameStateSchema.omit({ activeActivity: true, chartLessonVisitedToday: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: activitySchemaBeforeChart.nullable() });
const versionElevenGameStateSchema = versionEighteenGameStateSchema.omit({ activeActivity: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: activitySchemaBeforeCafe.nullable() });
const versionFourteenGameStateSchema = versionEighteenGameStateSchema.omit({ activeActivity: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: activitySchemaBeforeMarketStall.nullable() });
const versionFifteenGameStateSchema = versionEighteenGameStateSchema.omit({ activeActivity: true, brokerContract: true, brokerNegotiationVisitedToday: true })
  .extend({ activeActivity: activitySchemaBeforeBroker.nullable() });
const versionSeventeenGameStateSchema = versionEighteenGameStateSchema.omit({ activeActivity: true })
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
  z.object({ version: z.literal(18), savedAt: z.number(), state: versionEighteenGameStateSchema }),
  z.object({ version: z.literal(19), savedAt: z.number(), state: versionNineteenGameStateSchema }),
  z.object({ version: z.literal(20), savedAt: z.number(), state: versionTwentyGameStateSchema }),
  z.object({ version: z.literal(21), savedAt: z.number(), state: versionTwentyOneGameStateSchema }),
  z.object({ version: z.literal(22), savedAt: z.number(), state: versionTwentyTwoGameStateSchema }),
  z.object({ version: z.literal(23), savedAt: z.number(), state: versionTwentyThreeGameStateSchema }),
  z.object({ version: z.literal(24), savedAt: z.number(), state: gameStateSchema }),
  z.object({ version: z.literal(25), savedAt: z.number(), state: gameStateSchema }),
  z.object({ version: z.literal(26), savedAt: z.number(), state: gameStateSchema }),
  z.object({ version: z.literal(27), savedAt: z.number(), state: gameStateSchema }),
  z.object({ version: z.literal(saveVersion), savedAt: z.number(), state: gameStateSchema }),
]);
