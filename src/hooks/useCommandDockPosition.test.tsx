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

it('resolves the active group button dynamically when opened programmatically (e.g. from shop chip)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);

    const HarnessGroup = ({ activeGroup }: { activeGroup: number }) => {
        const { position } = useCommandDockPosition(false, true, activeGroup);
        return (
            <div>
                <nav className="command-tree-root-actions">
                    <button type="button" className="command-tree-row" aria-expanded={activeGroup === 0}>Abilities</button>
                    <button type="button" className="command-tree-row" aria-expanded={activeGroup === 1}>Movement</button>
                    <button type="button" className="command-tree-row" aria-expanded={activeGroup === 2}>Vision</button>
                    <button type="button" className="command-tree-row" aria-expanded={activeGroup === 3}>Objects</button>
                </nav>
                <output data-testid="right-pos">{position?.right}</output>
            </div>
        );
    };

    try {
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            if (this.textContent === 'Abilities') {
                return { top: 742, bottom: 800, right: 580, left: 400, width: 180, height: 58, x: 400, y: 742, toJSON: () => ({}) };
            }
            if (this.textContent === 'Objects') {
                return { top: 742, bottom: 800, right: 835, left: 750, width: 85, height: 58, x: 750, y: 742, toJSON: () => ({}) };
            }
            return { top: 0, bottom: 0, right: 0, left: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) };
        });

        // Initially opened to Abilities (0): right should be 1000 - 580 = 420
        act(() => root.render(<HarnessGroup activeGroup={0} />));
        const out0 = host.querySelector('[data-testid="right-pos"]');
        expect(out0?.textContent).toBe('420');

        // External request switches to Objects (3): right should be 1000 - 835 = 165
        act(() => root.render(<HarnessGroup activeGroup={3} />));
        const out3 = host.querySelector('[data-testid="right-pos"]');
        expect(out3?.textContent).toBe('165');
    } finally {
        act(() => root.unmount());
        host.remove();
        vi.restoreAllMocks();
    }
});
