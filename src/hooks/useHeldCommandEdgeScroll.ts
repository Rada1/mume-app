/** @file useHeldCommandEdgeScroll.ts — Frame-coalesced edge scrolling for the held command chooser. */
import { useEffect, useRef, type RefObject } from 'react';

// --- Held pointer and animation lifetime ---
const TARGET_BRANCH_SELECTOR = '[data-mobile-tile-target-lane] .command-tree-branch:not(.command-tree-main-branch)';
// Scrolls one list when the held pointer is in its horizontal lane and near or beyond its top/bottom edge.
const scrollNearEdge = (scroller:HTMLElement,point:{x:number;y:number},elapsed:number):boolean => {
 if (!scroller.isConnected || scroller.scrollHeight <= scroller.clientHeight) return false;
 const rect=scroller.getBoundingClientRect();
 const zone=Math.min(44,rect.height / 4);
 // Keep scrolling beyond the vertical edges, including the footer and state bar.
 // The horizontal bounds keep a finger in the adjacent target lane independent.
 if (zone <= 0 || point.x < rect.left || point.x > rect.right) return false;
 const strength=point.y < rect.top+zone ? -Math.min(1,(rect.top+zone-point.y)/zone)
  : point.y > rect.bottom-zone ? Math.min(1,(point.y-(rect.bottom-zone))/zone) : 0;
 const before=scroller.scrollTop;
 scroller.scrollTop += strength * 640 * elapsed / 1000;
 return scroller.scrollTop !== before;
};
export const useHeldCommandEdgeScroll = (onHover:(command:string) => void,externalRef?:RefObject<HTMLDivElement | null>,onTargetScroll?:(x:number,y:number) => void) => {
 const localRef = useRef<HTMLDivElement>(null);
 const scrollRef = externalRef || localRef;
 const hoverRef = useRef(onHover); hoverRef.current = onHover;
 const targetScrollRef = useRef(onTargetScroll); targetScrollRef.current = onTargetScroll;
 const pointer = useRef<{x:number;y:number} | null>(null);
 const frame = useRef<number | null>(null);
 const active = useRef(false);
 const previousTime = useRef<number | null>(null);
 const stop = () => {
  active.current=false; previousTime.current=null;
  if (frame.current !== null) cancelAnimationFrame(frame.current);
  frame.current=null;
 };
 const tick = (time:number) => {
  if (!active.current) {frame.current=null;return;}
  const scroller=scrollRef.current, point=pointer.current;
  const elapsed=Math.min(32,previousTime.current === null ? 16 : time-previousTime.current);
  previousTime.current=time;
  if (point) {
   if (scroller && scrollNearEdge(scroller,point,elapsed)) {
    const rect=scroller.getBoundingClientRect();
    const y=Math.max(rect.top+1,Math.min(rect.bottom-1,point.y));
    const command=document.elementFromPoint(point.x,y)?.closest<HTMLElement>('[data-mobile-tile-command]')?.dataset.mobileTileCommand;
    if (command) hoverRef.current(command);
   }
   let targetScrolled=false;
   document.querySelectorAll<HTMLElement>(TARGET_BRANCH_SELECTOR).forEach(branch => {
    if (scrollNearEdge(branch,point,elapsed)) targetScrolled=true;
   });
   if (targetScrolled) targetScrollRef.current?.(point.x,point.y);
  }
  frame.current=requestAnimationFrame(tick);
 };
 const start = () => {active.current=true;if (frame.current === null) frame.current=requestAnimationFrame(tick);};
 const update = (x:number,y:number) => {pointer.current={x,y};};
 useEffect(() => stop,[]);
 return {scrollRef,start,stop,update};
};
