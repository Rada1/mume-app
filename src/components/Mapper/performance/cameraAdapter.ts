/**
 * @file Maps the legacy pixel camera to WebCockpit's room-space camera.
 */
// --- Logic Section ---

import { GRID_SIZE } from '../mapperUtils';
import type { FastMapView } from './protocol';

export interface PixelCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface TransitionPixelCamera extends PixelCamera {
  targetZoom?: number;
  zoomAnchorX?: number;
  zoomAnchorY?: number;
  zoomTransition?: { endZoom: number };
}

export function snapPixelCamera(camera: TransitionPixelCamera): void {
  if (camera.zoomTransition) {
    camera.targetZoom = camera.zoomTransition.endZoom;
    delete camera.zoomTransition;
  }
  if (camera.targetZoom === undefined || camera.targetZoom === camera.zoom) return;
  const oldZoom = Math.max(0.01, camera.zoom || 1);
  const newZoom = Math.max(0.01, camera.targetZoom);
  camera.x += (camera.zoomAnchorX || 0) / oldZoom - (camera.zoomAnchorX || 0) / newZoom;
  camera.y += (camera.zoomAnchorY || 0) / oldZoom - (camera.zoomAnchorY || 0) / newZoom;
  camera.zoom = newZoom;
  camera.targetZoom = newZoom;
}

export interface PixelPoint { x: number; y: number }
export interface PixelRect { left: number; top: number; width: number; height: number }

export function mapWheelCenterInCanvas(canvas: PixelRect, wheelSurface: PixelRect, width: number, height: number): PixelPoint {
  return {
    x: (wheelSurface.left + wheelSurface.width / 2 - canvas.left) * width / Math.max(1, canvas.width),
    y: (wheelSurface.top + wheelSurface.height / 2 - canvas.top) * height / Math.max(1, canvas.height),
  };
}

export function mapWheelTarget(canvas: HTMLCanvasElement, width: number, height: number): PixelPoint {
  const canvasRect = canvas.getBoundingClientRect();
  const surface = canvas.closest('.mobile-mapper-touch-surface') ?? canvas.closest('.mapper-container');
  const rect = surface?.getBoundingClientRect() ?? canvasRect;
  return mapWheelCenterInCanvas(canvasRect, rect, width, height);
}

export function centerPixelCameraOnRoom(camera: PixelCamera, room: { x: number; y: number }, width: number, height: number, target: PixelPoint = { x: width / 2, y: height / 2 }): void {
  const zoom = Math.max(0.01, camera.zoom || 1);
  camera.x = room.x * GRID_SIZE + GRID_SIZE / 2 - target.x / zoom;
  // The worker map stores northward room coordinates with inverted Y, so its
  // tile center is at -room.y + 0.5 rather than room.y + 0.5.
  camera.y = room.y * GRID_SIZE - GRID_SIZE / 2 - target.y / zoom;
}

export function toFastMapView(camera: PixelCamera, width: number, height: number, layer: number): FastMapView {
  const pixelsPerRoom = GRID_SIZE * Math.max(0.01, camera.zoom || 1);
  const projectionZoom = pixelsPerRoom * Math.max(1, 60 - 7 * layer) / 2640;
  return {
    x: camera.x / GRID_SIZE + Math.max(1, width) / (2 * pixelsPerRoom),
    y: -(camera.y / GRID_SIZE + Math.max(1, height) / (2 * pixelsPerRoom)),
    zoom: projectionZoom,
    layer,
  };
}
