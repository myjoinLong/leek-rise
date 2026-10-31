import { describe, expect, it } from 'vitest';
import { gameReducer } from '../core/reducer';
import { createInitialState } from '../core/state';
import { activitySchema } from './activitySchemas';

describe('Chen dossier scenario save compatibility', () => {
  it('accepts versioned active and result snapshots while preserving legacy runs', () => {
    let state = gameReducer({ ...createInitialState(), phase: 'DAYTIME' }, { type: 'START_CHEN_DOSSIER' });
    const active = state.activeActivity;
    if (!active || active.id !== 'CHEN_DOSSIER') throw new Error('Dossier did not start.');

    expect(activitySchema.safeParse(active).success).toBe(true);
    const remembered = { ...active, priorReview: { previousDay: 1, conclusion: 'AVOID' } };
    expect(activitySchema.safeParse(remembered).success).toBe(true);
    expect(activitySchema.safeParse({ ...remembered, openingFlowVersion: 1, openingChoice: 'APPEND_REVISION' }).success).toBe(true);
    expect(activitySchema.safeParse({ ...remembered, openingFlowVersion: 1, openingChoice: 'INVALID' }).success).toBe(false);
    expect(activitySchema.safeParse({ ...active, priorReview: { previousDay: 0, conclusion: 'AVOID' } }).success).toBe(false);
    const legacyActive = { ...active };
    delete legacyActive.scenarioVersion;
    delete legacyActive.scenarioSeed;
    delete legacyActive.scenarioIndex;
    expect(activitySchema.safeParse(legacyActive).success).toBe(true);
    expect(activitySchema.safeParse({ ...active, scenarioIndex: 16_200 }).success).toBe(false);

    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'VERIFY_FILING' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'CHECK_SUPPLIER' });
    state = gameReducer(state, { type: 'CHOOSE_CHEN_EVIDENCE', choice: 'MATCH_INVOICES' });
    state = gameReducer(state, { type: 'CONCLUDE_CHEN_DOSSIER', conclusion: 'WAIT' });
    expect(state.activeActivity?.id).toBe('CHEN_DOSSIER');
    expect(state.activeActivity?.status).toBe('RESULT');
    expect(activitySchema.safeParse(state.activeActivity).success).toBe(true);
    expect(activitySchema.safeParse({ ...state.activeActivity, priorReview: { previousDay: 1, conclusion: 'AVOID' } }).success).toBe(true);
  });
});
