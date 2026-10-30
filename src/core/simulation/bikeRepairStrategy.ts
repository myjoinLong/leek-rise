import type { GameAction } from '../reducer';
import { bikeRepairCaseFor, zhengRepairJobs } from '../systems/zhengBikeRepair';
import type { BikeRepairPart } from '../zhengBikeRepairTypes';
import type { GameState } from '../types';

const wrongPart: Readonly<Record<BikeRepairPart, BikeRepairPart>> = {
  BATTERY: 'BRAKES',
  BRAKES: 'CONTROLLER',
  CONTROLLER: 'BATTERY',
};

export function runBikeRepairStrategy(
  state: GameState,
  dispatch: (action: GameAction) => void,
  mistakesPerShift = 0,
): void {
  dispatch({ type: 'START_ZHENG_BIKE_REPAIR' });
  for (let step = 0; step < zhengRepairJobs; step += 1) {
    const repairCase = bikeRepairCaseFor(state.day, step as 0 | 1 | 2);
    const part = step < mistakesPerShift ? wrongPart[repairCase.faultyPart] : repairCase.faultyPart;
    dispatch({ type: 'REPAIR_BIKE_FAULT', part });
  }
}
