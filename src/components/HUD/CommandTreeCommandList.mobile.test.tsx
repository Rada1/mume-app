/** @file CommandTreeCommandList.mobile.test.tsx — Mobile readability requires explicit target selection. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import {CommandTreeCommandList} from './CommandTreeCommandList';
import {executeDefaultCommandTarget} from '../../hooks/commandDefaultTarget';
import {createButton} from '../../utils/buttonFactory';
import type {useCommandTree} from '../../hooks/useCommandTree';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';

// --- Default Target Regression Section ---
vi.mock('../../hooks/commandDefaultTarget', () => ({
    executeDefaultCommandTarget: vi.fn(() => true),
    getDefaultCommandTarget: vi.fn(() => null)
}));
vi.mock('./CommandTreeAction', () => ({CommandTreeAction: () => null}));

it('opens targets on tap even when a command could execute against the current target', async () => {
    const chooseCommand = vi.fn();
    const onCommandExecuted = vi.fn();
    const button = createButton({id: 'test-bash', label: 'Bash', command: 'bash %n', setId: 'trait-combat'});
    const tree = {targetsFor: () => [], command: null, chooseCommand, cancelPreview: vi.fn()} as unknown as ReturnType<typeof useCommandTree>;
    const controller = {game: {viewport: {isMobile: true}}, isHelpMode: false} as unknown as ReturnType<typeof useCommandTreeController>;
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<CommandTreeCommandList buttons={[button]} tree={tree} controller={controller}
            explicitTargetSelection onCommandExecuted={onCommandExecuted}/>));
        const row = host.querySelector('button')!;
        await act(async () => row.click());
        await act(async () => row.click());
        expect(chooseCommand).toHaveBeenCalledTimes(2);
        expect(chooseCommand).toHaveBeenLastCalledWith(button);
        expect(executeDefaultCommandTarget).not.toHaveBeenCalled();
        expect(onCommandExecuted).not.toHaveBeenCalled();
        expect(row.getAttribute('aria-expanded')).toBe('false');
    } finally {
        await act(async () => root.unmount());
    }
});
