/** @file CommandTreeMovement.mobile.test.tsx — Go opens the directional submenu on desktop and mobile. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CommandTreeSections } from './CommandTreeSections';
import { CommandTreeMovement } from './CommandTreeMovement';
import { COMMAND_TREE_MOVE_BUTTON } from '../../utils/commandTreeMovement';
import type { useCommandTree } from '../../hooks/useCommandTree';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';

// --- Stub MovementPad to inspect props ---
vi.mock('./MovementPad', () => ({
    MovementPad: ({ onCommand, disabled }: { onCommand?: (cmd: string) => void; disabled?: boolean }) => (
        <div data-testid="mock-movement-pad" data-disabled={disabled}>
            <button type="button" onClick={() => onCommand?.('north')}>North</button>
        </div>
    )
}));

it('opens Go on desktop without mounting an inline pad in the command list', async () => {
    const chooseCommand = vi.fn();
    const controller = {
        game: { viewport: { isMobile: false }, gameState: 'playing', isSpectateMode: false, executeCommand: vi.fn() },
        previewEntity: vi.fn()
    } as unknown as ReturnType<typeof useCommandTreeController>;
    const tree = {
        group: 1,
        grouped: Array.from({ length: 6 }, () => ({ label: 'Movement' })),
        commandSections: [{ label: 'Movement', buttons: [COMMAND_TREE_MOVE_BUTTON] }],
        command: null,
        defer: (cb: () => void) => cb(),
        cancelPreview: vi.fn(),
        chooseCommand,
        targetsFor: () => []
    } as unknown as ReturnType<typeof useCommandTree>;

    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<CommandTreeSections controller={controller} tree={tree} />));
        expect(host.querySelector('[data-testid="mock-movement-pad"]')).toBeNull();
        const moveRow = Array.from(host.querySelectorAll<HTMLButtonElement>('.command-tree-row')).find(btn => btn.textContent?.includes('Go'))!;
        expect(moveRow).toBeDefined();
        await act(async () => moveRow.click());
        expect(chooseCommand).toHaveBeenCalledExactlyOnceWith(COMMAND_TREE_MOVE_BUTTON);
    } finally {
        await act(async () => root.unmount());
    }
});

it('opens Go on mobile without mounting an inline pad in the command list', async () => {
    const chooseCommand = vi.fn();
    const controller = {
        game: { viewport: { isMobile: true }, gameState: 'playing', isSpectateMode: false, executeCommand: vi.fn() },
        previewEntity: vi.fn()
    } as unknown as ReturnType<typeof useCommandTreeController>;
    const tree = {
        group: 1,
        grouped: Array.from({ length: 6 }, () => ({ label: 'Movement' })),
        commandSections: [{ label: 'Movement', buttons: [COMMAND_TREE_MOVE_BUTTON] }],
        command: null,
        defer: (cb: () => void) => cb(),
        cancelPreview: vi.fn(),
        chooseCommand,
        targetsFor: () => []
    } as unknown as ReturnType<typeof useCommandTree>;

    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<CommandTreeSections controller={controller} tree={tree} />));
        // Inline MovementPad is NOT present in main menu
        expect(host.querySelector('[data-testid="mock-movement-pad"]')).toBeNull();
        // Move command row is present with chevron
        const moveRow = Array.from(host.querySelectorAll('.command-tree-row')).find(btn => btn.textContent?.includes('Go')) as HTMLButtonElement;
        expect(moveRow).toBeDefined();
        expect(moveRow.querySelector('.command-tree-row-chevron')).not.toBeNull();

        // Clicking Move invokes chooseCommand
        await act(async () => moveRow.click());
        expect(chooseCommand).toHaveBeenCalledWith(COMMAND_TREE_MOVE_BUTTON);
    } finally {
        await act(async () => root.unmount());
    }
});

it('renders MovementPad inside CommandTreeMovement when Move submenu branch is open', async () => {
    const executeCommand = vi.fn();
    const controller = {
        game: { viewport: { isMobile: true }, gameState: 'playing', isSpectateMode: false, executeCommand },
        isHelpMode: false
    } as unknown as ReturnType<typeof useCommandTreeController>;

    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<CommandTreeMovement controller={controller} />));
        const pad = host.querySelector('[data-testid="mock-movement-pad"]');
        expect(pad).not.toBeNull();

        const northBtn = host.querySelector('button');
        await act(async () => northBtn?.click());
        expect(executeCommand).toHaveBeenCalledWith('north');
    } finally {
        await act(async () => root.unmount());
    }
});
