/**
 * @file Builds room-sized group squares and room-name labels.
 */
// --- Logic Section ---

import type { FastMapGroupMember, FastMapTextLabel } from './model';
import type { FastMapView } from './protocol';

interface MarkerLayout {
  member: FastMapGroupMember;
  x: number;
  y: number;
  roomIndex: number;
}

const MARKER_OUTER_HALF_SIZE = 0.415;
const MARKER_INNER_HALF_SIZE = 0.33;
export const GROUP_MEMBER_LABEL_FONT_SIZE = 18;
const LABEL_STACK_SPACING = GROUP_MEMBER_LABEL_FONT_SIZE + 2;
const SIDE_MIDDLE_ALPHA = 0.38;
// MMapper uses 45 / PI degrees per occupied slot, which is exactly 0.25 radians.
const GROUP_MEMBER_ROTATION_STEP = 0.25;

function colorComponents(color: number, alpha: number): readonly number[] {
  return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255, alpha];
}

function appendVertex(out: number[], x: number, y: number, z: number, color: number, alpha = 1): void {
  out.push(x, y, z, ...colorComponents(color, alpha));
}

function appendTriangle(out: number[], a: readonly number[], b: readonly number[], c: readonly number[], color: number, alpha = 1): void {
  appendVertex(out, a[0]!, a[1]!, a[2]!, color, alpha);
  appendVertex(out, b[0]!, b[1]!, b[2]!, color, alpha);
  appendVertex(out, c[0]!, c[1]!, c[2]!, color, alpha);
}

function appendRect(
  out: number[], x: number, y: number, z: number,
  halfWidth: number, halfHeight: number, color: number, alpha = 1, rotation = 0,
): void {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const point = (localX: number, localY: number): readonly [number, number, number] => [
    x + localX * cos - localY * sin,
    y + localX * sin + localY * cos,
    z,
  ];
  const bottomLeft = point(-halfWidth, -halfHeight);
  const bottomRight = point(halfWidth, -halfHeight);
  const topLeft = point(-halfWidth, halfHeight);
  const topRight = point(halfWidth, halfHeight);
  appendTriangle(out, bottomLeft, bottomRight, topLeft, color, alpha);
  appendTriangle(out, topLeft, bottomRight, topRight, color, alpha);
}

function markerLayouts(members: readonly FastMapGroupMember[]): MarkerLayout[] {
  const roomCounts = new Map<string, number>();
  return members.map(member => {
    const key = `${member.x},${member.y},${member.z}`;
    const roomIndex = roomCounts.get(key) ?? 0;
    roomCounts.set(key, roomIndex + 1);
    return {
      member,
      x: member.x + 0.5,
      y: member.y + 0.5,
      roomIndex,
    };
  });
}

export function buildGroupMemberLabels(members: readonly FastMapGroupMember[]): FastMapTextLabel[] {
  const labels: FastMapTextLabel[] = [];
  for (const layout of markerLayouts(members)) {
    const { member, x, y, roomIndex } = layout;
    const text = member.name.trim();
    if (!text) continue;
    const label: FastMapTextLabel = {
      x,
      y,
      z: member.z,
      text,
      fontSize: GROUP_MEMBER_LABEL_FONT_SIZE,
      color: member.color,
      offsetY: roomIndex * LABEL_STACK_SPACING,
    };
    labels.push(label);
  }
  return labels;
}

function appendSquareFrame(out: number[], x: number, y: number, z: number, color: number, rotation: number): void {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const halfThickness = (MARKER_OUTER_HALF_SIZE - MARKER_INNER_HALF_SIZE) / 2;
  const stripCenter = (MARKER_OUTER_HALF_SIZE + MARKER_INNER_HALF_SIZE) / 2;
  const cornerHalfLength = (MARKER_OUTER_HALF_SIZE - 0.205) / 2;
  const cornerCenter = (MARKER_OUTER_HALF_SIZE + 0.205) / 2;
  const appendPart = (localX: number, localY: number, halfWidth: number, halfHeight: number, alpha: number) => {
    appendRect(
      out,
      x + localX * cos - localY * sin,
      y + localX * sin + localY * cos,
      z,
      halfWidth,
      halfHeight,
      color,
      alpha,
      rotation,
    );
  };
  const appendHorizontalSide = (sideY: number) => {
    appendPart(0, sideY * stripCenter, 0.205, halfThickness, SIDE_MIDDLE_ALPHA);
    appendPart(-cornerCenter, sideY * stripCenter, cornerHalfLength, halfThickness, 1);
    appendPart(cornerCenter, sideY * stripCenter, cornerHalfLength, halfThickness, 1);
  };
  const appendVerticalSide = (sideX: number) => {
    appendPart(sideX * stripCenter, 0, halfThickness, 0.205, SIDE_MIDDLE_ALPHA);
    appendPart(sideX * stripCenter, -cornerCenter, halfThickness, cornerHalfLength, 1);
    appendPart(sideX * stripCenter, cornerCenter, halfThickness, cornerHalfLength, 1);
  };
  appendHorizontalSide(1);
  appendHorizontalSide(-1);
  appendVerticalSide(-1);
  appendVerticalSide(1);
}

export function buildGroupMemberGeometry(
  members: readonly FastMapGroupMember[],
  view: FastMapView,
  player: { x: number; y: number; z: number } | null = null,
  width = 0,
  height = 0,
): Float32Array {
  const output: number[] = [];
  const layouts = markerLayouts(members);

  for (const layout of layouts) {
    const { member, x, y } = layout;
    if (member.z !== view.layer) continue;
    const sharesPlayerRoom = !!player
      && Math.round(member.x) === Math.round(player.x)
      && Math.round(member.y) === Math.round(player.y)
      && Math.round(member.z) === Math.round(player.z);
    const occupiedSlots = layout.roomIndex + Number(sharesPlayerRoom);
    appendSquareFrame(
      output,
      x,
      y,
      member.z,
      member.color,
      occupiedSlots * GROUP_MEMBER_ROTATION_STEP,
    );
  }

  if (width > 0 && height > 0) {
    const drawOffscreenArrow = (x: number, y: number, z: number, color: number) => {
      if (z !== view.layer) return;
      const perspective = Math.max(1, 60 - 7 * z);
      const pixelsPerRoom = (5280 * view.zoom) / (2 * perspective);
      const targetX = width / 2 + (x + 0.5 - view.x) * pixelsPerRoom;
      const targetY = height / 2 - (y + 0.5 - view.y) * pixelsPerRoom;
      const dx = targetX - width / 2;
      const dy = targetY - height / 2;
      if (targetX >= 18 && targetX <= width - 18 && targetY >= 18 && targetY <= height - 18) return;
      const length = Math.hypot(dx, dy);
      if (length < 0.001) return;
      const ux = dx / length;
      const uy = dy / length;
      const edgeScale = Math.min((width / 2 - 18) / Math.abs(ux || 1e-9), (height / 2 - 18) / Math.abs(uy || 1e-9));
      const px = width / 2 + ux * edgeScale;
      const py = height / 2 + uy * edgeScale;
      const pxToWorld = (sx: number, sy: number): readonly [number, number] => [
        view.x + (sx - width / 2) / pixelsPerRoom,
        view.y - (sy - height / 2) / pixelsPerRoom,
      ];
      const tip = pxToWorld(px + ux * 8, py + uy * 8);
      const halfWidth = 5;
      const left = pxToWorld(px - ux * 2 - uy * halfWidth, py - uy * 2 + ux * halfWidth);
      const right = pxToWorld(px - ux * 2 + uy * halfWidth, py - uy * 2 - ux * halfWidth);
      const tailLeft = pxToWorld(px - ux * 7 - uy * 2, py - uy * 7 + ux * 2);
      const tailRight = pxToWorld(px - ux * 7 + uy * 2, py - uy * 7 - ux * 2);
      const zRoom = view.layer;
      // MMapper's screen-space arrows sit just inside the viewport and point toward the room.
      appendTriangle(output, [...tip, zRoom], [...left, zRoom], [...tailLeft, zRoom], color, 0.92);
      appendTriangle(output, [...tip, zRoom], [...tailLeft, zRoom], [...tailRight, zRoom], color, 0.92);
      appendTriangle(output, [...tip, zRoom], [...tailRight, zRoom], [...right, zRoom], color, 0.92);
      appendTriangle(output, [...tip, zRoom], [...right, zRoom], [...left, zRoom], color, 0.92);
    };
    for (const member of members) drawOffscreenArrow(member.x, member.y, member.z, member.color);
    if (player) drawOffscreenArrow(player.x, player.y, player.z, 0xffffff);
  }

  return Float32Array.from(output);
}
