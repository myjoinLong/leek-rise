import type { EconomyScenario } from './economyTypes';
import type { EconomyStrategy } from './strategies';
import { isBikeRepairStrategy } from './strategies';

export function validateBikeRepairSettings(settings: EconomyScenario['bikeRepair'], strategy: EconomyStrategy): void {
  if (!settings) return;
  if (!isBikeRepairStrategy(strategy) || !Number.isInteger(settings.mistakesPerShift) || settings.mistakesPerShift < 0 || settings.mistakesPerShift > 3
    || (settings.skipEveryDays !== undefined && (!Number.isInteger(settings.skipEveryDays) || settings.skipEveryDays < 0 || settings.skipEveryDays > 365))) {
    throw new Error('Bike repair stress settings require a repair strategy, 0–3 mistakes, and an optional 0–365 day skip interval.');
  }
}
