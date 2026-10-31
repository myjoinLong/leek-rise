import { describe, expect, it } from 'vitest';
import { gameReducer } from '../../../core/reducer';
import { chenReturnPreviewChoiceFor, createChenReturnPreviewState } from './ChenDossierPreview';

describe('Chen return preview fixture', () => {
  it.each([
    ['chen-return-append', 'APPEND_REVISION'],
    ['chen-return-separate', 'KEEP_SEPARATE'],
  ] as const)('creates a reproducible %s cross-day fixture', (scenario, choice) => {
    expect(chenReturnPreviewChoiceFor(scenario)).toBe(choice);
    const previewState = createChenReturnPreviewState(choice);
    expect(previewState).toMatchObject({ day: 5, phase: 'DAYTIME', cash: 3200, debt: 18000 });
    expect(previewState.npcActivityMemory.chen).toMatchObject({
      completedRuns: 1,
      lastCompletedDay: 4,
      lastTrace: { activityId: 'CHEN_DOSSIER', outcomeCode: 'WAIT' },
    });
    expect(previewState.npcActivityMemory.chen.lastTrace?.choiceKeys).toContain(`CHEN_OPENING_${choice}`);

    const started = gameReducer(previewState, { type: 'START_CHEN_DOSSIER' });
    expect(started.activeActivity).toMatchObject({
      id: 'CHEN_DOSSIER',
      priorReview: { previousDay: 4, conclusion: 'WAIT' },
      openingFlowVersion: 1,
    });
  });

  it('does not alter the state for unrelated preview scenarios', () => {
    expect(chenReturnPreviewChoiceFor('chapter-deadline')).toBeNull();
  });
});
