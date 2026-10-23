// @vitest-environment jsdom
/**
 * @file CommandHelpPopover.test.tsx
 * @description Unit tests for command help interaction and captured details display.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createButton } from '../../../utils/buttonFactory';
import { CapturedDetailsCard } from './CapturedDetailsCard';
import { PopoverActionButton } from './PopoverActionButton';

afterEach(() => {
    cleanup();
});

describe('Command help in details panel', () => {
    it('intercepts button clicks in help mode and requests help for the command', () => {
        const onRequestHelp = vi.fn();
        const handleButtonClick = vi.fn();
        const executeCommand = vi.fn();

        render(<PopoverActionButton
            button={createButton({ id: 'btn-backstab', label: 'Backstab', command: 'backstab %n', setId: 'inline-offense' })}
            popoverState={{ x: 0, y: 0, setId: 'inline-offense', context: 'orc' }}
            favorites={[]} toggleFavorite={vi.fn()} setPopoverState={vi.fn()}
            setButtons={vi.fn()} handleButtonClick={handleButtonClick} executeCommand={executeCommand}
            addMessage={vi.fn()} handleTabClick={vi.fn()} setGearTab={vi.fn()}
            selectedObjectIds={new Set()} clearObjectSelection={vi.fn()} entities={{}}
            isHelpMode={true} onRequestHelp={onRequestHelp} compact terminal />);

        const item = screen.getByText('Backstab');
        fireEvent.click(item);

        expect(onRequestHelp).toHaveBeenCalledWith('backstab');
        expect(handleButtonClick).not.toHaveBeenCalled();
        expect(executeCommand).not.toHaveBeenCalled();
    });

    it('resolves spell name from cast command in help mode', () => {
        const onRequestHelp = vi.fn();

        render(<PopoverActionButton
            button={createButton({ id: 'btn-cure', label: 'Cure Light', command: "cast 'cure light' %n", setId: 'inline-healing' })}
            popoverState={{ x: 0, y: 0, setId: 'inline-healing', context: 'syndil' }}
            favorites={[]} toggleFavorite={vi.fn()} setPopoverState={vi.fn()}
            setButtons={vi.fn()} handleButtonClick={vi.fn()} executeCommand={vi.fn()}
            addMessage={vi.fn()} handleTabClick={vi.fn()} setGearTab={vi.fn()}
            selectedObjectIds={new Set()} clearObjectSelection={vi.fn()} entities={{}}
            isHelpMode={true} onRequestHelp={onRequestHelp} compact terminal />);

        fireEvent.click(screen.getByText('Cure Light'));
        expect(onRequestHelp).toHaveBeenCalledWith('cure light');
    });

    it('displays loading help, captured help lines, and empty help fallback in CapturedDetailsCard', () => {
        const { rerender } = render(<CapturedDetailsCard isCapturingHelp helpTopic="backstab" />);
        expect(screen.getByText('Help · backstab')).toBeTruthy();
        expect(screen.getByText('Loading help...')).toBeTruthy();

        rerender(<CapturedDetailsCard helpTopic="backstab" helpLines={['Syntax: backstab target', 'Allows a thief to surprise an opponent.']} />);
        expect(screen.getByText('Syntax: backstab target')).toBeTruthy();
        expect(screen.getByText('Allows a thief to surprise an opponent.')).toBeTruthy();

        rerender(<CapturedDetailsCard helpTopic="backstab" helpLines={[]} />);
        expect(screen.getByText('No help information returned.')).toBeTruthy();
    });
});
