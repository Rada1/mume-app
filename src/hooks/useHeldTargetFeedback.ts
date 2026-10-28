/** @file useHeldTargetFeedback.ts — Matching chip flash and haptics for explicit held-target execution. */
import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';

// --- Target click attribution and feedback ---
export const useHeldTargetFeedback = (haptic:(duration:number) => void) => {
 const clicked = useRef<HTMLElement | null>(null);
 const flashed = useRef<HTMLElement | null>(null);
 const consumed = useRef(false);
 const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const clear = () => {
  if (timer.current !== null) clearTimeout(timer.current);
  flashed.current?.classList.remove('mobile-target-command-sent');
  timer.current=null;flashed.current=null;
 };
 useEffect(() => clear,[]);
 const recordClick = useCallback((event:React.MouseEvent<HTMLElement>) => {
  const target=event.target instanceof Element ? event.target.closest<HTMLElement>('button,[data-menu-item="true"]') : null;
  const branch=target?.closest('.command-tree-branch');
  if (!target || target.hasAttribute('disabled') || !branch || branch.matches('.command-tree-main-branch:not(.is-follow-target-branch),.is-movement-branch')) return;
  clicked.current=target;consumed.current=false;
 },[]);
 const sent = useCallback((alreadyHaptic=false) => {
  if (consumed.current) return;
  consumed.current=true;
  if (!alreadyHaptic) haptic(20);
  clear();
  const element=clicked.current;
  if (!element?.isConnected) return;
  flashed.current=element;element.classList.add('mobile-target-command-sent');
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
   element.animate([{filter:'brightness(1.45)',transform:'scale(.97)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:180});
  }
  timer.current=setTimeout(clear,200);
 },[haptic]);
 return {recordClick,sent};
};
