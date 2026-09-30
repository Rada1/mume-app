/**
 * @file Renders temporary, non-group player locations from a manual `where` scan.
 */
// --- Logic Section ---

import { useEffect, useMemo, useRef, useState } from 'react';
import { gmcpBus } from '../../events/gmcpBus';
import type { GroupMember } from '../../types';
import type { WhereScanSnapshot } from '../../types/whereScan';
import type { MapperRoom } from './mapperTypes';
import { GRID_SIZE } from './mapperUtils';
import { toFastMapView } from './performance/cameraAdapter';
import type { MapData } from './performance/webcockpit/model';
import { resolveCanonicalMapPosition, resolveWhereScanLocations } from './whereScanLocations';

const SCAN_DURATION_MS = 1600;
const SCAN_COLOR = '#83e5ff';

interface WhereScanMapOverlayProps {
  camera: React.MutableRefObject<{ x: number; y: number; zoom: number }>;
  currentRoomId: string | null;
  playerPosition: React.MutableRefObject<{ x: number; y: number; z: number } | null>;
  rooms: Record<string, MapperRoom>;
  tuples: React.MutableRefObject<Record<string, readonly unknown[]>>;
  zone: string;
  ownName: string;
  groupMembers: GroupMember[];
  viewZ: number | null;
  isMobile: boolean;
  isPerformanceMode: boolean;
  performanceMap: MapData | null;
  performanceMapRevision: number;
}

function roomPosition(props: WhereScanMapOverlayProps): { x: number; y: number; z: number } | null {
  const id = props.currentRoomId?.replace(/^m_/, '') ?? '';
  const room = props.rooms[props.currentRoomId ?? ''] ?? props.rooms[`m_${id}`] ?? props.rooms[id];
  if (props.isPerformanceMode && props.performanceMap) {
    const canonicalPosition = resolveCanonicalMapPosition(props.performanceMap, props.currentRoomId, room?.gmcpId);
    if (canonicalPosition) return canonicalPosition;
  }
  const player = props.playerPosition.current;
  if (player) return player;
  if (room) return { x: room.x, y: room.y, z: room.z };
  const tuple = props.tuples.current[id];
  if (!tuple) return null;
  const [x, y, z] = tuple;
  return typeof x === 'number' && typeof y === 'number' && typeof z === 'number' ? { x, y, z } : null;
}

function drawScanLabel(ctx: CanvasRenderingContext2D, name: string, detail: string, x: number, y: number, alpha: number): void {
  ctx.font = 'bold 11px monospace';
  const nameWidth = Math.min(180, ctx.measureText(name).width);
  ctx.font = '10px monospace';
  const detailWidth = Math.min(180, ctx.measureText(detail).width);
  const width = Math.max(nameWidth, detailWidth) + 12;
  const left = Math.min(Math.max(4, x + 9), Math.max(4, ctx.canvas.clientWidth - width - 4));
  const top = Math.max(4, y - 22);
  ctx.globalAlpha = alpha * 0.88;
  ctx.fillStyle = '#10171c';
  ctx.fillRect(left, top, width, 29);
  ctx.strokeStyle = SCAN_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 0.5, top + 0.5, width - 1, 28);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = SCAN_COLOR;
  ctx.font = 'bold 11px monospace';
  ctx.fillText(name, left + 6, top + 12, 174);
  ctx.font = '10px monospace';
  ctx.fillText(detail, left + 6, top + 24, 174);
}

function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, alpha: number): void {
  for (let pulse = 0; pulse < 2; pulse++) {
    const progress = (age - pulse * 420) / 850;
    if (progress < 0 || progress >= 1) continue;
    ctx.globalAlpha = alpha * (1 - progress) * 0.8;
    ctx.strokeStyle = SCAN_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5 + progress * 27, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#10242b';
  ctx.fillRect(x - 5, y - 5, 10, 10);
  ctx.fillStyle = SCAN_COLOR;
  ctx.fillRect(x - 4, y - 4, 8, 8);
  ctx.fillStyle = '#10242b';
  ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
}

export function WhereScanMapOverlay(props: WhereScanMapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scan, setScan] = useState<WhereScanSnapshot | null>(null);
  const position = roomPosition(props);
  const markers = useMemo(() => scan ? resolveWhereScanLocations(
    scan.players,
    props.ownName,
    props.groupMembers,
    position,
    props.zone,
    props.rooms,
    props.tuples.current,
    props.isPerformanceMode ? props.performanceMap : null,
  ) : [], [scan, props.ownName, props.groupMembers, props.zone, props.rooms, props.tuples, props.isPerformanceMode, props.performanceMap, props.performanceMapRevision, position?.x, position?.y, position?.z]);

  useEffect(() => {
    const unsubscribe = gmcpBus.on('Game.WhereScan', setScan);
    const clear = gmcpBus.on('Session.Reset', () => setScan(null));
    return () => { unsubscribe(); clear(); };
  }, []);

  useEffect(() => {
    if (!scan) return;
    const remaining = Math.max(0, SCAN_DURATION_MS - (performance.now() - scan.startedAt));
    const timeout = window.setTimeout(() => setScan(current => current === scan ? null : current), remaining);
    return () => window.clearTimeout(timeout);
  }, [scan]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !parent || !context || !scan || markers.length === 0) return;
    let frame = 0;
    let active = true;
    let width = 0;
    let height = 0;
    const dpr = Math.min(props.isMobile ? 1.5 : 2.5, window.devicePixelRatio || 1);

    const draw = () => {
      if (!active) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      const backingWidth = Math.max(1, Math.round(width * dpr));
      const backingHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const age = performance.now() - scan.startedAt;
      if (age >= SCAN_DURATION_MS) return;
      const fade = age < 350 ? 1 : Math.max(0, 1 - (age - 350) / (SCAN_DURATION_MS - 350));
      const camera = props.camera.current;
      const floor = Math.round(props.viewZ ?? position?.z ?? 0);
      const workerCanvas = parent.querySelector<HTMLCanvasElement>('canvas.map-canvas[data-map-renderer="performance-worker"]');
      const workerView = props.isPerformanceMode && workerCanvas
        ? toFastMapView(camera, width, height, floor)
        : null;
      const workerScale = workerView ? 2640 * workerView.zoom : 0;
      const sameRoomCount = markers.filter(marker => marker.sameRoom && marker.z === floor).length;
      let sameRoomIndex = 0;
      for (const marker of markers) {
        if (marker.z !== floor) continue;
        let x = workerView
          ? width / 2 + (marker.x - workerView.x) * workerScale
          : (marker.x * GRID_SIZE + GRID_SIZE / 2 - camera.x) * camera.zoom;
        let y = workerView
          ? height / 2 - (-marker.y - workerView.y) * workerScale
          : (marker.y * GRID_SIZE + GRID_SIZE / 2 - camera.y) * camera.zoom;
        if (marker.sameRoom && sameRoomCount > 1) {
          const angle = (sameRoomIndex++ / sameRoomCount) * Math.PI * 2;
          x += Math.cos(angle) * 11;
          y += Math.sin(angle) * 11;
        } else if (marker.sameRoom) {
          x += 10;
          y -= 8;
        }
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue;
        drawMarker(context, x, y, age, fade);
        const detail = `${marker.direction ? `${marker.direction} · ` : ''}${marker.room}`;
        drawScanLabel(context, marker.name, detail, x, y, fade);
      }
      frame = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(() => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    });
    observer.observe(parent);
    draw();
    return () => {
      active = false;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [scan, markers, props.camera, props.isMobile, props.viewZ, position?.z]);

  return <canvas ref={canvasRef} aria-hidden="true" className="where-scan-map-overlay" />;
}
