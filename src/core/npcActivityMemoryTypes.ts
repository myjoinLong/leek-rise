import type { BikeRepairReturnContext } from './zhengBikeRepairTypes';
import type { BrokerContractReview } from './brokerNegotiationTypes';
import type { FactoryReturnContext } from './factoryShiftTypes';
import type { PhoneFlipReturnContext } from './phoneFlipTypes';
import type { LaoLiangReturnContext } from './marketStallTypes';
import type { ActiveActivityState } from './types';
import type { NpcId } from './npcCatalog';

export type { NpcId } from './npcCatalog';

export type NpcActivityId = ActiveActivityState['id'];

export interface NpcActivityMemoryTrace {
  day?: number;
  scenarioVersion?: number;
  scenarioSeed?: number;
  scenarioIndex?: number;
  factoryReturnContext?: FactoryReturnContext;
  sujieRegularCustomerName?: string;
  zhengRepairReturnContext?: BikeRepairReturnContext;
  phoneFlipReturnContext?: PhoneFlipReturnContext;
  laoLiangReturnContext?: LaoLiangReturnContext;
  streamScenarioTitle?: string;
  brokerContractReview?: BrokerContractReview;
  activityId: NpcActivityId;
  choiceKeys: string[];
  outcomeCode: string | null;
  cashDelta: number | null;
  score: number | null;
}

export interface NpcActivityMemoryEntry {
  completedRuns: number;
  lastCompletedDay: number | null;
  lastTrace: NpcActivityMemoryTrace | null;
  recentTraces: NpcActivityMemoryTrace[];
}

export type NpcActivityMemory = Record<NpcId, NpcActivityMemoryEntry>;
