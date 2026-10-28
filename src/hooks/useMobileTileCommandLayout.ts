/** @file useMobileTileCommandLayout.ts — Spatial swipe cells followed by commands without a bound direction. */
import { useMemo } from 'react';
import type { useMobileCommandTiles } from './useMobileCommandTiles';

// --- Physical swipe order, matching the movement pad ---
const SLOTS = ['nw','up','ne','left','center','right','sw','down','se'] as const;
const LABELS = {nw:'Up-left',up:'Up',ne:'Up-right',left:'Left',center:'Tap',right:'Right',sw:'Down-left',down:'Down',se:'Down-right'};
export const useMobileTileCommandLayout = (tile: ReturnType<typeof useMobileCommandTiles>['tiles'][number]) => useMemo(() => {
 const assigned = new Set<string>();
 const cells = SLOTS.map(slot => {
  const command = slot === 'center' ? tile.button.command : tile.button.swipeCommands?.[slot] || tile.button.longSwipeCommands?.[slot];
  if (command) assigned.add(command);
  return {slot,hint:LABELS[slot],button:tile.commands.find(button => button.command === command)};
 });
 return {cells,extra:tile.commands.filter(button => !assigned.has(button.command))};
}, [tile.button,tile.commands]);
