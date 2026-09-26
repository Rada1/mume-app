// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TacticalTargetBar } from './TacticalTargetBar';

describe('TacticalTargetBar', () => {
    const mockOccupants = [
        { id: 1, name: 'Morgundul orc-guard', short: 'a Morgundul orc-guard', type: 'enemy' },
        { id: 2, name: 'Town Guard', short: 'a burly town guard', type: 'npc' }
    ];

    it('renders null when closed', () => {
        const { container } = render(
            <TacticalTargetBar
                isOpen={false}
                currentTarget="Morgundul orc-guard"
                selectedTarget={null}
                onSelectTarget={vi.fn()}
                roomOccupants={mockOccupants as any}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders viable targets horizontally with LOCK and allows selection without bubbling', () => {
        const handleSelect = vi.fn();
        const parentPointerUp = vi.fn();

        render(
            <div onPointerUp={parentPointerUp}>
                <TacticalTargetBar
                    isOpen={true}
                    currentTarget="Morgundul orc-guard"
                    selectedTarget={null}
                    onSelectTarget={handleSelect}
                    roomOccupants={mockOccupants as any}
                />
            </div>
        );

        expect(screen.getByText(/TARGETS/)).toBeTruthy();
        expect(screen.getByText(/Morgundul orc-guard/i)).toBeTruthy();
        expect(screen.getByText(/enemy/i)).toBeTruthy();
        expect(screen.getByText(/npc/i)).toBeTruthy();

        const guardItem = screen.getByText(/town guard/i);
        // Test that pointerDown selects target
        fireEvent.pointerDown(guardItem);
        expect(handleSelect).toHaveBeenCalledWith(expect.stringMatching(/guard/i));

        // Test that pointerUp does NOT bubble to parent (prevents auto-closing gesture!)
        fireEvent.pointerUp(guardItem);
        expect(parentPointerUp).not.toHaveBeenCalled();
    });
});
