import type { GameAction } from '../reducer';
import type { ActiveActivityState } from '../types';
import { activityContracts } from '../activityContracts';

export function permitsActivityAction(activity: ActiveActivityState | null, action: GameAction): boolean {
  if (!activity) return true;
  if (activity.status === 'RESULT') return action.type === 'RETURN_FROM_ACTIVITY';
  // Freeze the surrounding world so saved evidence and settlement inputs stay tied to this run.
  const allowed: readonly GameAction['type'][] = activityContracts[activity.id].allowedActions;
  return allowed.includes(action.type);
}
