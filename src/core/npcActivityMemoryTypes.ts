import type { BikeRepairReturnContext } from './zhengBikeRepairTypes';
import type { BrokerContractReview } from './brokerNegotiationTypes';
import type { FactoryReturnContext } from './factoryShiftTypes';
import type { PhoneFlipReturnContext } from './phoneFlipTypes';
import type { LaoLiangReturnContext } from './marketStallTypes';

export type NpcId = 'jiuge' | 'longge' | 'chen' | 'bodhisattva' | 'xiaolian' | 'sujie' | 'zhou' | 'wang' | 'laoliang' | 'sweeper' | 'delivery' | 'zheng' | 'phoneflip';

export type NpcActivityId =
  | 'WANG_DELIVERY' | 'LONGGE_CHAT' | 'XIAOLIAN_STREAM' | 'CHEN_DOSSIER' | 'JIUGE_NEGOTIATION'
  | 'WANG_FACTORY' | 'BODHISATTVA_CHART_LESSON' | 'SUJIE_CAFE_SHIFT' | 'SWEEPER_RISK_REPLAY'
  | 'LAOLIANG_MARKET_STALL' | 'ZHOU_BROKER_NEGOTIATION' | 'ZHENG_BIKE_REPAIR' | 'PHONE_FLIP';

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
