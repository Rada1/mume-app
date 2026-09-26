// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MapFilterBar } from './MapFilterBar';

const mockMapperContext = {
    rooms: { '100': { id: '100', name: 'Test Room', z: 0.0 } },
    currentRoomId: '100',
    activeMapFilter: null as string | null,
    setActiveMapFilter: vi.fn(),
    mapSearchQuery: '',
    setMapSearchQuery: vi.fn(),
    viewZ: null as number | null,
};

vi.mock('../../context/useMapper', () => ({
    useMapper: () => mockMapperContext
}));

describe('MapFilterBar (Option 1 Terminal Docked System)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockMapperContext.activeMapFilter = null;
        mockMapperContext.mapSearchQuery = '';
        mockMapperContext.viewZ = null;
    });

    afterEach(() => {
        cleanup();
    });

    it('renders the Z-level readout and > find: prompt', () => {
        render(
            <MapFilterBar
                activeMapFilter={null}
                mapSearchQuery=""
                setActiveMapFilter={mockMapperContext.setActiveMapFilter}
                setMapSearchQuery={mockMapperContext.setMapSearchQuery}
            />
        );

        expect(screen.getByText('Z:')).toBeTruthy();
        expect(screen.getByText('0.0')).toBeTruthy();
        expect(screen.getByText('>')).toBeTruthy();
        expect(screen.getByText('find:')).toBeTruthy();
        expect(screen.getByPlaceholderText('filter room name, note...')).toBeTruthy();
    });

    it('updates search query when typing into input', () => {
        const setQuery = vi.fn();
        render(
            <MapFilterBar
                activeMapFilter={null}
                mapSearchQuery=""
                setActiveMapFilter={mockMapperContext.setActiveMapFilter}
                setMapSearchQuery={setQuery}
            />
        );

        const input = screen.getByPlaceholderText('filter room name, note...');
        fireEvent.change(input, { target: { value: 'bree' } });
        expect(setQuery).toHaveBeenCalledWith('bree');
    });

    it('renders category chips and activates category on click', () => {
        const setFilter = vi.fn();
        render(
            <MapFilterBar
                activeMapFilter={null}
                mapSearchQuery=""
                setActiveMapFilter={setFilter}
                setMapSearchQuery={mockMapperContext.setMapSearchQuery}
            />
        );

        const shopsButton = screen.getByTitle('Filter by Shops');
        expect(shopsButton).toBeTruthy();

        fireEvent.click(shopsButton);
        expect(setFilter).toHaveBeenCalledWith('shops');
    });

    it('renders clear button when active filter is present and clears on click', () => {
        const setFilter = vi.fn();
        const setQuery = vi.fn();
        render(
            <MapFilterBar
                activeMapFilter="shops"
                mapSearchQuery="blacksmith"
                setActiveMapFilter={setFilter}
                setMapSearchQuery={setQuery}
            />
        );

        const clearBtn = screen.getByRole('button', { name: /clear filter/i });
        expect(clearBtn).toBeTruthy();

        fireEvent.click(clearBtn);
        expect(setFilter).toHaveBeenCalledWith(null);
        expect(setQuery).toHaveBeenCalledWith('');
    });

    it('opens subflags dropup when clicking category chevron and selects subflag', () => {
        const setFilter = vi.fn();
        render(
            <MapFilterBar
                activeMapFilter={null}
                mapSearchQuery=""
                setActiveMapFilter={setFilter}
                setMapSearchQuery={mockMapperContext.setMapSearchQuery}
            />
        );

        const shopsChevron = screen.getByTitle('Toggle Shops sub-filters');
        fireEvent.click(shopsChevron);

        // Subflags dropup should appear
        expect(screen.getByText('Weapon')).toBeTruthy();
        expect(screen.getByText('Armour')).toBeTruthy();

        // Clicking subflag
        fireEvent.click(screen.getByText('Weapon'));
        expect(setFilter).toHaveBeenCalledWith('WEAPON_SHOP');
    });

    it('collapses and expands categories row when clicking toggle button', () => {
        render(
            <MapFilterBar
                activeMapFilter={null}
                mapSearchQuery=""
                setActiveMapFilter={mockMapperContext.setActiveMapFilter}
                setMapSearchQuery={mockMapperContext.setMapSearchQuery}
            />
        );

        expect(screen.getByRole('toolbar', { name: /map filter categories/i })).toBeTruthy();

        const toggleBtn = screen.getByLabelText(/collapse filter categories/i);
        fireEvent.click(toggleBtn);

        // Collapsed: toolbar should be hidden
        expect(screen.queryByRole('toolbar', { name: /map filter categories/i })).toBeNull();

        // Click again to expand
        const expandBtn = screen.getByLabelText(/expand filter categories/i);
        fireEvent.click(expandBtn);
        expect(screen.getByRole('toolbar', { name: /map filter categories/i })).toBeTruthy();
    });
});
