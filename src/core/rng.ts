export function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    let next = value += 0x6D2B79F5;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
