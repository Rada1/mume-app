/** @file useCommandDockPosition.test.tsx — Guards against log scrolling remeasuring the command dock. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useCommandDockPosition } from './useCommandDockPosition';

// --- Logic Section ---
it('ignores unrelated scrolling, coalesces resize, and stops measuring closed menus', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {frames.push(callback); return frames.length;});
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('ResizeObserver', class {observe() {} disconnect() {}});
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockReturnValue({x:0,y:400,top:400,bottom:440,left:0,right:100,width:100,height:40,toJSON:() => ({})});
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const Harness = ({open}: {open:boolean}) => {
        const {anchorRef, position} = useCommandDockPosition(true, open);
        return <><button ref={element => {anchorRef.current = element;}}>Commands</button><div id="log"/><output>{position?.bottom}</output></>;
    };
    const flush = () => act(() => {frames.splice(0).forEach(callback => callback(0));});
    try {
        act(() => root.render(<Harness open />));
        flush();
        const initial = measure.mock.calls.length;
        host.querySelector('#log')!.dispatchEvent(new Event('scroll'));
        flush();
        expect(measure).toHaveBeenCalledTimes(initial);
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(measure).toHaveBeenCalledTimes(initial + 1);
        act(() => root.render(<Harness open={false}/>));
        window.dispatchEvent(new Event('resize'));
        flush();
        expect(measure).toHaveBeenCalledTimes(initial + 1);
    } finally {
        act(() => root.unmount());
        host.remove();
        measure.mockRestore();
        vi.unstubAllGlobals();
    }
});
