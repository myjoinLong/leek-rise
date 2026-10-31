import { describe, expect, it } from 'vitest';
import { concludeLonggeChat, createLonggeChat } from '../../../core/systems/longgeChat';
import { longgeLegacyScenarioIndex, longgeScenarioForRun } from '../../../core/systems/longgeChatScenarios';
import type { LonggeChatActiveState, LonggeClueChoice, StockState } from '../../../core/types';
import { renderLonggeResult, renderLonggeStep } from './LonggeChatContent';

const stock: StockState = {
  id: 'longge-ui-test-stock', name: '示例股票', price: 10, open: 10, high: 10, low: 10,
  volume: 0, priceHistory: [10], bids: [], asks: [], recentTrades: [],
  scriptPhase: 'DUMP', phaseProgress: 0,
};

const choices: readonly LonggeClueChoice[] = [
  'VERIFY_ORIGIN', 'FOLLOW_REPOST', 'READ_TAPE', 'WATCH_PRICE', 'CHECK_NOTICE', 'ASK_GROUP',
];

const precedingChoices: Partial<Record<LonggeClueChoice, LonggeClueChoice[]>> = {
  VERIFY_ORIGIN: [],
  FOLLOW_REPOST: [],
  READ_TAPE: ['VERIFY_ORIGIN'],
  WATCH_PRICE: ['VERIFY_ORIGIN'],
  CHECK_NOTICE: ['VERIFY_ORIGIN', 'READ_TAPE'],
  ASK_GROUP: ['VERIFY_ORIGIN', 'READ_TAPE'],
};

function runAfter(choice: LonggeClueChoice): LonggeChatActiveState {
  const clues = [...(precedingChoices[choice] ?? []), choice];
  return {
    ...createLonggeChat(4, 'DUMP', 47),
    step: clues.length as LonggeChatActiveState['step'],
    clues,
  };
}

function renderedReaction(run: LonggeChatActiveState): string {
  const html = run.step === 3
    ? renderLonggeResult(concludeLonggeChat(run, stock, 'DISTRIBUTION')!)
    : renderLonggeStep(run);
  return html.match(/<p><strong>龙哥[^<]*<\/strong><br>(.*?)<\/p><\/aside>/)?.[1] ?? '';
}

describe('Longge character reactions', () => {
  it('responds to the clue the player actually selected', () => {
    const reactions = choices.map((choice) => renderedReaction(runAfter(choice)));

    expect(reactions.every((reaction) => reaction.length > 0)).toBe(true);
    expect(new Set(reactions).size).toBe(choices.length);
    expect(reactions[0]).toContain('这张图的');
    expect(reactions[1]).toContain('绕了几手');
    expect(reactions[2]).toContain('卖盘连续');
    expect(reactions[3]).toContain('不能只看一边');
    expect(reactions[4]).toContain('公开栏没公告');
    expect(reactions[5]).toContain('我来问原帖');
  });

  it('personalizes current evidence while remembering, but not judging, the prior conclusion', () => {
    const run = createLonggeChat(31, 'ACCUMULATE', 47, 'DISTRIBUTION');
    const scenario = longgeScenarioForRun(run);
    const html = renderLonggeStep(run);

    expect(html).toContain('你上回判断「有人借利好出货」');
    expect(html).toContain(scenario?.title ?? '');
    expect(html).not.toContain('这回你判断错了');
  });

  it('shows a saved two-way response before continuing the remembered case', () => {
    const run = createLonggeChat(31, 'ACCUMULATE', 47, 'DISTRIBUTION');
    const openingHtml = renderLonggeStep(run);
    const continuedHtml = renderLonggeStep({ ...run, openingChoice: 'POST_CORRECTION' });

    expect(openingHtml).toContain('data-opening-choice="POST_CORRECTION"');
    expect(openingHtml).toContain('data-opening-choice="KEEP_PRIVATE"');
    expect(openingHtml).not.toContain('data-choice="VERIFY_ORIGIN"');
    expect(continuedHtml).toContain('把上回那条更正发回群里');
    expect(continuedHtml).toContain('data-choice="VERIFY_ORIGIN"');
  });

  it('changes the first investigation action according to the previous opening choice', () => {
    const shared = createLonggeChat(31, 'ACCUMULATE', 47, 'DISTRIBUTION');
    const publicCorrection = renderLonggeStep({ ...shared, openingChoice: 'KEEP_PRIVATE', priorOpeningChoice: 'POST_CORRECTION' });
    const privateCheck = renderLonggeStep({ ...shared, openingChoice: 'POST_CORRECTION', priorOpeningChoice: 'KEEP_PRIVATE' });

    expect(publicCorrection).toContain('data-choice="CHECK_GROUP_REPLY"');
    expect(publicCorrection).not.toContain('data-choice="VERIFY_ORIGIN"');
    expect(privateCheck).toContain('data-choice="CHECK_PRIVATE_CHAIN"');
    expect(privateCheck).not.toContain('data-choice="VERIFY_ORIGIN"');
  });

  it('keeps the saved response for legacy v2 investigations', () => {
    const run = {
      ...createLonggeChat(12, 'DUMP', 812),
      scenarioVersion: 2 as const,
      scenarioIndex: longgeLegacyScenarioIndex(12, 812),
      step: 1 as const,
      clues: ['VERIFY_ORIGIN'] as LonggeClueChoice[],
    };
    const scenario = longgeScenarioForRun(run);

    expect(renderLonggeStep(run)).toContain(scenario?.npcReply ?? '');
  });
});
