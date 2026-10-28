/** @file useMobileTileArrangement.ts — Tap-to-place and drag-to-place editing without executing commands. */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type React from 'react';
import type { CustomButton, SwipeDirection } from '../types';
import { useHeldCommandEdgeScroll } from './useHeldCommandEdgeScroll';

// --- Editing selection and drag lifetime ---
export const useMobileTileArrangement = (enabled:boolean,scrollRef:RefObject<HTMLDivElement | null>,
 assign:(command:CustomButton,slot:SwipeDirection | 'center' | 'extra') => void) => {
 const [source,setSource] = useState<CustomButton | null>(null);
 const [hoverSlot,setHoverSlot] = useState<string | null>(null);
 const drag = useRef<{id:number;x:number;y:number;button:CustomButton;armed:boolean;moved:boolean;target:HTMLElement} | null>(null);
 const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const suppressClick = useRef(false);
 const edgeScroll = useHeldCommandEdgeScroll(() => undefined,scrollRef);
 const clearHold = () => {if (holdTimer.current !== null) clearTimeout(holdTimer.current);holdTimer.current=null;};
 const endPointer = () => {
  clearHold();
  const current=drag.current;drag.current=null;
  if (current?.target.hasPointerCapture(current.id)) current.target.releasePointerCapture(current.id);
  setHoverSlot(null);edgeScroll.stop();
 };
 const reset = () => {endPointer();setSource(null);};
 useEffect(() => {if (!enabled) reset();},[enabled]);
 // Native scrolling wins until a stationary hold explicitly starts a drag.
 useEffect(() => {
  if (!enabled) return;
  const scroller=scrollRef.current;
  const preventDragScroll = (event:TouchEvent) => {
   if (drag.current?.armed && event.cancelable) event.preventDefault();
  };
  scroller?.addEventListener('touchmove',preventDragScroll,{passive:false});
  return () => {
   scroller?.removeEventListener('touchmove',preventDragScroll);
   clearHold();drag.current=null;
  };
 },[enabled,scrollRef]);
 const dropSlot = (x:number,y:number) => document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-arrange-slot]')?.dataset.arrangeSlot;
 const place = (button:CustomButton,slot:string) => {
  if (!['center','up','ne','right','se','down','sw','left','nw','extra'].includes(slot)) return;
  assign(button,slot as SwipeDirection | 'center' | 'extra');reset();
 };
 const click = (button?:CustomButton,slot?:SwipeDirection | 'center' | 'extra') => {
  if (suppressClick.current) {suppressClick.current=false;return;}
  if (!enabled) return;
  if (source && slot && source.command !== button?.command) {place(source,slot);return;}
  setSource(previous => previous?.command === button?.command ? null : button || null);
 };
 const pointerProps = (button?:CustomButton) => ({
  onPointerDown:(event:React.PointerEvent<HTMLElement>) => {
   if (!enabled || !button || event.button !== 0) return;
   suppressClick.current=false;
   endPointer();
   const current={id:event.pointerId,x:event.clientX,y:event.clientY,button,armed:false,moved:false,target:event.currentTarget};
   drag.current=current;
   holdTimer.current=setTimeout(() => {
    holdTimer.current=null;
    if (drag.current !== current) return;
    current.armed=true;setSource(current.button);
    current.target.setPointerCapture(current.id);
   },300);
   edgeScroll.update(event.clientX,event.clientY);
  },
  onPointerMove:(event:React.PointerEvent<HTMLElement>) => {
   const current=drag.current;
   if (!current || current.id !== event.pointerId) return;
   if (Math.hypot(event.clientX-current.x,event.clientY-current.y) < 8 && !current.moved) return;
   if (!current.armed) {suppressClick.current=true;endPointer();return;}
   current.moved=true;setSource(current.button);
   edgeScroll.update(event.clientX,event.clientY);edgeScroll.start();
   setHoverSlot(dropSlot(event.clientX,event.clientY) || null);
  },
  onPointerUp:(event:React.PointerEvent<HTMLElement>) => {
   const current=drag.current;
   if (!current || current.id !== event.pointerId) return;
   endPointer();
   if (!current.moved) {if (current.armed) suppressClick.current=true;return;}
   suppressClick.current=true;
   const slot=dropSlot(event.clientX,event.clientY);
   if (slot) place(current.button,slot);
  },
  onPointerCancel:() => {endPointer();suppressClick.current=true;},
  onLostPointerCapture:() => {if (drag.current) endPointer();},
  onContextMenu:(event:React.MouseEvent<HTMLElement>) => {if (enabled) event.preventDefault();}
 });
 const onPointerDownCapture = () => {suppressClick.current=false;};
 return {source,hoverSlot,click,pointerProps,onPointerDownCapture};
};
