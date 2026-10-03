/**
 * @file Tests open/closed geometry for regular and vertical exit doors.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { buildDoorVertices, DOOR_VERTEX_COUNT } from './doorGeometry';

describe('Performance Mode door geometry', () => {
  it('places north and south doors on the matching screen edges after Y inversion', () => {
    const north = buildDoorVertices(0, 0, 0, 0, false);
    const south = buildDoorVertices(0, 0, 0, 1, false);
    const barY = (vertices: Float32Array) => Array.from({ length: 6 }, (_, index) => vertices[(12 + index) * 7 + 1]!);

    expect(Math.min(...barY(north))).toBeGreaterThan(0.9);
    expect(Math.max(...barY(south))).toBeLessThan(0.1);
  });

  it('places up and down markers in the matching screen corners after Y inversion', () => {
    const up = buildDoorVertices(0, 0, 0, 4, false);
    const down = buildDoorVertices(0, 0, 0, 5, false);
    const points = (vertices: Float32Array) => Array.from({ length: 3 }, (_, index) => [
      vertices[index * 7]!, vertices[index * 7 + 1]!,
    ]);

    expect(points(up).reduce((sum, point) => sum + point[1]!, 0) / 3).toBeGreaterThan(0.65);
    expect(points(down).reduce((sum, point) => sum + point[1]!, 0) / 3).toBeLessThan(0.35);
  });

  it('keeps a fixed mesh size while changing closed and open markers', () => {
    const closed = buildDoorVertices(0, 0, 0, 0, false);
    const open = buildDoorVertices(0, 0, 0, 0, true);
    expect(closed).toHaveLength(DOOR_VERTEX_COUNT * 7);
    expect(open).toHaveLength(DOOR_VERTEX_COUNT * 7);
    expect(Array.from(open)).not.toEqual(Array.from(closed));
    expect(Array.from(closed.slice(3, 7))).toEqual([0, 0, 0, 1]);
    expect(closed[17 * 7 + 3]).toBe(1);
    expect(closed[17 * 7 + 4]).toBe(1);
    expect(closed[17 * 7 + 5]).toBe(1);
    expect(closed[17 * 7 + 6]).toBe(1);
  });

  it('renders doors outside the current room black and current-room doors white', () => {
    const localDoor = buildDoorVertices(0, 0, 0, 0, false);
    const remoteDoor = buildDoorVertices(0, 0, 0, 0, false, 'remote');

    expect(localDoor[17 * 7 + 3]).toBe(1);
    expect(localDoor[17 * 7 + 4]).toBe(1);
    expect(localDoor[17 * 7 + 5]).toBe(1);
    expect(localDoor[17 * 7 + 6]).toBe(1);
    expect(Array.from(remoteDoor.slice(17 * 7 + 3, 17 * 7 + 7))).toEqual([0, 0, 0, 1]);
  });

  it('draws UP and DOWN doors with distinct filled and outline states', () => {
    for (const direction of [4, 5]) {
      const closed = buildDoorVertices(0, 0, 0, direction, false);
      const open = buildDoorVertices(0, 0, 0, direction, true);
      expect(closed).toHaveLength(DOOR_VERTEX_COUNT * 7);
      expect(open).toHaveLength(DOOR_VERTEX_COUNT * 7);
      expect(Array.from(open)).not.toEqual(Array.from(closed));
    }
  });
});
