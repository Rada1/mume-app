/** @file CommandPanelV2Branches.mobile.test.tsx — Shared mobile roots swap movement for held targets. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import type {CustomButton} from '../../types';
import type {useCommandTree} from '../../hooks/useCommandTree';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
import {createButton} from '../../utils/buttonFactory';
import {CommandPanelV2Branches} from './CommandPanelV2Branches';

// --- Branch Fixtures ---
vi.mock('./CommandPanelViews', () => ({CommandPanelViews: ({children}: {children: React.ReactNode}) => children}));
vi.mock('./CommandTreeMovement', () => ({CommandTreeMovement: () => <button>Move north</button>}));
vi.mock('./CommandTreeHeldTargets', () => ({CommandTreeHeldTargets: () => <section className="command-tree-branch" aria-label="Held targets"/>}));
vi.mock('./CommandTreeSections', () => ({CommandTreeSections: (props: {
    onCommandTouchHoldStart?: (button: CustomButton) => void;
    onCommandTouchHoldEnd?: (button: CustomButton) => void;
}) => {
    const button = createButton({id: 'test-held', label: 'Target command', command: 'hit %n', setId: 'trait-offense'});
    return <section className="command-tree-branch command-tree-main-branch"><button
        onPointerDown={() => props.onCommandTouchHoldStart?.(button)}
        onPointerUp={() => props.onCommandTouchHoldEnd?.(button)}>Hold command</button></section>;
}}));

// --- Movement / Target Swap Checks ---
it.each([0, 2, 3, 4])('shows movement and restores it after a held command in group %s', async group => {
    const controller = {game: {}, shop: {}, isHelpMode: false} as unknown as ReturnType<typeof useCommandTreeController>;
    const clearCommand = vi.fn();
    const tree = {group, targets: [], command: null, cancelPreview: vi.fn(), clearCommand} as unknown as ReturnType<typeof useCommandTree>;
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<CommandPanelV2Branches controller={controller} tree={tree}
            branchListRef={{current: null}} isMobile hasDockSlots mobileReadabilitySplit
            menuHeaderInRootBranch={false} commandMenuHeader={null} categoryMenu={null} onCommandExecuted={vi.fn()}/>));
        expect(host.querySelector('[aria-label="Movement controls"]')).not.toBeNull();
        expect(host.querySelector('.command-tree-movement-map-slot')).not.toBeNull();
        const command = host.querySelector('.command-tree-main-branch button')!;
        await act(async () => command.dispatchEvent(new Event('pointerdown', {bubbles: true})));
        expect(host.querySelector('[aria-label="Held targets"]')).not.toBeNull();
        expect(host.querySelector('[aria-label="Movement controls"]')).toBeNull();
        expect(host.querySelector('.command-tree-movement-map-slot')).toBeNull();
        await act(async () => command.dispatchEvent(new Event('pointerup', {bubbles: true})));
        expect(host.querySelector('[aria-label="Held targets"]')).toBeNull();
        expect(host.querySelector('[aria-label="Movement controls"]')).not.toBeNull();
        expect(host.querySelector('.command-tree-movement-map-slot')).not.toBeNull();
        expect(clearCommand).toHaveBeenCalledOnce();
    } finally { await act(async () => root.unmount()); }
});
