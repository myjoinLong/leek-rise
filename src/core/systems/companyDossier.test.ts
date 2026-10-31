import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import { createCompanyDossier } from './companyDossier';
import { companyDossierScenarioAt, companyDossierScenarioIndex } from './companyDossierScenarios';
import type { GameState } from '../types';

function startDossier(overrides: Partial<GameState> = {}): GameState {
  return gameReducer(
    { ...createInitialState(), phase: 'DAYTIME', ...overrides },
    { type: 'START_CHEN_DOSSIER' },
  );
}

describe('Chen company dossier', () => {
  it('aligns the investigation case with the live market script', () => {
    const stock = createInitialState().stocks.dragon;
    if (!stock) throw new Error('Initial stock is missing.');

    expect(createCompanyDossier(1, { ...stock, scriptPhase: 'ACCUMULATE' }).caseType).toBe('NO_CATALYST');
    expect(createCompanyDossier(1, { ...stock, scriptPhase: 'PUMP' }).caseType).toBe('REAL_CONTRACT');
    expect(createCompanyDossier(1, { ...stock, scriptPhase: 'DUMP' }).caseType).toBe('INFLATED_ORDER');
  });

  it('creates a reproducible, non-repeating first chapter of daily dossier scenarios', () => {
    const seed = 47;
    const firstSequence = Array.from({ length: 32 }, (_, index) => companyDossierScenarioIndex(index + 1, seed));
    const replaySequence = Array.from({ length: 32 }, (_, index) => companyDossierScenarioIndex(index + 1, seed));
    const otherSeedSequence = Array.from({ length: 32 }, (_, index) => companyDossierScenarioIndex(index + 1, seed + 1));
    expect(replaySequence).toEqual(firstSequence);
    expect(otherSeedSequence).not.toEqual(firstSequence);

    const signatures = new Set<string>();
    for (let day = 1; day <= 16_200; day += 1) {
      const index = companyDossierScenarioIndex(day, seed);
      const scenario = companyDossierScenarioAt(index, 'REAL_CONTRACT');
      const signature = JSON.stringify([scenario.headline, scenario.brief, scenario.recordNotes]);
      expect(signatures.has(signature)).toBe(false);
      signatures.add(signature);
    }
    expect(signatures.size).toBe(16_200);
  });

  it('keeps the market script as the source of truth while attaching scenario context', () => {
    const initial = createInitialState();
    const stock = initial.stocks.dragon;
    if (!stock) throw new Error('Initial stock is missing.');

    const active = createCompanyDossier(12, stock, 99);
    expect(active).toMatchObject({
      caseType: 'NO_CATALYST',
      scenarioVersion: 2,
      scenarioSeed: 99,
      scenarioIndex: companyDossierScenarioIndex(12, 99),
    });
    expect(createCompanyDossier(12, { ...stock, scriptPhase: 'PUMP' }, 99).caseType).toBe('REAL_CONTRACT');
  });

  it.each(['BUY', 'AVOID', 'WAIT'] as const)('carries the previous %s conclusion into a new dossier without changing the case', (conclusion) => {
    const initial = createInitialState();
    const stock = initial.stocks.dragon;
    if (!stock) throw new Error('Initial stock is missing.');
    const priorReview = { previousDay: 3, conclusion };
    const regular = createCompanyDossier(5, stock, initial.scenarioSeed);
    const remembered = createCompanyDossier(5, stock, initial.scenarioSeed, priorReview);
    expect(remembered.priorReview).toEqual(priorReview);
    expect(remembered).toMatchObject({
      day: regular.day,
      stockId: regular.stockId,
      caseType: regular.caseType,
      scenarioIndex: regular.scenarioIndex,
    });
  });

  it('uses the previous conclusion only as saved dialogue context and ignores incomplete history', () => {
    const initial = createInitialState();
    const memory = initial.npcActivityMemory.chen;
    const previousTrace = {
      day: 2,
      activityId: 'CHEN_DOSSIER' as const,
      choiceKeys: ['VERIFY_FILING', 'CHECK_SUPPLIER', 'MATCH_INVOICES'],
      outcomeCode: 'AVOID',
      cashDelta: null,
      score: 3,
    };
    const state = startDossier({
      day: 4,
      npcActivityMemory: {
        ...initial.npcActivityMemory,
        chen: { ...memory, lastTrace: previousTrace },
      },
    });
    expect(state.activeActivity).toMatchObject({ priorReview: { previousDay: 2, conclusion: 'AVOID' }, openingFlowVersion: 1 });

    const noDate = startDossier({
      day: 4,
      npcActivityMemory: {
        ...initial.npcActivityMemory,
        chen: { ...memory, lastTrace: { ...previousTrace, day: undefined } },
      },
    });
    expect(noDate.activeActivity?.id === 'CHEN_DOSSIER' && noDate.activeActivity.priorReview).toBeUndefined();
  });

  it.each(['APPEND_REVISION', 'KEEP_SEPARATE'] as const)('records Chen follow-up choice %s without changing today’s evidence or intel', (choice) => {
    const initial = createInitialState();
    const memory = initial.npcActivityMemory.chen;
    const priorTrace = {
      day: 2,
      activityId: 'CHEN_DOSSIER' as const,
      choiceKeys: ['VERIFY_FILING', 'CHECK_SUPPLIER', 'MATCH_INVOICES'],
      outcomeCode: 'WAIT',
      cashDelta: null,
      score: 3,
    };
    let state = startDossier({
      day: 4,
      energy: 18,
      npcActivityMemory: { ...initial.npcActivityMemory, chen: { ...memory, lastTrace: priorTrace } },
    });
    if (state.activeActivity?.id !== 'CHEN_DOSSIER') throw new Error('Dossier did not start.');
    const startingCash = state.cash;
    expect(gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' })).toBe(state);
    state = gameReducer(state, { type: 'CHOOSE_CHEN_OPENING', choice });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'CHECK_SUPPLIER' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'MATCH_INVOICES' });
    state = gameReducer(state, { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: 'WAIT' });

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', openingChoice: choice, conclusion: 'WAIT' });
    expect(state.activeActivity?.id === 'CHEN_DOSSIER' && state.activeActivity.evidence).toHaveLength(3);
    expect(state.cash).toBe(startingCash);
    expect(state.marketIntel?.confidence).toBe('HIGH');
    expect(state.npcActivityMemory.chen.lastTrace?.choiceKeys).toContain(`CHEN_OPENING_${choice}`);
  });

  it('uses verified records to produce high-confidence market information without changing cash', () => {
    const initial = { ...createInitialState(), phase: 'DAYTIME' as const, energy: 18 };
    let state = gameReducer(initial, { type: 'START_CHEN_DOSSIER' });
    if (state.activeActivity?.id !== 'CHEN_DOSSIER') throw new Error('Dossier did not start.');
    const expectedDecision = state.activeActivity.caseType === 'REAL_CONTRACT'
      ? 'BUY'
      : state.activeActivity.caseType === 'INFLATED_ORDER' ? 'AVOID' : 'WAIT';

    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'CHECK_SUPPLIER' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'MATCH_INVOICES' });
    state = gameReducer(state, { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: expectedDecision });

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', correct: true, reliableCount: 3 });
    expect(state.marketIntel).toMatchObject({ npcName: '陈总', confidence: 'HIGH' });
    expect(state.marketIntel?.message.match(/你选择暂缓入场。/g)).toHaveLength(1);
    expect(state.energy).toBe(0);
    expect(state.cash).toBe(initial.cash);
  });

  it('keeps source findings distinct and marks conflicting evidence as low-confidence', () => {
    const initial = createInitialState();
    const stock = initial.stocks.dragon;
    if (!stock) throw new Error('Initial stock is missing.');
    let state = startDossier({
      energy: 18,
      stocks: { ...initial.stocks, dragon: { ...stock, scriptPhase: 'DUMP' } },
    });

    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'CHECK_SUPPLIER' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'MATCH_INVOICES' });

    expect(state.activeActivity).toMatchObject({
      id: 'CHEN_DOSSIER',
      status: 'ACTIVE',
      evidence: [
        { choice: 'VERIFY_FILING', finding: 'HYPE' },
        { choice: 'CHECK_SUPPLIER', finding: 'CONTRACT' },
        { choice: 'MATCH_INVOICES', finding: 'HYPE' },
      ],
    });

    state = gameReducer(state, { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: 'AVOID' });
    expect(state.activeActivity).toMatchObject({
      status: 'RESULT',
      correct: true,
      reliableCount: 3,
      intel: {
        confidence: 'LOW',
        bias: 'CAUTION',
        message: expect.stringContaining('材料存在冲突'),
      },
    });
  });

  it('recommends waiting when only one source has been reliably checked', () => {
    const initial = createInitialState();
    const stock = initial.stocks.dragon;
    if (!stock) throw new Error('Initial stock is missing.');
    let state = startDossier({
      energy: 8,
      stocks: { ...initial.stocks, dragon: { ...stock, scriptPhase: 'DUMP' } },
    });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'ASK_SALES' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'READ_FORECAST' });

    const wait = gameReducer(state, { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: 'WAIT' });
    const avoid = gameReducer(state, { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: 'AVOID' });
    expect(wait.activeActivity).toMatchObject({
      status: 'RESULT',
      correct: true,
      reliableCount: 1,
      intel: { confidence: 'LOW', bias: 'UNCERTAIN' },
    });
    expect(avoid.activeActivity).toMatchObject({ status: 'RESULT', correct: false });
  });

  it('makes quick browsing cheap but leaves the resulting information uncertain', () => {
    let state = startDossier({ energy: 3 });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'SKIM_PITCH' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'ASK_SALES' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'READ_FORECAST' });
    state = gameReducer(state, { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: 'WAIT' });

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', conclusion: 'WAIT', reliableCount: 0 });
    expect(state.marketIntel).toMatchObject({ confidence: 'UNCERTAIN', bias: 'UNCERTAIN' });
    expect(state.energy).toBe(0);
  });

  it('rejects out-of-order evidence, insufficient energy, repeated visits, and phase changes mid-run', () => {
    let state = startDossier({ energy: 10 });
    expect(gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'CHECK_SUPPLIER' })).toBe(state);
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' });
    const insufficient = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'CHECK_SUPPLIER' });
    expect(insufficient).toBe(state);

    state = gameReducer(state, { type: 'ABANDON_CHEN_DOSSIER' });
    expect(state.activeActivity).toBeNull();
    expect(gameReducer(state, { type: 'START_CHEN_DOSSIER' })).toBe(state);
    expect(gameReducer({ ...state, phase: 'TRADING' }, { type: 'START_CHEN_DOSSIER' }).activeActivity).toBeNull();
  });
});
