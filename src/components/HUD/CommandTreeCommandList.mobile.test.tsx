/** @file CommandTreeCommandList.mobile.test.tsx — Mobile readability requires explicit target selection. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach, expect, it, vi} from 'vitest';
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
beforeEach(() => vi.clearAllMocks());

it.each([
    {group: 0, command: 'hit %n'}, {group: 2, command: 'look %n'},
    {group: 3, command: 'get %n'}, {group: 3, command: 'put %n'},
    {group: 4, command: 'wave %n'}, {group: 4, command: 'tell %n'}
])('holds $command in group $group without executing the release click', async ({group, command}) => {
    vi.useFakeTimers();
    const onHold = vi.fn();
    const onRelease = vi.fn();
    const handleButtonClick = vi.fn();
    const button = createButton({id: 'test-held-command', label: command, command, setId: 'trait-utility'});
    const tree = {group, targetsFor: () => [], command: null, cancelPreview: vi.fn()} as unknown as ReturnType<typeof useCommandTree>;
    const controller = {game: {viewport: {isMobile: true}, handleButtonClick}, isHelpMode: false} as unknown as ReturnType<typeof useCommandTreeController>;
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<CommandTreeCommandList buttons={[button]} tree={tree} controller={controller}
            explicitTargetSelection onTouchHoldStart={onHold} onTouchHoldEnd={onRelease}/>));
        const row = host.querySelector('button')!;
        const pointer = (name: string) => {
            const event = new Event(name, {bubbles: true});
            Object.defineProperties(event, {pointerType: {value: 'touch'}, pointerId: {value: 1},
                clientX: {value: 10}, clientY: {value: 10}, button: {value: 0}});
            row.dispatchEvent(event);
        };
        await act(async () => { pointer('pointerdown'); await vi.advanceTimersByTimeAsync(120); });
        expect(onHold).toHaveBeenCalledExactlyOnceWith(button);
        await act(async () => { pointer('pointerup'); row.click(); });
        expect(onRelease).toHaveBeenCalledExactlyOnceWith(button);
        expect(handleButtonClick).not.toHaveBeenCalled();
    } finally {
        await act(async () => root.unmount());
        vi.useRealTimers();
    }
});

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

it('does not open a desktop preview on pointer focus before executing a click, while retaining keyboard focus', async () => {
    const chooseCommand = vi.fn();
    const button = createButton({id: 'test-hit', label: 'Hit', command: 'hit %n', setId: 'trait-offense'});
    const tree = {targetsFor: () => [], command: null, chooseCommand, cancelPreview: vi.fn()} as unknown as ReturnType<typeof useCommandTree>;
    const controller = {game: {viewport: {isMobile: false}}, isHelpMode: false} as unknown as ReturnType<typeof useCommandTreeController>;
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<CommandTreeCommandList buttons={[button]} tree={tree} controller={controller}/>));
        const row = host.querySelector('button')!;
        const focusVisible = vi.spyOn(row, 'matches').mockReturnValue(false);
        await act(async () => row.dispatchEvent(new FocusEvent('focusin', {bubbles: true})));
        await act(async () => row.click());
        expect(chooseCommand).not.toHaveBeenCalled();
        expect(executeDefaultCommandTarget).toHaveBeenCalledTimes(1);
        focusVisible.mockReturnValue(true);
        await act(async () => row.dispatchEvent(new FocusEvent('focusin', {bubbles: true})));
        expect(chooseCommand).toHaveBeenCalledExactlyOnceWith(button);
    } finally {
        await act(async () => root.unmount());
    }
});
