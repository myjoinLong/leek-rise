import type { GameAction } from '../reducer';
import type { GameState } from '../types';
import { cafeChoicesForScenario, cafeReturnContextFor, cafeScenarioFor } from '../systems/cafeShift';

export function runCafeStrategy(state: GameState, dispatch: (action: GameAction) => void, mistakesPerShift = 0): void {
  const activeRun = state.activeActivity?.id === 'SUJIE_CAFE_SHIFT' ? state.activeActivity : null;
  const version = activeRun?.scenarioVersion ?? 4;
  const seed = activeRun?.scenarioSeed ?? state.scenarioSeed;
  const returnContext = activeRun ? activeRun.returnContext ?? null : cafeReturnContextFor(state);
  dispatch({ type: 'START_CAFE_SHIFT' });
  for (let step = 0; step < 3; step += 1) {
    const scenario = cafeScenarioFor(state.day, step as 0 | 1 | 2, version, seed, returnContext);
    const correctChoice = scenario.correctChoice;
    const choice = step < mistakesPerShift
      ? cafeChoicesForScenario(scenario).find((candidate) => candidate !== correctChoice) ?? correctChoice
      : correctChoice;
    dispatch({ type: 'SERVE_CAFE_ORDER', choice });
  }
}
