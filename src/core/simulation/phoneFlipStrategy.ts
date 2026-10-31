import type { GameAction } from '../reducer';
import type { GameState, PhoneFlipChoice } from '../types';
import { phoneLotBriefFor } from '../systems/phoneFlip';

const skilledChoices: Record<ReturnType<typeof phoneLotBriefFor>['profile'], PhoneFlipChoice> = {
  CLEAN: 'BARGAIN_QUICK',
  BATTERY: 'ASK_REFURB',
  CORROSION: 'PASS',
};

export function runPhoneFlipStrategy(
  dispatch: (action: GameAction) => GameState,
  options: { misjudgeRiskLot?: boolean } = {},
): void {
  let state = dispatch({ type: 'START_PHONE_FLIP' });
  if (state.activeActivity?.id !== 'PHONE_FLIP') throw new Error('Phone appraisal entry was rejected.');

  while (state.activeActivity?.id === 'PHONE_FLIP' && state.activeActivity.status === 'ACTIVE') {
    const run = state.activeActivity;
    const lot = phoneLotBriefFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const misjudgesRiskLot = options.misjudgeRiskLot && lot.profile === 'CORROSION';
    if (!run.inspection && !misjudgesRiskLot) {
      const previous = state;
      state = dispatch({ type: 'INSPECT_PHONE_LOT' });
      const inspectedRun = state.activeActivity;
      if (state === previous || inspectedRun?.id !== 'PHONE_FLIP' || inspectedRun.status !== 'ACTIVE' || !inspectedRun.inspection) {
        throw new Error('Phone inspection could not be completed.');
      }
    }
    const choice = misjudgesRiskLot ? 'BARGAIN_QUICK' : skilledChoices[lot.profile];
    const previous = state;
    state = dispatch({ type: 'RESOLVE_PHONE_LOT', choice });
    if (state === previous) throw new Error('Phone resale decision was rejected.');
  }
}
