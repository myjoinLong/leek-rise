import { describe, expect, it } from 'vitest';
import { gameReducer } from '../reducer';
import { createInitialState } from '../state';
import type { GameState, LonggeChatActiveState, LonggeClueChoice, LonggeConclusion, ScriptPhase, StockState } from '../types';
import { chooseLonggeClue, chooseLonggeOpening, concludeLonggeChat, createLonggeChat } from './longgeChat';
import { longgeLegacyScenarioIndex, longgeScenarioForRun, longgeScenarioIndex, longgeScenarioAt, longgeScenarioAtV3 } from './longgeChatScenarios';

const stock: StockState = {
  id: 'longge-test-stock',
  name: '示例股票',
  price: 10,
  open: 10,
  high: 10,
  low: 10,
  volume: 0,
  priceHistory: [10],
  bids: [],
  asks: [],
  recentTrades: [],
  scriptPhase: 'ACCUMULATE',
  phaseProgress: 0,
};

const reliableClues: LonggeClueChoice[] = ['VERIFY_ORIGIN', 'READ_TAPE', 'CHECK_NOTICE'];
const weakClues: LonggeClueChoice[] = ['FOLLOW_REPOST', 'WATCH_PRICE', 'ASK_GROUP'];
const phases: readonly ScriptPhase[] = ['ACCUMULATE', 'PUMP', 'DISTRIBUTE', 'DUMP'];
const conclusions: readonly LonggeConclusion[] = ['DISTRIBUTION', 'REAL_CATALYST', 'INSUFFICIENT'];
const caseByPhase: Record<ScriptPhase, LonggeChatActiveState['caseType']> = {
  ACCUMULATE: 'ACCUMULATION',
  PUMP: 'CATALYST',
  DISTRIBUTE: 'DISTRIBUTION',
  DUMP: 'DISTRIBUTION',
};

function completedRun(phase: ScriptPhase, clues = reliableClues): LonggeChatActiveState {
  return { ...createLonggeChat(4, phase), step: 3, clues };
}

describe('Longge chat investigation', () => {
  it('maps market phases to the corresponding investigation case', () => {
    expect(createLonggeChat(4, 'ACCUMULATE').caseType).toBe('ACCUMULATION');
    expect(createLonggeChat(4, 'PUMP').caseType).toBe('CATALYST');
    expect(createLonggeChat(4, 'DISTRIBUTE').caseType).toBe('DISTRIBUTION');
    expect(createLonggeChat(4, 'DUMP').caseType).toBe('DISTRIBUTION');
  });

  it('creates ten thousand distinct, reproducible daily rumor combinations', () => {
    const firstSequence = Array.from({ length: 10_000 }, (_, index) => createLonggeChat(index + 1, 'PUMP', 47));
    const replaySequence = Array.from({ length: 10_000 }, (_, index) => createLonggeChat(index + 1, 'PUMP', 47));
    const alternateSequence = Array.from({ length: 30 }, (_, index) => createLonggeChat(index + 1, 'PUMP', 48));
    const signatures = firstSequence.map((run) => {
      const scenario = longgeScenarioForRun(run);
      return [scenario?.title, scenario?.record, scenario?.tape, scenario?.groupMessage, scenario?.tapeMessage, scenario?.noticeMessage].join('|');
    });

    expect(new Set(signatures).size).toBe(10_000);
    expect(firstSequence.map((run) => run.scenarioIndex)).toEqual(replaySequence.map((run) => run.scenarioIndex));
    expect(firstSequence.map((run) => run.scenarioIndex)).not.toEqual(alternateSequence.map((run) => run.scenarioIndex));
    expect(firstSequence.every((run, index) => run.scenarioIndex === longgeScenarioIndex(index + 1, 47))).toBe(true);
    expect(new Set(firstSequence.map((run) => run.scenarioIndex)).size).toBe(10_000);
    expect(createLonggeChat(1, 'PUMP', 47).scenarioVersion).toBe(3);
  });

  it('uses every authored axis in a unique visible event combination', () => {
    const signatures = Array.from({ length: 12_960 }, (_, index) => {
      const scenario = longgeScenarioAtV3(index, 'CATALYST');
      return [scenario.title, scenario.record, scenario.tape, scenario.groupMessage, scenario.tapeMessage, scenario.noticeMessage, scenario.npcReply].join('|');
    });

    expect(new Set(signatures).size).toBe(12_960);
  });

  it('keeps version 2 content and the original permutation readable', () => {
    const legacyIndex = longgeLegacyScenarioIndex(12, 812);
    const expectedScenario = longgeScenarioAt(legacyIndex, 'DISTRIBUTION');
    const restoredRun = {
      ...createLonggeChat(12, 'DUMP', 812),
      scenarioVersion: 2 as const,
      scenarioIndex: legacyIndex,
    };

    expect(longgeScenarioForRun(restoredRun)).toEqual(expectedScenario);
  });

  it('lets Longge remember the prior judgment without carrying it into the new case verdict', () => {
    const priorChoices = ['DISTRIBUTION', 'REAL_CATALYST', 'INSUFFICIENT'] as const;
    const labels = ['有人借利好出货', '公告是真实催化', '证据暂时不足'] as const;
    const current = createLonggeChat(31, 'ACCUMULATE', 47);
    const currentScenario = longgeScenarioForRun(current);

    priorChoices.forEach((priorConclusion, index) => {
      const rememberedRun = createLonggeChat(31, 'ACCUMULATE', 47, priorConclusion);
      const rememberedScenario = longgeScenarioForRun(rememberedRun);
      expect(rememberedRun.caseType).toBe(current.caseType);
      expect(rememberedScenario?.groupMessage).toBe(currentScenario?.groupMessage);
      expect(rememberedScenario?.tapeMessage).toBe(currentScenario?.tapeMessage);
      expect(rememberedScenario?.npcReply).toContain(labels[index]);
    });
  });

  it('copies persistent Longge memory into a new investigation snapshot', () => {
    const base = createInitialState(812);
    const initial: GameState = {
      ...base,
      phase: 'DAYTIME' as const,
      longgeLastConclusion: 'REAL_CATALYST' as const,
      npcActivityMemory: {
        ...base.npcActivityMemory,
        longge: {
          ...base.npcActivityMemory.longge,
          lastTrace: {
            day: 8, activityId: 'LONGGE_CHAT', choiceKeys: ['OPENING_KEEP_PRIVATE'],
            outcomeCode: 'REAL_CATALYST', cashDelta: null, score: 1,
          },
        },
      },
    };
    const started = gameReducer(initial, { type: 'START_LONGGE_CHAT' });

    expect(started.activeActivity).toMatchObject({ id: 'LONGGE_CHAT', priorConclusion: 'REAL_CATALYST', priorOpeningChoice: 'KEEP_PRIVATE' });
    if (started.activeActivity?.id !== 'LONGGE_CHAT' || started.activeActivity.status !== 'ACTIVE') throw new Error('Longge activity did not start.');
    expect(longgeScenarioForRun(started.activeActivity)?.npcReply).toContain('上回你先把核查留在了私聊里');
    const opened = chooseLonggeOpening(started.activeActivity, 'POST_CORRECTION');
    expect(chooseLonggeClue(opened!, 'CHECK_PRIVATE_CHAIN')?.step).toBe(1);
    expect(chooseLonggeClue(opened!, 'VERIFY_ORIGIN')).toBeNull();
    const next = chooseLonggeClue(opened!, 'CHECK_PRIVATE_CHAIN')!;
    const withTape = chooseLonggeClue(next, 'READ_TAPE')!;
    const complete = chooseLonggeClue(withTape, 'CHECK_NOTICE')!;
    expect(concludeLonggeChat(complete, stock, 'INSUFFICIENT')).toMatchObject({
      priorOpeningChoice: 'KEEP_PRIVATE', clues: ['CHECK_PRIVATE_CHAIN', 'READ_TAPE', 'CHECK_NOTICE'],
      intel: { confidence: 'HIGH' },
    });
  });

  it('requires and persists the player response to Longge recalling a prior conclusion', () => {
    let state: GameState = {
      ...createInitialState(812),
      phase: 'DAYTIME' as const,
      longgeLastConclusion: 'DISTRIBUTION' as const,
    };
    state = gameReducer(state, { type: 'START_LONGGE_CHAT' });
    const startedRun = state.activeActivity;
    if (startedRun?.id !== 'LONGGE_CHAT' || startedRun.status !== 'ACTIVE') throw new Error('Longge activity did not start.');
    expect(chooseLonggeClue(startedRun, 'VERIFY_ORIGIN')).toBeNull();
    state = gameReducer(state, { type: 'CHOOSE_LONGGE_OPENING', choice: 'POST_CORRECTION' });
    expect(state.activeActivity).toMatchObject({ openingChoice: 'POST_CORRECTION', step: 0, clues: [] });

    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'VERIFY_ORIGIN' });
    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'READ_TAPE' });
    state = gameReducer(state, { type: 'CHOOSE_LONGGE_CLUE', choice: 'CHECK_NOTICE' });
    state = gameReducer(state, { type: 'CONCLUDE_LONGGE_CHAT', conclusion: 'INSUFFICIENT' });

    expect(state.activeActivity).toMatchObject({ status: 'RESULT', openingChoice: 'POST_CORRECTION' });
    expect(state.npcActivityMemory.longge.lastTrace?.choiceKeys).toContain('OPENING_POST_CORRECTION');
  });

  it('only accepts one opening response before the first clue', () => {
    const run = createLonggeChat(31, 'ACCUMULATE', 47, 'INSUFFICIENT');
    const chosen = chooseLonggeOpening(run, 'KEEP_PRIVATE');

    expect(chosen?.openingChoice).toBe('KEEP_PRIVATE');
    expect(chooseLonggeOpening(chosen!, 'POST_CORRECTION')).toBeNull();
    expect(chooseLonggeOpening({ ...run, step: 1 }, 'POST_CORRECTION')).toBeNull();
  });

  it('persists the selected rumor scenario through clue resolution and feedback', () => {
    const run = createLonggeChat(12, 'DUMP', 812);
    const expectedScenario = longgeScenarioForRun(run);
    const result = concludeLonggeChat({ ...run, step: 3, clues: reliableClues }, stock, 'DISTRIBUTION');

    expect(result).toMatchObject({
      scenarioVersion: 3,
      scenarioSeed: 812,
      scenarioIndex: run.scenarioIndex,
      intel: { message: expect.stringContaining(expectedScenario?.title ?? '') },
    });
  });

  it('only accepts clues offered at the current investigation step', () => {
    const run = createLonggeChat(4, 'ACCUMULATE');
    expect(chooseLonggeClue(run, 'READ_TAPE')).toBeNull();
    expect(chooseLonggeClue(run, 'VERIFY_ORIGIN')?.step).toBe(1);
  });

  it('keeps ambiguous accumulation evidence neutral even when each source is verified', () => {
    const result = concludeLonggeChat(completedRun('ACCUMULATE'), stock, 'INSUFFICIENT');
    expect(result).toMatchObject({
      correct: true,
      intel: { confidence: 'HIGH', bias: 'UNCERTAIN', day: 4, stockId: stock.id },
    });
  });

  it('turns verified catalyst and distribution evidence into distinct, scoped intelligence', () => {
    const catalyst = concludeLonggeChat(completedRun('PUMP'), stock, 'REAL_CATALYST');
    const distribution = concludeLonggeChat(completedRun('DUMP'), stock, 'DISTRIBUTION');
    expect(catalyst?.intel).toMatchObject({ confidence: 'HIGH', bias: 'OPPORTUNITY' });
    expect(distribution?.intel).toMatchObject({ confidence: 'HIGH', bias: 'CAUTION' });
    expect(catalyst?.intel.stockId).toBe(stock.id);
    expect(distribution?.intel.day).toBe(4);
  });

  it('scores every conclusion consistently across all market cases and evidence combinations', () => {
    for (const phase of phases) {
      const caseType = caseByPhase[phase];
      const expectedConclusion = caseType === 'ACCUMULATION'
        ? 'INSUFFICIENT'
        : caseType === 'CATALYST' ? 'REAL_CATALYST' : 'DISTRIBUTION';

      for (let evidenceMask = 0; evidenceMask < 8; evidenceMask += 1) {
        const clues = reliableClues.map((clue, index) =>
          evidenceMask & (1 << index) ? clue : weakClues[index]!,
        );
        const reliableCount = clues.filter((clue) => reliableClues.includes(clue)).length;
        const run = completedRun(phase, clues);

        for (const conclusion of conclusions) {
          const result = concludeLonggeChat(run, stock, conclusion);
          const supported = conclusion === expectedConclusion;
          const expectedCorrect = supported || (conclusion === 'INSUFFICIENT' && reliableCount < 2);
          const confidence = caseType === 'ACCUMULATION'
            ? reliableCount >= 2 ? 'HIGH' : 'LOW'
            : supported ? reliableCount >= 2 ? 'HIGH' : 'LOW' : 'UNCERTAIN';
          const bias = confidence === 'UNCERTAIN' || caseType === 'ACCUMULATION'
            ? 'UNCERTAIN'
            : caseType === 'DISTRIBUTION' ? 'CAUTION' : 'OPPORTUNITY';

          expect(result).toMatchObject({
            correct: expectedCorrect,
            caseType,
            conclusion,
            intel: { confidence, bias, day: 4, stockId: stock.id },
          });
        }
      }
    }
  });

  it('does not produce a result before all clues are collected or without a selected stock', () => {
    expect(concludeLonggeChat(createLonggeChat(4, 'PUMP'), stock, 'REAL_CATALYST')).toBeNull();
    expect(concludeLonggeChat(completedRun('PUMP'), undefined, 'REAL_CATALYST')).toBeNull();
  });
});
