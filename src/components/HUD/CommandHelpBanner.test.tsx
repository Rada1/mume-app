/**
 * @file CommandHelpBanner.test.tsx
 * @description Unit tests for CommandHelpBanner input and actions.
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CommandHelpBanner } from './CommandHelpBanner';

describe('CommandHelpBanner', () => {
    afterEach(() => {
        cleanup();
    });
    it('renders explanation, input box, submit button and close button', () => {
        const onExecuteHelp = vi.fn();
        const onCancel = vi.fn();

        render(
            <CommandHelpBanner
                onExecuteHelp={onExecuteHelp}
                onCancel={onCancel}
            />
        );

        expect(screen.getByText(/Click any command, log text, or search below:/i)).toBeTruthy();
        expect(screen.getByRole('textbox', { name: /Help topic search/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Cancel command help mode/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Help' })).toBeTruthy();
    });

    it('submits help topic on form submit or Enter', () => {
        const onExecuteHelp = vi.fn();
        const onCancel = vi.fn();

        render(
            <CommandHelpBanner
                onExecuteHelp={onExecuteHelp}
                onCancel={onCancel}
            />
        );

        const input = screen.getByRole('textbox', { name: /Help topic search/i });
        fireEvent.change(input, { target: { value: 'cure light' } });

        const submitBtn = screen.getByRole('button', { name: 'Help' });
        fireEvent.click(submitBtn);

        expect(onExecuteHelp).toHaveBeenCalledWith('cure light');
    });

    it('disables submit button when input is empty or whitespace', () => {
        const onExecuteHelp = vi.fn();
        const onCancel = vi.fn();

        render(
            <CommandHelpBanner
                onExecuteHelp={onExecuteHelp}
                onCancel={onCancel}
            />
        );

        const submitBtn = screen.getByRole('button', { name: 'Help' }) as HTMLButtonElement;
        expect(submitBtn.disabled).toBe(true);

        const input = screen.getByRole('textbox', { name: /Help topic search/i });
        fireEvent.change(input, { target: { value: '   ' } });
        expect(submitBtn.disabled).toBe(true);

        fireEvent.change(input, { target: { value: 'bash' } });
        expect(submitBtn.disabled).toBe(false);
    });

    it('cancels help mode on close button click and on Escape key', () => {
        const onExecuteHelp = vi.fn();
        const onCancel = vi.fn();

        render(
            <CommandHelpBanner
                onExecuteHelp={onExecuteHelp}
                onCancel={onCancel}
            />
        );

        const closeBtn = screen.getByRole('button', { name: /Cancel command help mode/i });
        fireEvent.click(closeBtn);
        expect(onCancel).toHaveBeenCalledTimes(1);

        const input = screen.getByRole('textbox', { name: /Help topic search/i });
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledTimes(2);
    });
});
