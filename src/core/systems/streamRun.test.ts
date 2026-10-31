import { describe, expect, it } from 'vitest';
import type { StreamStep } from '../types';
import { streamChoicesForStep } from './streamRun';

describe('stream run option source', () => {
  it.each([
    { step: 0 as StreamStep, choices: ['HONEST_REVIEW', 'HYPE_CLAIM'] },
    { step: 1 as StreamStep, choices: ['ANSWER_QUESTIONS', 'REPEAT_CTA'] },
    { step: 2 as StreamStep, choices: ['TRANSPARENT_DEAL', 'FAKE_SCARCITY'] },
  ])('exposes the Core actions for step $step to the screen', ({ step, choices }) => {
    expect(streamChoicesForStep(step)).toEqual(choices);
  });
});
