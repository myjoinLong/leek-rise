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
  dispatch: (action: GameAction) => GameState,
  mistakesPerShift = 0,
): void {
  let state = dispatch({ type: 'START_ZHENG_BIKE_REPAIR' });
  for (let step = 0; step < zhengRepairJobs; step += 1) {
    const run = state.activeActivity;
    if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'ACTIVE') return;
    const repairCase = bikeRepairCaseFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    const part = step < mistakesPerShift ? wrongPart[repairCase.faultyPart] : repairCase.faultyPart;
    if (part === repairCase.faultyPart && repairCase.warrantyProofRequired) {
      state = dispatch({ type: 'TEST_BIKE_PART', part });
    }
    if (step < zhengRepairJobs - 1) state = dispatch({ type: 'REPAIR_BIKE_FAULT', part });
    else dispatch({ type: 'REPAIR_BIKE_FAULT', part });
  }
}
