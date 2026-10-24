/** @file useUpwardCommandBranches.test.tsx — Verifies submenu vertical clamping, full-height expansion, and section ordering. */
// @vitest-environment jsdom
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUpwardCommandBranches } from './useUpwardCommandBranches';
import { CommandTreeSections } from '../components/HUD/CommandTreeSections';
import type { useCommandTreeController } from './useCommandTreeController';
import type { useCommandTree } from './useCommandTree';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const mockRect = (el: HTMLElement, getRect: () => { top: number; bottom: number; height: number }) => {
    vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => {
        const { top, bottom, height } = getRect();
        return {
            top,
            bottom,
            height,
            left: 0,
            right: 220,
            width: 220,
            x: 0,
            y: top,
            toJSON: () => ({})
        } as DOMRect;
    });
};

// --- Submenu Alignment & Full-Height Clamping ---
describe('useUpwardCommandBranches', () => {
    it('keeps a short submenu top-aligned with its parent command row when there is room below', () => {
        Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
        const ref = React.createRef<HTMLDivElement>();
        const Harness = () => {
            useUpwardCommandBranches(ref, true, 'commands');
            return (
                <div ref={ref} className="command-tree-branches">
                    <section className="command-tree-branch" data-testid="parent">
                        <button type="button" className="command-tree-row" aria-expanded="true">Buy</button>
                    </section>
                    <section className="command-tree-branch" data-testid="submenu">
                        <div>Target 1</div>
                    </section>
                </div>
            );
        };

        const { getByTestId, container } = render(<Harness />);
        const list = container.querySelector('.command-tree-branches') as HTMLElement;
        const parent = getByTestId('parent');
        const anchor = parent.querySelector('.command-tree-row') as HTMLElement;
        const submenu = getByTestId('submenu');

        let submenuOffset = 0;
        mockRect(list, () => ({ top: 400, bottom: 840, height: 440 }));
        mockRect(parent, () => ({ top: 400, bottom: 840, height: 440 }));
        mockRect(anchor, () => ({ top: 520, bottom: 553, height: 33 }));
        mockRect(submenu, () => {
            const match = /translateY\((-?\d+)px\)/.exec(submenu.style.transform);
            submenuOffset = match ? Number(match[1]) : 0;
            const naturalTop = 740;
            return { top: naturalTop + submenuOffset, bottom: naturalTop + 100 + submenuOffset, height: 100 };
        });

        window.dispatchEvent(new Event('resize'));
        // Trigger synchronous align via re-render with enabled toggle
        cleanup();
        const HarnessWithInit = () => {
            const localRef = React.useRef<HTMLDivElement>(null);
            React.useLayoutEffect(() => {
                const listEl = localRef.current!;
                const [parentEl, subEl] = Array.from(listEl.querySelectorAll<HTMLElement>('.command-tree-branch'));
                const anchorEl = parentEl.querySelector<HTMLElement>('.command-tree-row')!;
                mockRect(listEl, () => ({ top: 400, bottom: 840, height: 440 }));
                mockRect(parentEl, () => ({ top: 400, bottom: 840, height: 440 }));
                mockRect(anchorEl, () => ({ top: 520, bottom: 553, height: 33 }));
                mockRect(subEl, () => {
                    const match = /translateY\((-?\d+)px\)/.exec(subEl.style.transform);
                    const offset = match ? Number(match[1]) : 0;
                    const naturalTop = 740;
                    return { top: naturalTop + offset, bottom: naturalTop + 100 + offset, height: 100 };
                });
            }, []);
            useUpwardCommandBranches(localRef, true, 'commands');
            return (
                <div ref={localRef} className="command-tree-branches">
                    <section className="command-tree-branch">
                        <button type="button" className="command-tree-row" aria-expanded="true">Buy</button>
                    </section>
                    <section className="command-tree-branch" data-testid="sub-short">
                        <div>Target 1</div>
                    </section>
                </div>
            );
        };
        const res = render(<HarnessWithInit />);
        const subShort = res.getByTestId('sub-short');
        expect(subShort.style.maxHeight).toBe('832px');
        // Natural top is 740, anchor top is 520, height is 100 (520 + 100 = 620 <= 840), so desiredTop = 520 -> offset = -220
        expect(subShort.style.transform).toBe('translateY(-220px)');
        const finalRect = subShort.getBoundingClientRect();
        expect(finalRect.top).toBe(520);
        expect(finalRect.bottom).toBe(620);
    });

    it('expands a long submenu (like Shop stock) all the way from top to bottom while staying inline with the command row', () => {
        Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
        const HarnessLong = () => {
            const localRef = React.useRef<HTMLDivElement>(null);
            React.useLayoutEffect(() => {
                const listEl = localRef.current!;
                const [parentEl, subEl] = Array.from(listEl.querySelectorAll<HTMLElement>('.command-tree-branch'));
                const anchorEl = parentEl.querySelector<HTMLElement>('.command-tree-row')!;
                mockRect(listEl, () => ({ top: 400, bottom: 840, height: 440 }));
                mockRect(parentEl, () => ({ top: 400, bottom: 840, height: 440 }));
                mockRect(anchorEl, () => ({ top: 650, bottom: 683, height: 33 }));
                mockRect(subEl, () => {
                    const match = /translateY\((-?\d+)px\)/.exec(subEl.style.transform);
                    const offset = match ? Number(match[1]) : 0;
                    const maxH = parseInt(subEl.style.maxHeight || '832', 10);
                    const height = Math.min(1200, maxH); // Long list clamped by maxHeight (832px)
                    const naturalTop = 840 - height;
                    return { top: naturalTop + offset, bottom: naturalTop + height + offset, height };
                });
            }, []);
            useUpwardCommandBranches(localRef, true, 'commands');
            return (
                <div ref={localRef} className="command-tree-branches">
                    <section className="command-tree-branch">
                        <button type="button" className="command-tree-row" aria-expanded="true">Compare</button>
                    </section>
                    <section className="command-tree-branch" data-testid="sub-long">
                        <div>Long shop stock list</div>
                    </section>
                </div>
            );
        };

        const res = render(<HarnessLong />);
        const subLong = res.getByTestId('sub-long');
        expect(subLong.style.maxHeight).toBe('832px');
        const finalRect = subLong.getBoundingClientRect();
        // Goes all the way to the top (8px) and all the way to the bottom (840px), covering the row at 650..683
        expect(finalRect.top).toBe(8);
        expect(finalRect.bottom).toBe(840);
        expect(finalRect.top).toBeLessThanOrEqual(650);
        expect(finalRect.bottom).toBeGreaterThanOrEqual(683);
    });

    it('assigns increasing z-index to deeper submenus so the lowest tier submenu shadow wins on top', () => {
        const HarnessMulti = () => {
            const localRef = React.useRef<HTMLDivElement>(null);
            useUpwardCommandBranches(localRef, true, 'commands');
            return (
                <div ref={localRef} className="command-tree-branches">
                    <section className="command-tree-branch" data-testid="col-0">
                        <button type="button" className="command-tree-row" aria-expanded="true">Parent</button>
                    </section>
                    <section className="command-tree-branch" data-testid="col-1">
                        <button type="button" className="command-tree-row" aria-expanded="true">Sub</button>
                    </section>
                    <section className="command-tree-branch" data-testid="col-2">
                        <div>Leaf</div>
                    </section>
                </div>
            );
        };

        const res = render(<HarnessMulti />);
        const col0 = res.getByTestId('col-0');
        const col1 = res.getByTestId('col-1');
        const col2 = res.getByTestId('col-2');

        expect(Number(col0.style.zIndex)).toBe(10);
        expect(Number(col1.style.zIndex)).toBe(11);
        expect(Number(col2.style.zIndex)).toBe(12);
        expect(Number(col2.style.zIndex)).toBeGreaterThan(Number(col1.style.zIndex));
        expect(Number(col1.style.zIndex)).toBeGreaterThan(Number(col0.style.zIndex));
    });

    it('always forces shop target menus to max height with listings at the top even if they have few items', () => {
        Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
        const HarnessShopShort = () => {
            const localRef = React.useRef<HTMLDivElement>(null);
            React.useLayoutEffect(() => {
                const listEl = localRef.current!;
                const [parentEl, subEl] = Array.from(listEl.querySelectorAll<HTMLElement>('.command-tree-branch'));
                const anchorEl = parentEl.querySelector<HTMLElement>('.command-tree-row')!;
                mockRect(listEl, () => ({ top: 400, bottom: 840, height: 440 }));
                mockRect(parentEl, () => ({ top: 400, bottom: 840, height: 440 }));
                mockRect(anchorEl, () => ({ top: 600, bottom: 633, height: 33 }));
                mockRect(subEl, () => {
                    const match = /translateY\((-?\d+)px\)/.exec(subEl.style.transform);
                    const offset = match ? Number(match[1]) : 0;
                    const height = 832;
                    const naturalTop = 8;
                    return { top: naturalTop + offset, bottom: naturalTop + height + offset, height };
                });
            }, []);
            useUpwardCommandBranches(localRef, true, 'commands');
            return (
                <div ref={localRef} className="command-tree-branches">
                    <section className="command-tree-branch">
                        <button type="button" className="command-tree-row" aria-expanded="true">Buy</button>
                    </section>
                    <section className="command-tree-branch command-tree-shop-stock-targets" data-testid="shop-short">
                        <div>1 item in category</div>
                    </section>
                </div>
            );
        };

        const res = render(<HarnessShopShort />);
        const shopShort = res.getByTestId('shop-short');
        expect(shopShort.style.maxHeight).toBe('832px');
        expect(shopShort.style.height).toBe('832px');
        const finalRect = shopShort.getBoundingClientRect();
        expect(finalRect.top).toBe(8);
        expect(finalRect.bottom).toBe(840);
    });
});

// --- Top-to-Bottom Section Order ---
describe('CommandTreeSections order', () => {
    it('renders command sections in top-to-bottom order without reversing', () => {
        const tree = {
            group: 3,
            grouped: [
                { label: 'Abilities', buttons: [] },
                { label: 'Movement', buttons: [] },
                { label: 'Vision', buttons: [] },
                { label: 'Objects', buttons: [] }
            ],
            commandSections: [
                { label: 'Equipment', buttons: [] },
                { label: 'Move items', buttons: [] },
                { label: 'Use items', buttons: [] },
                { label: 'Shop', buttons: [] }
            ]
        } as unknown as ReturnType<typeof useCommandTree>;
        const controller = {} as unknown as ReturnType<typeof useCommandTreeController>;

        const { container } = render(<CommandTreeSections controller={controller} tree={tree} />);
        const headings = Array.from(container.querySelectorAll('.command-tree-section-heading-label')).map(el => el.textContent);
        expect(headings).toEqual(['Equipment', 'Move items', 'Use items', 'Shop']);
    });
});
