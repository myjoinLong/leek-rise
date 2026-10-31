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
  it('adds the new catalog listings to a v26 save without changing the existing holding', async () => {
    const current = createInitialState(91);
    const dragon = current.stocks.dragon;
    if (!dragon) throw new Error('Expected the original market listing.');
    const { symbol, sector, volatility, ...legacyDragon } = dragon;
    void symbol;
    void sector;
    void volatility;
    const savedDragon = { ...legacyDragon, price: 12.34, holding: { shares: 500, avgCost: 10.25 } };
    mockStore.value = {
      version: 26,
      savedAt: 1,
      state: { ...current, cash: 765.43, stocks: { dragon: savedDragon } },
    };

    const migrated = await loadSavedGame();

    expect(migrated?.cash).toBe(765.43);
    expect(migrated?.stocks.dragon).toMatchObject({ ...savedDragon, symbol: 'PC001', sector: '科技制造', volatility: 1 });
    expect(Object.keys(migrated?.stocks ?? {})).toHaveLength(10);
    expect(migrated?.stocks.harbor?.holding).toBeUndefined();

    await saveGame(migrated!);
    expect(mockStore.value).toMatchObject({ version: 27 });
  });

  it('adds the market clock to v18 saves and preserves current tick progress', async () => {
    const legacyState = { ...createInitialState(), phase: 'TRADING' as const };
    const { marketTicksThisDay, ...versionEighteenState } = legacyState;
    void marketTicksThisDay;
    mockStore.value = { version: 18, savedAt: 1, state: versionEighteenState };

    const migrated = await loadSavedGame();

    expect(migrated).toMatchObject({ phase: 'TRADING', marketTicksThisDay: 0 });
    const progressed = { ...migrated!, marketTicksThisDay: 23 };
    await saveGame(progressed);
    expect(await loadSavedGame()).toEqual(progressed);
  });

  it('preserves v19 market progress and migrates its legacy activity registry to v22', async () => {
    const currentState = { ...createInitialState(), phase: 'TRADING' as const, marketTicksThisDay: 37 };
    const { debtCrisisRecoveryDay, ...previousState } = currentState;
    void debtCrisisRecoveryDay;
    mockStore.value = { version: 19, savedAt: 1, state: previousState };

    const migrated = await loadSavedGame();

    expect(migrated).toEqual({ ...previousState, debtCrisisRecoveryDay: null });
    await saveGame(migrated!);
    expect(mockStore.value).toMatchObject({ version: 27 });

    const { gameReducer } = await import('../core/reducer');
    const phoneState = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_PHONE_FLIP' });
    mockStore.value = { version: 19, savedAt: 2, state: phoneState };
    await expect(loadSavedGame()).rejects.toThrow('The local save is invalid or uses an unsupported version.');
  });

  it('adds crisis recovery history safely to v20 saves and round-trips it afterward', async () => {
    const currentState = { ...createInitialState(), day: 31, phase: 'NIGHT' as const, debtCrisisStarted: false, debtCrisisRecoveryDay: 31 };
    const { debtCrisisRecoveryDay, ...versionTwentyState } = currentState;
    void debtCrisisRecoveryDay;
    mockStore.value = { version: 20, savedAt: 1, state: versionTwentyState };

    const migrated = await loadSavedGame();
    expect(migrated).toEqual({ ...versionTwentyState, debtCrisisRecoveryDay: null });

    await saveGame(currentState);
    expect(mockStore.value).toMatchObject({ version: 27, state: { debtCrisisRecoveryDay: 31 } });
    expect(await loadSavedGame()).toEqual(currentState);
  });

  it('adds a stable campaign seed when loading v21 saves', async () => {
    const { scenarioSeed, ...versionTwentyOneState } = createInitialState(128);
    void scenarioSeed;
    mockStore.value = { version: 21, savedAt: 1, state: versionTwentyOneState };

    const migrated = await loadSavedGame();

    expect(migrated?.scenarioSeed).toBe(4);
    await saveGame(migrated!);
    expect(mockStore.value).toMatchObject({ version: 27, state: { scenarioSeed: 4 } });
  });

  it('migrates a completed v22 activity into persistent NPC memory', async () => {
    const { gameReducer } = await import('../core/reducer');
    const { cafeScenarioFor } = await import('../core/systems/cafeShift');
    let state: GameState = { ...createInitialState(55), phase: 'DAYTIME', energy: 120, energyMax: 120 };
    state = gameReducer(state, { type: 'START_CAFE_SHIFT' });
    for (const step of [0, 1, 2] as const) {
      const scenario = cafeScenarioFor(state.day, step, 3, state.scenarioSeed);
      state = gameReducer(state, { type: 'SERVE_CAFE_ORDER', choice: scenario.correctChoice });
    }
    const { npcActivityMemory, ...versionTwentyTwoState } = state;
    void npcActivityMemory;
    mockStore.value = { version: 22, savedAt: 1, state: versionTwentyTwoState };

    const migrated = await loadSavedGame();

    expect(migrated?.npcActivityMemory.sujie).toMatchObject({
      completedRuns: 1,
      lastCompletedDay: state.day,
      lastTrace: { activityId: 'SUJIE_CAFE_SHIFT', cashDelta: state.dailyWorkIncome, score: 3 },
    });
    expect(migrated?.activeActivity).toMatchObject({ id: 'SUJIE_CAFE_SHIFT', status: 'RESULT' });
    await saveGame(migrated!);
    expect(mockStore.value).toMatchObject({ version: 27 });
    expect(await loadSavedGame()).toEqual(migrated);
  });

  it('migrates a v23 Longge conclusion into persistent character memory', async () => {
    const { gameReducer } = await import('../core/reducer');
    let state: GameState = { ...createInitialState(), phase: 'DAYTIME' };
    state = gameReducer(state, { type: 'START_LONGGE_CHAT' });
    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'VERIFY_ORIGIN' });
    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'READ_TAPE' });
    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'CHECK_NOTICE' });
    state = gameReducer(state, { type: 'CONCLUDE_LONGGE_CHAT', conclusion: 'INSUFFICIENT' });
    const { longgeLastConclusion, ...versionTwentyThreeState } = state;
    void longgeLastConclusion;
    mockStore.value = { version: 23, savedAt: 1, state: versionTwentyThreeState };

    const migrated = await loadSavedGame();

    expect(migrated?.longgeLastConclusion).toBe('INSUFFICIENT');
    expect(migrated?.npcActivityMemory.longge).toMatchObject({
      completedRuns: 1,
      lastCompletedDay: 1,
      lastTrace: { activityId: 'LONGGE_CHAT', outcomeCode: 'INSUFFICIENT' },
    });
    await saveGame(migrated!);
    expect(mockStore.value).toMatchObject({ version: 27, state: { longgeLastConclusion: 'INSUFFICIENT' } });
    expect(await loadSavedGame()).toEqual(migrated);
  });

  it('loads v24 NPC history without inventing a recorded choice', async () => {
    const state = createInitialState();
    const legacyMemory = Object.fromEntries(Object.entries(state.npcActivityMemory).map(([npcId, entry]) => [npcId, {
      completedRuns: entry.completedRuns,
      lastCompletedDay: entry.lastCompletedDay,
    }]));
    mockStore.value = { version: 24, savedAt: 1, state: { ...state, npcActivityMemory: legacyMemory } };

    const restored = await loadSavedGame();

    expect(restored?.npcActivityMemory).toEqual(state.npcActivityMemory);
  });

  it('adds an empty bounded trace history to v25 saves and upgrades them to v26', async () => {
    const state = createInitialState();
    const oldMemory = Object.fromEntries(Object.entries(state.npcActivityMemory).map(([npcId, entry]) => [npcId, {
      completedRuns: entry.completedRuns,
      lastCompletedDay: entry.lastCompletedDay,
      lastTrace: entry.lastTrace,
    }]));
    mockStore.value = { version: 25, savedAt: 1, state: { ...state, npcActivityMemory: oldMemory } };

    const restored = await loadSavedGame();

    expect(restored?.npcActivityMemory.sujie).toEqual({
      completedRuns: 0,
      lastCompletedDay: null,
      lastTrace: null,
      recentTraces: [],
    });
    await saveGame(restored!);
    expect(mockStore.value).toMatchObject({ version: 27 });
    expect(await loadSavedGame()).toEqual(restored);
  });

  it('preserves the unknown date on v25 NPC traces instead of assigning a false day', async () => {
    const state = createInitialState();
    const trace = {
      activityId: 'SUJIE_CAFE_SHIFT' as const,
      choiceKeys: ['LATTE'],
      outcomeCode: null,
      cashDelta: 45,
      score: 2,
    };
    const npcActivityMemory = {
      ...state.npcActivityMemory,
      sujie: { completedRuns: 1, lastCompletedDay: 9, lastTrace: trace, recentTraces: [trace] },
    };
    mockStore.value = { version: 25, savedAt: 1, state: { ...state, npcActivityMemory } };

    const restored = await loadSavedGame();

    expect(restored?.npcActivityMemory.sujie.recentTraces[0]).not.toHaveProperty('day');
    expect(restored?.npcActivityMemory.sujie.lastTrace).not.toHaveProperty('day');
  });

  it('round-trips a returning cafe order snapshot inside an active v26 save', async () => {
    const { gameReducer } = await import('../core/reducer');
    const { cafeScenarioFor } = await import('../core/systems/cafeShift');
    let state: GameState = {
      ...createInitialState(17), day: 8, phase: 'DAYTIME', energy: 120, energyMax: 120,
    };
    state = gameReducer(state, { type: 'START_CAFE_SHIFT' });
    for (const step of [0, 1, 2] as const) {
      const run = state.activeActivity;
      if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Cafe shift did not start.');
      const scenario = cafeScenarioFor(state.day, step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
      state = gameReducer(state, { type: 'SERVE_CAFE_ORDER', choice: scenario.correctChoice });
    }
    state = gameReducer(state, { type: 'RETURN_FROM_ACTIVITY' });
    state = {
      ...state, day: 9, phase: 'DAYTIME', workedToday: false, energy: 120,
      dailyWorkIncome: 0, activeActivity: null,
    };
    state = gameReducer(state, { type: 'START_CAFE_SHIFT' });

    const activeCafe = state.activeActivity;
    if (!activeCafe || activeCafe.id !== 'SUJIE_CAFE_SHIFT' || !activeCafe.returnContext) {
      throw new Error('Returning cafe order snapshot was not created.');
    }
    expect(mockStore.value).toBeNull();
    await saveGame(state);

    expect(mockStore.value).toMatchObject({ version: 27 });
    expect(await loadSavedGame()).toEqual(state);
  });

});
