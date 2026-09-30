/**
 * @file Unit tests for legacy-to-worker camera conversion across floors and zoom levels.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { centerPixelCameraOnRoom, mapWheelCenterInCanvas, toFastMapView } from './cameraAdapter';

describe('centerPixelCameraOnRoom', () => {
  it('places the selected room center at the center of the map viewport', () => {
    const camera = { x: 0, y: 0, zoom: 2 };
    centerPixelCameraOnRoom(camera, { x: 6, y: 5 }, 800, 600);
    const view = toFastMapView(camera, 800, 600, 0);

    expect(view.x).toBe(6.5);
    expect(view.y).toBe(-4.5);
  });

  it('places the selected tile at the center of the wheel center cell', () => {
    const camera = { x: 0, y: 0, zoom: 2 };
    const target = mapWheelCenterInCanvas(
      { left: 20, top: 30, width: 400, height: 500 },
      { left: 40, top: 110, width: 360, height: 360 },
      400,
      500,
    );
    centerPixelCameraOnRoom(camera, { x: 6, y: 5 }, 400, 500, target);
    const view = toFastMapView(camera, 400, 500, 0);

    expect(target).toEqual({ x: 200, y: 260 });
    expect(view.x).toBe(6.5);
    expect(view.y).toBeCloseTo(-4.4);
  });
});

describe('toFastMapView', () => {
  it('preserves the legacy room center and screen-space y direction', () => {
    const view = toFastMapView({ x: 100, y: 150, zoom: 2 }, 800, 600, 0);
    expect(view.x).toBe(6);
    expect(view.y).toBe(-6);
    expect(view.layer).toBe(0);
    expect(view.zoom).toBeCloseTo((100 * 60) / 2640);
  });

  it('adjusts WebCockpit projection scale for floor and immediate zoom changes', () => {
    const floorOne = toFastMapView({ x: 0, y: 0, zoom: 1.5 }, 600, 400, 1);
    expect(floorOne.x).toBe(4);
    expect(floorOne.y).toBeCloseTo(-8 / 3);
    expect(floorOne.zoom).toBeCloseTo((75 * 53) / 2640);
    expect(toFastMapView({ x: 0, y: 0, zoom: 1 }, 0, 0, 2).x).toBeCloseTo(0.01);
  });
});
