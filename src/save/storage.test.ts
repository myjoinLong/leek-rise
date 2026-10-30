import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../core/state';
import type { GameState } from '../core/types';
import { loadSavedGame, saveGame } from './storage';

const mockStore = vi.hoisted(() => ({ value: null as unknown }));

vi.mock('localforage', () => ({
  default: {
    createInstance: () => ({
      getItem: async () => mockStore.value,
      setItem: async (_key: string, value: unknown) => {
        mockStore.value = value;
        return value;
      },
    }),
  },
}));

beforeEach(() => {
  mockStore.value = null;
});

describe('game save migration', () => {
  it('keeps v17 activities readable while reserving Zheng repair activity for v18', async () => {
    const { gameReducer } = await import('../core/reducer');
    const oldState = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_FACTORY_SHIFT' });
    mockStore.value = { version: 17, savedAt: 1, state: oldState };
    expect(await loadSavedGame()).toEqual(oldState);

    const repairState = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_ZHENG_BIKE_REPAIR' });
    mockStore.value = { version: 17, savedAt: 2, state: repairState };
    await expect(loadSavedGame()).rejects.toThrow('The local save is invalid or uses an unsupported version.');
    mockStore.value = { version: 18, savedAt: 3, state: repairState };
    expect(await loadSavedGame()).toEqual(repairState);
  });

  it('round-trips an in-progress stream activity without losing its decisions', async () => {
    let state = createInitialState();
    state = { ...state, phase: 'DAYTIME', gender: 'FEMALE', energy: 95, energyMax: 100, fame: 30, debtCrisisStarted: true };
    const { gameReducer } = await import('../core/reducer');
    state = gameReducer(state, { type: 'START_STREAM_RUN' });
    state = gameReducer(state, { type: 'CHOOSE_STREAM_OPTION', choice: 'HONEST_REVIEW' });

    await saveGame(state);
    const restored = await loadSavedGame();

    expect(restored).toEqual(state);
    expect(restored?.activeActivity).toMatchObject({
      id: 'XIAOLIAN_STREAM',
      status: 'ACTIVE',
      step: 1,
      decisions: [{ choice: 'HONEST_REVIEW' }],
    });
    expect(restored?.debtCrisisStarted).toBe(true);
  });

  it('round-trips an in-progress Chen dossier with its evidence trail', async () => {
    let state: GameState = { ...createInitialState(), phase: 'DAYTIME', energy: 90 };
    const { gameReducer } = await import('../core/reducer');
    state = gameReducer(state, { type: 'START_CHEN_DOSSIER' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' });

    await saveGame(state);
    const restored = await loadSavedGame();

    expect(restored).toEqual(state);
    expect(restored?.activeActivity).toMatchObject({
      id: 'CHEN_DOSSIER',
      status: 'ACTIVE',
      step: 1,
      evidence: [{ choice: 'VERIFY_FILING', finding: expect.any(String) }],
    });
  });

  it('round-trips an in-progress Jiuge negotiation with its evidence choices', async () => {
    let state: GameState = { ...createInitialState(), day: 30, phase: 'DAYTIME', debtCrisisStarted: true };
    const { gameReducer } = await import('../core/reducer');
    state = gameReducer(state, { type: 'START_JIUGE_NEGOTIATION' });
    state = gameReducer(state, { type: 'CHOOSE_JIUGE_NEGOTIATION', choice: 'SHOW_LEDGER' });

    await saveGame(state);
    const restored = await loadSavedGame();

    expect(restored).toEqual(state);
    expect(restored?.activeActivity).toMatchObject({
      id: 'JIUGE_NEGOTIATION', status: 'ACTIVE', step: 1, decisions: [{ choice: 'SHOW_LEDGER' }],
    });
  });

  it('round-trips an in-progress broker estimate and migrates v15 with no contract', async () => {
    const { gameReducer } = await import('../core/reducer');
    let state: GameState = { ...createInitialState(), phase: 'DAYTIME' };
    state = gameReducer(state, { type: 'START_BROKER_NEGOTIATION' });
    state = gameReducer(state, { type: 'ESTIMATE_BROKER_TURNOVER', turnover: 36000 });
    await saveGame(state);
    expect(await loadSavedGame()).toEqual(state);

    const legacyState: GameState = createInitialState();
    const { brokerContract, brokerNegotiationVisitedToday, ...versionFifteenState } = legacyState;
    void brokerContract;
    void brokerNegotiationVisitedToday;
    mockStore.value = { version: 15, savedAt: 1, state: versionFifteenState };
    const migrated = await loadSavedGame();
    expect(migrated?.brokerContract).toBeNull();
    expect(migrated?.brokerNegotiationVisitedToday).toBe(false);
    expect(migrated?.activeActivity).toBeNull();
  });

  it('adds realized-fee defaults when loading a v16 brokerage contract', async () => {
    const { brokerContract, ...previousState } = createInitialState();
    void brokerContract;
    mockStore.value = {
      version: 16,
      savedAt: 1,
      state: {
        ...previousState,
        brokerContract: { plan: 'LOW_COMMISSION', signedDay: 1, expiresDay: 7, serviceFee: 18 },
      },
    };

    const restored = await loadSavedGame();

    expect(restored?.brokerContract).toMatchObject({
      projectedTurnover: null, actualTurnover: 0, discountedFeesPaid: 0, standardFeesEquivalent: 0,
    });
  });

  it('adds a safe daily investigation default when loading a version four save', async () => {
    const state = createInitialState();
    const { chenVisitedToday, ...versionFourState } = state;
    void chenVisitedToday;
    mockStore.value = { version: 4, savedAt: 1, state: versionFourState };

    const restored = await loadSavedGame();

    expect(restored?.chenVisitedToday).toBe(false);
  });

  it('adds the debt-crisis default when loading a version six save', async () => {
    const state = createInitialState();
    const { debtCrisisStarted, debtNegotiationCompleted, debtInterestGraceWeeksRemaining, ...previousState } = state;
    const { interestGraceApplied, ...periodicCostLedger } = previousState.periodicCostLedger;
    const versionSixState = { ...previousState, periodicCostLedger };
    void debtCrisisStarted;
    void debtNegotiationCompleted;
    void debtInterestGraceWeeksRemaining;
    void interestGraceApplied;
    mockStore.value = { version: 6, savedAt: 1, state: versionSixState };

    const restored = await loadSavedGame();

    expect(restored?.debtCrisisStarted).toBe(false);
  });

  it('preserves a version seven crisis and adds the negotiation defaults', async () => {
    const state = { ...createInitialState(), debtCrisisStarted: true };
    const { debtNegotiationCompleted, debtInterestGraceWeeksRemaining, ...previousState } = state;
    const { interestGraceApplied, ...periodicCostLedger } = previousState.periodicCostLedger;
    const versionSevenState = { ...previousState, periodicCostLedger };
    void debtNegotiationCompleted;
    void debtInterestGraceWeeksRemaining;
    void interestGraceApplied;
    mockStore.value = { version: 7, savedAt: 1, state: versionSevenState };

    const restored = await loadSavedGame();

    expect(restored?.debtCrisisStarted).toBe(true);
    expect(restored?.debtNegotiationCompleted).toBe(false);
    expect(restored?.debtInterestGraceWeeksRemaining).toBe(0);
    expect(restored?.periodicCostLedger.interestGraceApplied).toBe(false);
  });

  it('adds safe defaults when loading a version eight save', async () => {
    const state = createInitialState();
    const { debtRatePlanWeeksRemaining, dailyContractFees, ...versionEightState } = state;
    const { rateRestructureApplied, ...periodicCostLedger } = versionEightState.periodicCostLedger;
    void debtRatePlanWeeksRemaining;
    void dailyContractFees;
    void rateRestructureApplied;
    mockStore.value = { version: 8, savedAt: 1, state: { ...versionEightState, periodicCostLedger } };

    const restored = await loadSavedGame();

    expect(restored?.debtRatePlanWeeksRemaining).toBe(0);
    expect(restored?.dailyContractFees).toBe(0);
    expect(restored?.periodicCostLedger.rateRestructureApplied).toBe(false);
  });

  it('keeps a version nine activity save compatible with the expanded activity registry', async () => {
    const state = createInitialState();
    mockStore.value = { version: 9, savedAt: 1, state };
    expect(await loadSavedGame()).toEqual(state);
  });

  it('migrates version ten saves with a safe chart lesson daily limit', async () => {
    const state = createInitialState();
    const { chartLessonVisitedToday, ...versionTenState } = state;
    void chartLessonVisitedToday;
    mockStore.value = { version: 10, savedAt: 1, state: versionTenState };

    const restored = await loadSavedGame();

    expect(restored?.chartLessonVisitedToday).toBe(false);
  });

  it('preserves version eleven chart activity while adding the cafe activity schema', async () => {
    const state = {
      ...createInitialState(),
      activeActivity: {
        id: 'BODHISATTVA_CHART_LESSON' as const, day: 4, stockId: 'dragon', status: 'ACTIVE' as const,
        step: 1 as const, decisions: [{ step: 0 as const, choice: 'RIDE_HIGHER_LOWS' as const, correct: true }], energySpent: 3,
      },
    };
    mockStore.value = { version: 11, savedAt: 1, state };

    expect(await loadSavedGame()).toEqual(state);
  });

  it('adds safe defaults when loading a version three save', async () => {
    const state = createInitialState();
    const { dailyStreamIncome, fame, streamedToday, chenVisitedToday, ...versionThreeState } = state;
    void dailyStreamIncome;
    void fame;
    void streamedToday;
    void chenVisitedToday;
    mockStore.value = { version: 3, savedAt: 1, state: versionThreeState };

    const restored = await loadSavedGame();

    expect(restored?.dailyStreamIncome).toBe(0);
    expect(restored?.fame).toBe(0);
    expect(restored?.streamedToday).toBe(false);
  });
});
