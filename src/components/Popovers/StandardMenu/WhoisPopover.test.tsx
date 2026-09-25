// @vitest-environment jsdom
/**
 * @file WhoisPopover.test.tsx
 * @description Whois stays in the popover and renders captured detail output.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createButton } from '../../../utils/buttonFactory';
import { CapturedDetailsCard } from './CapturedDetailsCard';
import { PopoverActionButton } from './PopoverActionButton';

// --- Tests ---
describe('Whois popover action', () => {
    it('requests inline capture without invoking the closing button handler', () => {
        const requestWhois = vi.fn();
        const handleButtonClick = vi.fn();
        render(<PopoverActionButton
            button={createButton({ id: 'btn-whois', label: 'Whois', command: 'whois %n', setId: 'inline-ally' })}
            popoverState={{ x: 0, y: 0, setId: 'inline-ally', context: 'syndil' }}
            favorites={[]} toggleFavorite={vi.fn()} setPopoverState={vi.fn()}
            setButtons={vi.fn()} handleButtonClick={handleButtonClick} executeCommand={vi.fn()}
            addMessage={vi.fn()} handleTabClick={vi.fn()} setGearTab={vi.fn()}
            selectedObjectIds={new Set()} clearObjectSelection={vi.fn()} entities={{}}
            onRequestWhois={requestWhois} compact terminal />);
        fireEvent.click(screen.getByText('Whois'));
        expect(requestWhois).toHaveBeenCalledOnce();
        expect(handleButtonClick).not.toHaveBeenCalled();
    });

    it('shows captured Whois text and an empty response state', () => {
        const { rerender } = render(<CapturedDetailsCard isCapturingWhois />);
        expect(screen.getByText('Identifying...')).toBeTruthy();
        rerender(<CapturedDetailsCard whoisLines={['Syndil is a warrior.']} />);
        expect(screen.getByText('Syndil is a warrior.')).toBeTruthy();
        rerender(<CapturedDetailsCard whoisLines={[]} />);
        expect(screen.getByText('No info found.')).toBeTruthy();
    });
});
