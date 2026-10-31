import { describe, expect, it } from 'vitest';
import { activitySchema } from './activitySchemas';

const activeRun = {
  id: 'LONGGE_CHAT',
  day: 12,
  caseType: 'DISTRIBUTION',
  status: 'ACTIVE',
  step: 0,
  clues: [],
};

describe('Longge activity scenario schema', () => {
  it('accepts the full v3 scenario range and the saved v2 range', () => {
    expect(activitySchema.safeParse({ ...activeRun, scenarioVersion: 3, scenarioSeed: 812, scenarioIndex: 12959, priorConclusion: 'INSUFFICIENT' }).success).toBe(true);
    expect(activitySchema.safeParse({ ...activeRun, scenarioVersion: 3, scenarioSeed: 812, scenarioIndex: 12959, priorConclusion: 'INSUFFICIENT', openingChoice: 'POST_CORRECTION' }).success).toBe(true);
    expect(activitySchema.safeParse({ ...activeRun, scenarioVersion: 3, scenarioSeed: 812, scenarioIndex: 12959, priorConclusion: 'INSUFFICIENT', priorOpeningChoice: 'KEEP_PRIVATE' }).success).toBe(true);
    expect(activitySchema.safeParse({ ...activeRun, scenarioVersion: 2, scenarioSeed: 812, scenarioIndex: 29 }).success).toBe(true);
  });

  it('rejects v2 indices that would not exist in the saved legacy deck', () => {
    expect(activitySchema.safeParse({ ...activeRun, scenarioVersion: 2, scenarioSeed: 812, scenarioIndex: 30 }).success).toBe(false);
  });

  it('restores the opening response in an in-progress and completed investigation', () => {
    const result = {
      id: 'LONGGE_CHAT', day: 12, caseType: 'DISTRIBUTION', scenarioVersion: 3,
      scenarioSeed: 812, scenarioIndex: 12959, priorConclusion: 'INSUFFICIENT',
      openingChoice: 'KEEP_PRIVATE', status: 'RESULT',
      priorOpeningChoice: 'KEEP_PRIVATE',
      clues: ['CHECK_PRIVATE_CHAIN', 'READ_TAPE', 'CHECK_NOTICE'],
      conclusion: 'DISTRIBUTION', correct: true,
      intel: { day: 12, stockId: 'test-stock', confidence: 'HIGH', bias: 'CAUTION', message: '复核消息' },
    };

    expect(activitySchema.safeParse({ ...activeRun, scenarioVersion: 3, scenarioSeed: 812, scenarioIndex: 12959, priorConclusion: 'INSUFFICIENT', openingChoice: 'KEEP_PRIVATE' }).success).toBe(true);
    expect(activitySchema.safeParse(result).success).toBe(true);
  });
});
