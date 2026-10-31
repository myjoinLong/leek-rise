import { mulberry32 } from './rng';

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function seededShuffle<T>(items: readonly T[], seed: number, salt = 0): T[] {
  const random = mulberry32((seed ^ salt) >>> 0);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
  }
  return shuffled;
}

export function encounterIndex(day: number, slot: number, slotsPerDay: number): number {
  const safeDay = Math.max(1, Math.floor(day));
  const safeSlot = Math.max(0, Math.min(slotsPerDay - 1, Math.floor(slot)));
  return (safeDay - 1) * slotsPerDay + safeSlot;
}

export function seededPermutationAt(position: number, size: number, seed: number, salt = 0): number {
  const count = Math.max(1, Math.floor(size));
  const safePosition = Math.max(0, Math.floor(position)) % count;
  if (count === 1) return 0;

  const random = mulberry32((seed ^ salt) >>> 0);
  const offset = Math.floor(random() * count);
  let stride = 1 + Math.floor(random() * (count - 1));
  while (greatestCommonDivisor(stride, count) !== 1) {
    stride = (stride % (count - 1)) + 1;
  }

  return (offset + safePosition * stride) % count;
}
