import { describe, expect, it } from 'vitest';
import { clampMapOffset, mapOffsetToReveal, mapPanLimit } from './mapCamera';

describe('daytime map camera', () => {
  it('allows horizontal exploration on portrait viewports without scaling the scene', () => {
    const viewport = { width: 390, height: 844 };
    const map = { width: 844 * 2 / 3, height: 844 };
    const limit = mapPanLimit(viewport, map);

    expect(limit.x).toBeCloseTo(86.333, 2);
    expect(limit.y).toBe(0);
    expect(map.width / map.height).toBeCloseTo(2 / 3);
    expect(clampMapOffset({ x: 1000, y: 40 }, limit)).toEqual({ x: limit.x, y: 0 });
  });

  it('allows vertical exploration on landscape viewports without stretching the scene', () => {
    const viewport = { width: 480, height: 390 };
    const map = { width: 480, height: 480 * 3 / 2 };
    const limit = mapPanLimit(viewport, map);

    expect(limit.x).toBe(0);
    expect(limit.y).toBe(165);
    expect(map.width / map.height).toBeCloseTo(2 / 3);
    expect(clampMapOffset({ x: -30, y: -400 }, limit)).toEqual({ x: 0, y: -limit.y });
  });

  it('brings a focused NPC into view while keeping the camera inside map bounds', () => {
    const target = { left: -18, right: 34, top: 170, bottom: 242 };
    const viewport = { left: 0, right: 390, top: 0, bottom: 844 };
    const offset = mapOffsetToReveal(target, viewport, { x: 0, y: 0 }, { x: 86, y: 0 });

    expect(offset).toEqual({ x: 30, y: 0 });
    expect(target.left + offset.x).toBe(12);
    expect(target.right + offset.x).toBeLessThan(viewport.right - 12);
  });

  it('pans vertically to reveal focused hotspots in landscape and leaves fitted maps centered', () => {
    const viewport = { left: 0, right: 480, top: 0, bottom: 390 };
    const focusedHotspot = { left: 120, right: 172, top: -26, bottom: 46 };
    const offset = mapOffsetToReveal(focusedHotspot, viewport, { x: 0, y: 0 }, { x: 0, y: 285 });
    expect(offset).toEqual({ x: 0, y: 38 });

    const fittedLimit = mapPanLimit({ width: 390, height: 844 }, { width: 390, height: 585 });
    expect(clampMapOffset({ x: 5, y: -5 }, fittedLimit)).toEqual({ x: 0, y: 0 });
  });
});
