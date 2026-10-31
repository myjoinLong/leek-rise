import { describe, expect, it } from 'vitest';
import type { NpcActivityMemoryTrace } from '../../../core/types';
import { factoryInspectionForDay } from '../../../core/systems/factoryShift';
import { factoryRelationshipDialogue } from './factoryRelationshipDialogue';

function factoryTrace(day: number, targetScore: number): NpcActivityMemoryTrace {
  const choices = [0, 1, 2].map((step) => factoryInspectionForDay(day, step, 5, 4).correctChoice);
  const correctCount = targetScore / 20;
  for (let step = correctCount; step < 3; step += 1) {
    choices[step] = choices[step] === 'PASS' ? 'REWORK' : 'PASS';
  }
  const verifiedScore = choices.reduce((total, choice, step) =>
    total + (choice === factoryInspectionForDay(day, step, 5, 4).correctChoice ? 20 : 0), 0);
  const missedStep = choices.findIndex((choice, step) => choice !== factoryInspectionForDay(day, step, 5, 4).correctChoice);
  return {
    day,
    scenarioVersion: 5,
    scenarioSeed: 4,
    activityId: 'WANG_FACTORY',
    choiceKeys: choices,
    outcomeCode: null,
    cashDelta: 60 + verifiedScore,
    score: verifiedScore,
    ...(missedStep >= 0 ? {
      factoryReturnContext: {
        previousDay: day,
        step: missedStep as 0 | 1 | 2,
        caseTitle: factoryInspectionForDay(day, missedStep, 5, 4).title,
        choice: choices[missedStep]!,
        correctChoice: factoryInspectionForDay(day, missedStep, 5, 4).correctChoice,
        qualityBonusMissed: 20,
      },
    } : {}),
  };
}

describe('factory relationship dialogue', () => {
  it('shows no invented relationship before the player has worked with Wang', () => {
    expect(factoryRelationshipDialogue([])).toBeNull();
  });

  it('recognizes a careful first shift and develops the line after repeated perfect shifts', () => {
    expect(factoryRelationshipDialogue([factoryTrace(4, 60)])).toContain('上回三项都查准了');
    expect(factoryRelationshipDialogue([factoryTrace(4, 60), factoryTrace(5, 60)])).toContain('连续两班');
    expect(factoryRelationshipDialogue([
      factoryTrace(4, 60), factoryTrace(5, 60), factoryTrace(6, 60),
    ])).toContain('承包账里扣');
  });

  it('uses the saved missed-check fact without inventing it for incomplete traces', () => {
    expect(factoryRelationshipDialogue([factoryTrace(4, 40)])).toContain('底薪没有扣');
    expect(factoryRelationshipDialogue([factoryTrace(4, 40)])).toContain('上次漏掉的那项质量奖没拿到');
  });

  it('ignores other NPC histories when building Wang’s relationship beat', () => {
    const otherNpcTrace = { ...factoryTrace(4, 60), activityId: 'WANG_DELIVERY' as const };
    expect(factoryRelationshipDialogue([otherNpcTrace])).toBeNull();
  });
});
