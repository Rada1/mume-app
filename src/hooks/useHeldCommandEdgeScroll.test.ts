// @vitest-environment jsdom
/** @file useHeldCommandEdgeScroll.test.ts — Held scrolling continues beyond the command menu edges. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useHeldCommandEdgeScroll } from './useHeldCommandEdgeScroll';

// --- Scroll and frame fixtures ---
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.replaceChildren(); });

it('keeps scrolling above the state bar and below the footer, then stops in the center', () => {
 let tick: FrameRequestCallback = () => {};
 vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { tick = callback; return 1; });
 vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
 const scroller = document.createElement('div');
 document.body.append(scroller);
 Object.defineProperties(scroller, { scrollHeight: {value: 2000}, clientHeight: {value: 200} });
 scroller.getBoundingClientRect = () => ({left: 0, right: 200, top: 200, bottom: 400, height: 200, width: 200, x: 0, y: 200, toJSON: () => ({})});
 scroller.scrollTop = 500;
 const { result } = renderHook(() => useHeldCommandEdgeScroll(vi.fn(), {current: scroller}));
 const originalHitTest = document.elementFromPoint;
 document.elementFromPoint = () => null;
 try {
  act(() => { result.current.update(100, 20); result.current.start(); tick(16); });
  expect(scroller.scrollTop).toBeLessThan(500);
  const beforeDown = scroller.scrollTop;
  act(() => { result.current.update(100, 700); tick(32); });
  expect(scroller.scrollTop).toBeGreaterThan(beforeDown);
  const beforeCenter = scroller.scrollTop;
  act(() => { result.current.update(100, 300); tick(48); });
  expect(scroller.scrollTop).toBe(beforeCenter);
  act(() => result.current.stop());
  expect(window.cancelAnimationFrame).toHaveBeenCalled();
 } finally { document.elementFromPoint = originalHitTest; }
});

it('does not scroll the command list while the finger is in the adjacent target lane', () => {
 let tick: FrameRequestCallback = () => {};
 vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { tick = callback; return 1; });
 vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
 const scroller = document.createElement('div');
 document.body.append(scroller);
 Object.defineProperties(scroller, {scrollHeight: {value: 2000}, clientHeight: {value: 200}});
 scroller.getBoundingClientRect = () => ({left: 0, right: 200, top: 200, bottom: 400, height: 200, width: 200, x: 0, y: 200, toJSON: () => ({})});
 const {result} = renderHook(() => useHeldCommandEdgeScroll(vi.fn(), {current: scroller}));
 act(() => { result.current.update(300, 700); result.current.start(); tick(16); });
 expect(scroller.scrollTop).toBe(0);
});
