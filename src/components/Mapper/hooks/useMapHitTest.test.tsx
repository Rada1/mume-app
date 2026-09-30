// @vitest-environment jsdom
/**
 * @file Covers map door hit regions for the current player room.
 */
// --- Logic Section ---

import { createRef, type RefObject } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MapperRoom } from '../mapperTypes';
import { useMapHitTest } from './useMapHitTest';

function mapperRoom(): MapperRoom {
  return {
    id: 'm_1', gmcpId: 1, name: '', desc: '', x: 0, y: 0, z: 0,
    zone: '', terrain: 'indoors', exits: {
      n: { target: 'm_4', hasDoor: true, closed: true },
      s: { target: 'm_5', hasDoor: true, closed: true },
      e: { target: 'm_2', hasDoor: true, closed: true },
      d: { target: 'm_3', hasDoor: true, closed: false },
    }, notes: '', createdAt: 0,
  };
}

describe('current-room door hit testing', () => {
  it('maps taps on the top and bottom edges to north and south', () => {
    const { result } = renderHook(() => useMapHitTest({
      roomsRef: { current: { m_1: mapperRoom() } },
      markersRef: { current: {} },
      currentRoomIdRef: { current: 'm_1' },
      cameraRef: { current: { x: 0, y: 0, zoom: 1 } },
      canvasRef: createRef<HTMLCanvasElement>(),
      viewZ: 0,
      spatialIndexRef: { current: {} },
      preloadedCoordsRef: { current: {} },
    }));

    expect(result.current.getExitAt(25, 0)).toMatchObject({ direction: 'n' });
    expect(result.current.getExitAt(25, 50)).toMatchObject({ direction: 's' });
  });

  it('maps Performance Mode screen taps through its inverted Y camera', () => {
    const canvas = document.createElement('canvas');
    canvas.dataset.mapRenderer = 'performance-worker';
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 100));
    const canvasRef = { current: canvas } as RefObject<HTMLCanvasElement>;
    const { result } = renderHook(() => useMapHitTest({
      roomsRef: { current: { m_1: mapperRoom() } },
      markersRef: { current: {} },
      currentRoomIdRef: { current: 'm_1' },
      cameraRef: { current: { x: -25, y: -75, zoom: 1 } },
      canvasRef,
      viewZ: 0,
      spatialIndexRef: { current: {} },
      preloadedCoordsRef: { current: {} },
    }));

    const northPoint = result.current.screenToWorld(50, 25);
    const southPoint = result.current.screenToWorld(50, 75);
    expect(result.current.getExitAt(northPoint.x, northPoint.y)).toMatchObject({ direction: 'n' });
    expect(result.current.getExitAt(southPoint.x, southPoint.y)).toMatchObject({ direction: 's' });
  });

  it('hits a horizontal door slightly beyond the room tile edge', () => {
    const { result } = renderHook(() => useMapHitTest({
      roomsRef: { current: { m_1: mapperRoom() } },
      markersRef: { current: {} },
      currentRoomIdRef: { current: 'm_1' },
      cameraRef: { current: { x: 0, y: 0, zoom: 1 } },
      canvasRef: createRef<HTMLCanvasElement>(),
      viewZ: 0,
      spatialIndexRef: { current: {} },
      preloadedCoordsRef: { current: {} },
    }));

    expect(result.current.getExitAt(61, 25)).toMatchObject({ direction: 'e', roomId: 'm_1', isClosed: true });
  });

  it('keeps an explicitly mapped door clickable when a live neighbor has no reverse exit', () => {
    const neighbor: MapperRoom = { ...mapperRoom(), id: 'm_2', gmcpId: 2, x: 1, exits: {} };
    const { result } = renderHook(() => useMapHitTest({
      roomsRef: { current: { m_1: mapperRoom(), m_2: neighbor } },
      markersRef: { current: {} },
      currentRoomIdRef: { current: 'm_1' },
      cameraRef: { current: { x: 0, y: 0, zoom: 1 } },
      canvasRef: createRef<HTMLCanvasElement>(),
      viewZ: 0,
      spatialIndexRef: { current: {} },
      preloadedCoordsRef: { current: {} },
    }));

    expect(result.current.getExitAt(61, 25)).toMatchObject({ direction: 'e', roomId: 'm_1', hasDoor: true });
  });

  it('keeps a mapped door clickable when a live exit update omits its door flag', () => {
    const liveRoom: MapperRoom = {
      ...mapperRoom(),
      exits: { e: { target: 'm_2', closed: false, hasDoor: false } },
    };
    const { result } = renderHook(() => useMapHitTest({
      roomsRef: { current: { m_1: liveRoom } },
      markersRef: { current: {} },
      currentRoomIdRef: { current: 'm_1' },
      cameraRef: { current: { x: 0, y: 0, zoom: 1 } },
      canvasRef: createRef<HTMLCanvasElement>(),
      viewZ: 0,
      spatialIndexRef: { current: {} },
      preloadedCoordsRef: {
        current: { '1': [0, 0, 0, 'indoors', { e: { target: '2', hasDoor: true } }] },
      },
    }));

    expect(result.current.getExitAt(61, 25)).toMatchObject({ direction: 'e', roomId: 'm_1', isClosed: false });
  });

  it('hits a vertical door marker in the current room', () => {
    const { result } = renderHook(() => useMapHitTest({
      roomsRef: { current: { m_1: mapperRoom() } },
      markersRef: { current: {} },
      currentRoomIdRef: { current: 'm_1' },
      cameraRef: { current: { x: 0, y: 0, zoom: 1 } },
      canvasRef: createRef<HTMLCanvasElement>(),
      viewZ: 0,
      spatialIndexRef: { current: {} },
      preloadedCoordsRef: { current: {} },
    }));

    expect(result.current.getExitAt(37, 37)).toMatchObject({ direction: 'd', roomId: 'm_1', isClosed: false });
  });
});
