import type { GameAction } from '../reducer';
import type { GameState } from '../types';
import { cafeChoicesFor, cafeCustomerFor, correctCafeChoiceFor } from '../systems/cafeShift';

export function runCafeStrategy(state: GameState, dispatch: (action: GameAction) => void, mistakesPerShift = 0): void {
  dispatch({ type: 'START_CAFE_SHIFT' });
  for (let step = 0; step < 3; step += 1) {
    const customer = cafeCustomerFor(state.day, step as 0 | 1 | 2);
    const correctChoice = correctCafeChoiceFor(customer);
    const choice = step < mistakesPerShift
      ? cafeChoicesFor(customer).find((candidate) => candidate !== correctChoice) ?? correctChoice
      : correctChoice;
    dispatch({ type: 'SERVE_CAFE_ORDER', choice });
  }
}
