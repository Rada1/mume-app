/** @file useMobileTileGestures.ts — Tap/swipe command gestures with the modern map-lane target menus. */
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { CustomButton, SwipeDirection } from '../types';
import type { useMobileCommandTiles } from './useMobileCommandTiles';
import { useGearPanelData } from './useGearPanelData';
import { useHeldCommandEdgeScroll } from './useHeldCommandEdgeScroll';
import { getHeldTarget, isHeldTargetNavigation, useHeldTargetHover } from './useHeldTargetHover';
import { COMMAND_TREE_SOCIAL_BUTTON, isCommandTreeSocial } from '../utils/commandTreeSocial';

// --- Gesture lifetime and stable directional bindings ---
const OCTANTS: SwipeDirection[] = ['right','se','down','sw','left','nw','up','ne'];
export const useMobileTileGestures = (
 tiles: ReturnType<typeof useMobileCommandTiles>['tiles'],
 onTargetCommand: (button: CustomButton | null) => void,
 execute: (button: CustomButton, event: React.MouseEvent) => void,
 haptic: (duration: number) => void,
 commandSent:React.MutableRefObject<boolean>
) => {
 const [activeTileId,setActiveTileId] = useState<string | null>(null);
 const [selected,setSelected] = useState<CustomButton | null>(null);
 const [swipeFeedback,setSwipeFeedback] = useState<{tileId:string;direction:SwipeDirection;button:CustomButton} | null>(null);
 const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const [hoveredControl,setHoveredControl] = useState<'cancel' | 'arrange' | null>(null);
 const [arranging,setArranging] = useState(false);
 const arrangingRef = useRef(false);
 const targetHover = useHeldTargetHover(haptic);
 const needsGear=['gear','consume','interact','observe','mounts'].includes(activeTileId || '');
 useGearPanelData(needsGear,needsGear);
 const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const session = useRef<{id:number;x:number;y:number;lastX:number;lastY:number;revealX:number;revealY:number;scrollArmed:boolean;time:number;tile:typeof tiles[number];button:CustomButton;direction?:SwipeDirection;revealed:boolean;laneRight:number} | null>(null);
 const clearFeedback = () => {if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);feedbackTimer.current=null;setSwipeFeedback(null);};
 const clearTimer = () => {if (timer.current !== null) clearTimeout(timer.current); timer.current = null;};
 const close = () => {targetHover.clear();clearFeedback();arrangingRef.current=false;setArranging(false);setHoveredControl(null);edgeScroll.stop();clearTimer();session.current = null;setActiveTileId(null);setSelected(null);onTargetCommand(null);};
 const cancel = () => {commandSent.current=true;close();haptic(15);};
 const beginArrange = () => {
  targetHover.clear();
  arrangingRef.current=true;setArranging(true);setHoveredControl(null);commandSent.current=true;
  clearTimer();edgeScroll.stop();session.current=null;onTargetCommand(null);
 };
 useEffect(() => () => {clearTimer();if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);},[]);
 const select = (tile: typeof tiles[number],button: CustomButton) => {
  if (arrangingRef.current) return;
  if (session.current) session.current.button = button;
  setActiveTileId(tile.id);setSelected(button);onTargetCommand(button);haptic(15);
 };
 const edgeScroll = useHeldCommandEdgeScroll(command => {
  const current=session.current;
  if (!current) return;
  const tile=tiles.find(entry => entry.id === current.tile.id) || current.tile;
  const button=tile.commands.find(entry => entry.command === command);
  if (button && button.command !== current.button.command) select(tile,button);
 }, undefined, (x,y) => {if (session.current?.revealed && !arrangingRef.current) targetHover.update(document.elementFromPoint(x,y));});
 const handlers = (tile: typeof tiles[number]) => ({
  onPointerDown:(event: React.PointerEvent<HTMLButtonElement>) => {
   if (event.button !== 0 || arrangingRef.current) return;
   clearTimer();
   targetHover.clear();
   clearFeedback();
   edgeScroll.stop();edgeScroll.update(event.clientX,event.clientY);
   commandSent.current = false;
   event.currentTarget.setPointerCapture(event.pointerId);
   const button = tile.commands.find(entry => entry.command === tile.button.command) || {...tile.button,label:tile.label};
   session.current = {id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,
    revealX:event.clientX,revealY:event.clientY,scrollArmed:false,time:Date.now(),tile,button,revealed:false,
    laneRight:event.currentTarget.closest('.mobile-command-tiles-branch')?.getBoundingClientRect().right ?? window.innerWidth / 2};
   timer.current = setTimeout(() => {
    const current = session.current;
    if (!current) return;
    clearFeedback();current.revealX=current.lastX;current.revealY=current.lastY;current.revealed = true;
    select(current.tile,current.tile.id === 'social' ? COMMAND_TREE_SOCIAL_BUTTON : current.button);
   },220);
  },
  onPointerMove:(event: React.PointerEvent<HTMLButtonElement>) => {
   const current = session.current;
   edgeScroll.update(event.clientX,event.clientY);
   if (!current || current.id !== event.pointerId) return;
   current.lastX=event.clientX;current.lastY=event.clientY;
   if (current.revealed) {
    targetHover.update(document.elementFromPoint(event.clientX,event.clientY));
    const control=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-mobile-tile-cancel],[data-mobile-tile-arrange]');
    const isCancel=control?.hasAttribute('data-mobile-tile-cancel');
    const isArrange=control?.hasAttribute('data-mobile-tile-arrange');
    setHoveredControl(isCancel ? 'cancel' : isArrange ? 'arrange' : null);
    if (!current.scrollArmed && Math.hypot(event.clientX-current.revealX,event.clientY-current.revealY) >= 12) current.scrollArmed=true;
    if (current.scrollArmed) edgeScroll.start();
    if (control) return;
   }
   if (event.clientX > current.laneRight) return;
   const dx = event.clientX - current.x, dy = event.clientY - current.y;
   if (Math.hypot(dx,dy) < 15) return;
   const direction = OCTANTS[(Math.round(Math.atan2(dy,dx) / (Math.PI / 4)) + 8) % 8];
   const hoveredCommand = current.revealed ? document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-mobile-tile-command]')?.dataset.mobileTileCommand : undefined;
   const command = current.revealed ? hoveredCommand : current.tile.button.swipeCommands?.[direction];
   const currentTile = tiles.find(entry => entry.id === current.tile.id) || current.tile;
   const button = currentTile.commands.find(entry => entry.command === command);
   if (!button || (current.revealed && current.button.command === command)) return;
   if (!current.revealed && current.direction !== direction) {
    current.direction=direction;
    setSwipeFeedback({tileId:current.tile.id,direction,button});haptic(15);
   }
   // Quick swipes only choose a pending command. The hold timer owns revealing
   // the chooser, so releasing before it fires cannot flash the grid.
   current.button = button;
   if (current.revealed) select(currentTile,button);
  },
  onPointerUp:(event: React.PointerEvent<HTMLButtonElement>) => {
   const current = session.current;
   if (!current || current.id !== event.pointerId) return;
   edgeScroll.stop();
   targetHover.clear();
   clearTimer();session.current = null;
   if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
   if (arrangingRef.current) return;
   if (current.revealed) {
    try {
     // Target execution already completed this hold; releasing must never repeat it.
     if (commandSent.current) {close();return;}
     const target = document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-menu-item="true"],button');
     if (target?.hasAttribute('data-mobile-tile-cancel')) {cancel();return;}
     if (target?.hasAttribute('data-mobile-tile-arrange')) {target.click();return;}
     const heldTarget = getHeldTarget(target || null);
     if (heldTarget && isHeldTargetNavigation(heldTarget)) {close();return;}
     if (heldTarget) {
      if (target.hasAttribute('disabled')) {close();return;}
      target.click();
      if (commandSent.current) {close();return;}
      close();return;
     }
     const hoveredCommand = target?.dataset.mobileTileCommand;
     const currentTile = tiles.find(entry => entry.id === current.tile.id) || current.tile;
     const button = currentTile.commands.find(entry => entry.command === hoveredCommand) || current.button;
     // Secondary-touch activation waits 40ms for a native click. Let it settle
     // before deciding whether this release still needs to send the command.
     timer.current = setTimeout(() => {
      try {
       if (!commandSent.current && button.command.trim() && !isCommandTreeSocial(button)) {
        commandSent.current = true;
        execute(button,event);
       }
      } finally {close();}
     },50);
    } catch (error) {
     close();
     throw error;
    }
    return;
   }
   if (current.button.command.trim()) execute(current.button,event);
   close();
   if (current.direction) {
    setSwipeFeedback({tileId:current.tile.id,direction:current.direction,button:current.button});
    feedbackTimer.current=setTimeout(() => {feedbackTimer.current=null;setSwipeFeedback(null);},250);
   }
  },
  onPointerCancel:() => {if (!arrangingRef.current) close();},
  onLostPointerCapture:() => {if (session.current) close();},
  onClick:(event: React.MouseEvent<HTMLButtonElement>) => {
   if (arrangingRef.current || event.detail !== 0 || !tile.button.command.trim()) return;
   const button=tile.commands.find(entry => entry.command === tile.button.command) || tile.button;
   execute(button,event);
  },
  onContextMenu:(event: React.MouseEvent) => event.preventDefault()
 });
 return {activeTile:tiles.find(tile => tile.id === activeTileId),selected,swipeFeedback,select,close,cancel,
  cancelHovered:hoveredControl === 'cancel',arrangeHovered:hoveredControl === 'arrange',
  handlers,scrollRef:edgeScroll.scrollRef,arranging,beginArrange};
};
