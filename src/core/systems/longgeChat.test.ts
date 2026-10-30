import { describe, expect, it } from 'vitest';
import type { LonggeChatActiveState, LonggeClueChoice, LonggeConclusion, ScriptPhase, StockState } from '../types';
import { chooseLonggeClue, concludeLonggeChat, createLonggeChat } from './longgeChat';

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
