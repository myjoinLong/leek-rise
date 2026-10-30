import type { PlayerGender, StreamChoice, StreamDecision, StreamRunActiveState, StreamRunState, StreamStep } from '../types';

export interface StreamOptionEffect {
  choice: StreamChoice;
  audienceDelta: number;
  trustDelta: number;
  salesPoints: number;
  energyCost: number;
}

const effectsByStep: readonly (readonly StreamOptionEffect[])[] = [
  [
    { choice: 'HONEST_REVIEW', audienceDelta: 5, trustDelta: 12, salesPoints: 2, energyCost: 5 },
    { choice: 'HYPE_CLAIM', audienceDelta: 15, trustDelta: -8, salesPoints: 4, energyCost: 5 },
  ],
  [
    { choice: 'ANSWER_QUESTIONS', audienceDelta: 8, trustDelta: 8, salesPoints: 2, energyCost: 5 },
    { choice: 'REPEAT_CTA', audienceDelta: 16, trustDelta: -3, salesPoints: 4, energyCost: 5 },
  ],
  [
    { choice: 'TRANSPARENT_DEAL', audienceDelta: 5, trustDelta: 10, salesPoints: 3, energyCost: 5 },
    { choice: 'FAKE_SCARCITY', audienceDelta: 12, trustDelta: -12, salesPoints: 6, energyCost: 5 },
  ],
];

export const minimumStreamEnergy = effectsByStep.reduce(
  (total, options) => total + Math.min(...options.map((option) => option.energyCost)),
  0,
);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createStreamRun(day: number, fame: number): StreamRunActiveState {
  return {
    id: 'XIAOLIAN_STREAM',
    day,
    status: 'ACTIVE',
    step: 0,
    audience: clamp(25 + Math.floor(fame / 4), 10, 60),
    trust: 50,
    salesPoints: 0,
    energySpent: 0,
    decisions: [],
  };
}

export function getStreamOptionEffect(step: StreamStep, choice: StreamChoice): StreamOptionEffect | null {
  return effectsByStep[step]?.find((option) => option.choice === choice) ?? null;
}

export function advanceStreamRun(
  run: StreamRunActiveState,
  choice: StreamChoice,
  gender: PlayerGender | null,
): StreamRunState | null {
  const effect = getStreamOptionEffect(run.step, choice);
  if (!effect) return null;

  const decision: StreamDecision = {
    step: run.step,
    choice,
    audienceDelta: effect.audienceDelta,
    trustDelta: effect.trustDelta,
    salesPoints: effect.salesPoints,
  };
  const audience = clamp(run.audience + effect.audienceDelta, 0, 100);
  const trust = clamp(run.trust + effect.trustDelta, 0, 100);
  const salesPoints = run.salesPoints + effect.salesPoints;
  const decisions = [...run.decisions, decision];
  const energySpent = run.energySpent + effect.energyCost;

  if (run.step < 2) {
    return {
      ...run,
      step: (run.step + 1) as StreamStep,
      audience,
      trust,
      salesPoints,
      energySpent,
      decisions,
    };
  }

  const roleMultiplier = gender === 'FEMALE' ? 1.2 : 1;
  const income = Number(((salesPoints * 10 + Math.floor(audience / 10) * 5) * roleMultiplier).toFixed(2));
  const fameDelta = clamp(Math.floor((trust - 50) / 10) + Math.floor(audience / 25) - 1, -5, 6);
  return {
    ...run,
    status: 'RESULT',
    step: 3,
    audience,
    trust,
    salesPoints,
    energySpent,
    decisions,
    income,
    fameDelta,
  };
}
