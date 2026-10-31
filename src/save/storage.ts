import localForage from 'localforage';
import type { GameState } from '../core/types';
import { gameStateSchema, saveEnvelopeSchema, saveVersion } from './schemas';
import { npcMemoryFromLegacyActivity } from '../core/npcActivityMemory';
import { mergeStockPool } from '../core/state';

const saveStore = localForage.createInstance({
  name: 'leek-rise',
  storeName: 'game_saves',
});
const saveKey = 'current';
const periodicCostDefaults = {
  marketTicksThisDay: 0,
  chartLessonVisitedToday: false,
  weeklyStreamIncome: 0,
  dailyContractFees: 0,
  periodicCostLedger: { interest: 0, rent: 0, membership: 0, equipment: 0, platformShare: 0, deferred: 0, interestGraceApplied: false, rateRestructureApplied: false },
  lastPeriodicSettlementDay: 0,
  debtCrisisStarted: false,
  debtCrisisRecoveryDay: null,
  debtNegotiationCompleted: false,
  debtInterestGraceWeeksRemaining: 0,
  debtRatePlanWeeksRemaining: 0,
  brokerContract: null,
  brokerNegotiationVisitedToday: false,
};

export async function loadSavedGame(): Promise<GameState | null> {
  const stored = await saveStore.getItem<unknown>(saveKey);
  if (stored === null) return null;

  const result = saveEnvelopeSchema.safeParse(stored);
  if (!result.success) throw new Error('The local save is invalid or uses an unsupported version.');
  const stocks = mergeStockPool(result.data.state.stocks, result.data.state.scenarioSeed);
  if (result.data.version === 1) {
    return {
      ...result.data.state,
      stocks,
      activeActivity: null,
      marketIntel: null,
      longgeVisitedToday: false,
      dailyStreamIncome: 0,
      fame: 0,
      streamedToday: false,
      chenVisitedToday: false,
      ...periodicCostDefaults,
    };
  }
  if (result.data.version === 2) {
    return {
      ...result.data.state,
      stocks,
      marketIntel: null,
      longgeVisitedToday: false,
      dailyStreamIncome: 0,
      fame: 0,
      streamedToday: false,
      chenVisitedToday: false,
      ...periodicCostDefaults,
    };
  }
  if (result.data.version === 3) {
    return { ...result.data.state, stocks, dailyStreamIncome: 0, fame: 0, streamedToday: false, chenVisitedToday: false, ...periodicCostDefaults };
  }
  if (result.data.version === 4) return { ...result.data.state, stocks, chenVisitedToday: false, ...periodicCostDefaults };
  if (result.data.version === 5) return { ...result.data.state, stocks, ...periodicCostDefaults };
  if (result.data.version === 6) return {
    ...result.data.state,
    stocks,
    marketTicksThisDay: 0,
    chartLessonVisitedToday: false,
    debtCrisisStarted: false,
    debtNegotiationCompleted: false,
    debtInterestGraceWeeksRemaining: 0,
    periodicCostLedger: { ...result.data.state.periodicCostLedger, interestGraceApplied: false, rateRestructureApplied: false },
    debtRatePlanWeeksRemaining: 0,
    dailyContractFees: 0,
    brokerContract: null,
    brokerNegotiationVisitedToday: false,
  };
  if (result.data.version === 7) return {
    ...result.data.state,
    stocks,
    marketTicksThisDay: 0,
    chartLessonVisitedToday: false,
    debtNegotiationCompleted: false,
    debtInterestGraceWeeksRemaining: 0,
    periodicCostLedger: { ...result.data.state.periodicCostLedger, interestGraceApplied: false, rateRestructureApplied: false },
    debtRatePlanWeeksRemaining: 0,
    dailyContractFees: 0,
    brokerContract: null,
    brokerNegotiationVisitedToday: false,
  };
  if (result.data.version === 8) {
    return {
      ...result.data.state,
      stocks,
      marketTicksThisDay: 0,
      chartLessonVisitedToday: false,
      debtRatePlanWeeksRemaining: 0,
      dailyContractFees: 0,
      periodicCostLedger: { ...result.data.state.periodicCostLedger, rateRestructureApplied: false },
      brokerContract: null,
      brokerNegotiationVisitedToday: false,
    };
  }
  if (result.data.version === 9) return { ...result.data.state, stocks, marketTicksThisDay: 0, chartLessonVisitedToday: false, brokerContract: null, brokerNegotiationVisitedToday: false };
  if (result.data.version === 10) return { ...result.data.state, stocks, marketTicksThisDay: 0, chartLessonVisitedToday: false, brokerContract: null, brokerNegotiationVisitedToday: false };
  if (result.data.version === 11) return { ...result.data.state, stocks, marketTicksThisDay: 0, brokerContract: null, brokerNegotiationVisitedToday: false };
  if (result.data.version === 15) return { ...result.data.state, stocks, marketTicksThisDay: 0, brokerContract: null, brokerNegotiationVisitedToday: false };
  if (result.data.version === 16 || result.data.version === 17 || result.data.version === 18) return { ...result.data.state, stocks, marketTicksThisDay: 0 };
  if (result.data.version === 19) return { ...result.data.state, stocks };
  if (result.data.version === 20) return { ...result.data.state, stocks, debtCrisisRecoveryDay: null };
  if (result.data.version === 21 || result.data.version === 22) {
    return {
      ...result.data.state,
      stocks,
      npcActivityMemory: npcMemoryFromLegacyActivity(result.data.state.activeActivity),
      longgeLastConclusion: result.data.state.activeActivity?.id === 'LONGGE_CHAT'
        && result.data.state.activeActivity.status === 'RESULT'
        ? result.data.state.activeActivity.conclusion
        : null,
    };
  }
  if (result.data.version === 23) {
    const activity = result.data.state.activeActivity;
    return {
      ...result.data.state,
      stocks,
      longgeLastConclusion: activity?.id === 'LONGGE_CHAT' && activity.status === 'RESULT'
        ? activity.conclusion
        : null,
    };
  }
  if (result.data.version === 12 || result.data.version === 13 || result.data.version === 14) {
    return { ...result.data.state, stocks, marketTicksThisDay: 0, brokerContract: null, brokerNegotiationVisitedToday: false };
  }
  return { ...result.data.state, stocks };
}

export async function saveGame(state: GameState): Promise<void> {
  const parsedState = gameStateSchema.parse(state);
  await saveStore.setItem(saveKey, {
    version: saveVersion,
    savedAt: Date.now(),
    state: parsedState,
  });
}
