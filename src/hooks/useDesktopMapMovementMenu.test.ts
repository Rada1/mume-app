// @vitest-environment jsdom
/** @file useDesktopMapMovementMenu.test.ts — Menus open to the right and retain the hover bridge. */
import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {useDesktopMapMovementMenu} from './useDesktopMapMovementMenu';

// --- Hover fixtures ---
afterEach(() => { cleanup(); vi.useRealTimers(); });
const anchor = () => {
 const button=document.createElement('button');
 button.getBoundingClientRect=()=>({left:100, right:164, top:200, bottom:264, width:64, height:64, x:100, y:200, toJSON:()=>({})});
 return button;
};
it.each(['n','e','d','follow'])('opens the %s menu to the right of its button', direction => {
 const {result}=renderHook(()=>useDesktopMapMovementMenu(vi.fn()));
 act(()=>result.current.show(direction,anchor()));
 expect(result.current.menu?.style.left).toBe(172);
 expect(result.current.menu?.direction).toBe(direction);
});

it('lets the pointer cross into the menu, and clears the preview when it closes', () => {
 vi.useFakeTimers();
 const clear=vi.fn();
 const {result}=renderHook(()=>useDesktopMapMovementMenu(clear));
 act(()=>result.current.show('n',anchor()));
 act(()=>{result.current.scheduleClose();vi.advanceTimersByTime(100);result.current.cancelClose();vi.advanceTimersByTime(200);});
 expect(result.current.menu).not.toBeNull();
 act(()=>{result.current.scheduleClose();vi.advanceTimersByTime(200);});
 expect(result.current.menu).toBeNull();
 expect(clear).toHaveBeenCalled();
});
