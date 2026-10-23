// @vitest-environment jsdom
/**
 * @file CommandMountTarget.test.tsx
 * @description Verifies hover-to-expand, click-to-pin, and floating popover behavior for mount cargo.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommandActionTargetEntry } from '../../../objects/commandActionTargetModel';
import { CommandMountTarget } from './CommandMountTarget';

const mockToggle = vi.fn();
let mockMountState = {
    isMount: true,
    targets: [{ id: 'cargo-1', label: 'Iron Dagger', context: 'dagger', keyword: 'dagger', group: 'objects', category: 'cat-object', scope: 'room' as const }],
    loading: false,
    open: false,
    toggle: mockToggle,
    containerId: 'mount-1'
};

vi.mock('../../../hooks/useCommandMountContents', () => ({
    useCommandMountContents: () => mockMountState
}));

const mockEntry: CommandActionTargetEntry = {
    id: 'mount-1', label: 'a swift warhorse', context: 'horse', keyword: 'horse', group: 'objects', category: 'cat-mount', scope: 'room'
};

describe('CommandMountTarget popover workflow', () => {
    afterEach(() => {
        cleanup();
        mockToggle.mockClear();
    });

    it('opens popover on hover and closes on mouse leave when unpinned', () => {
        mockMountState = { ...mockMountState, isMount: true, open: false };
        const { container } = render(
            <CommandMountTarget entry={mockEntry} onSelect={vi.fn()} checkboxPropsForEntry={() => null} levelCheckboxPropsForEntries={() => null}>
                <span>Warhorse</span>
            </CommandMountTarget>
        );

        const mountTarget = container.querySelector('.command-mount-target') as HTMLElement;
        expect(container.querySelector('.command-mount-popover')).toBeNull();

        // Mouse enter opens the popover
        fireEvent.mouseEnter(mountTarget);
        expect(container.querySelector('.command-mount-popover')).not.toBeNull();
        expect(mockToggle).toHaveBeenCalledTimes(1);

        // Mouse leave closes the popover
        fireEvent.mouseLeave(mountTarget);
        expect(container.querySelector('.command-mount-popover')).toBeNull();
    });

    it('pins popover open on click so mouse leave retains the popover', () => {
        mockMountState = { ...mockMountState, isMount: true, open: false };
        const { container } = render(
            <CommandMountTarget entry={mockEntry} onSelect={vi.fn()} checkboxPropsForEntry={() => null} levelCheckboxPropsForEntries={() => null}>
                <span>Warhorse</span>
            </CommandMountTarget>
        );

        const mountTarget = container.querySelector('.command-mount-target') as HTMLElement;
        const toggleBtn = screen.getByRole('button', { name: /Expand a swift warhorse contents/i });

        // Click to pin
        fireEvent.click(toggleBtn);
        expect(toggleBtn.getAttribute('data-pinned')).toBe('true');
        expect(container.querySelector('.command-mount-popover')).not.toBeNull();

        // Mouse leave while pinned keeps it open
        fireEvent.mouseLeave(mountTarget);
        expect(container.querySelector('.command-mount-popover')).not.toBeNull();

        // Click again to unpin
        fireEvent.click(toggleBtn);
        expect(toggleBtn.getAttribute('data-pinned')).toBeNull();

        // Mouse leave now closes it
        fireEvent.mouseLeave(mountTarget);
        expect(container.querySelector('.command-mount-popover')).toBeNull();
    });
});
