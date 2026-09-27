// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MapFilterBar } from './MapFilterBar';
import { useInputStore } from '../../stores/useInputStore';

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
        useInputStore.getState().setInput('');
    });

    afterEach(() => {
        cleanup();
        document.getElementById('mud-input')?.remove();
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
        expect(screen.getByRole('button', { name: 'Search map with command bar' })).toBeTruthy();
        expect(screen.queryByPlaceholderText('filter room name, note...')).toBeNull();
    });

    it('prefills and focuses the shared command bar when Search is tapped', () => {
        const commandInput = document.createElement('input');
        commandInput.id = 'mud-input';
        document.body.appendChild(commandInput);
        render(
            <MapFilterBar
                activeMapFilter={null}
                mapSearchQuery=""
                setActiveMapFilter={mockMapperContext.setActiveMapFilter}
                setMapSearchQuery={mockMapperContext.setMapSearchQuery}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Search map with command bar' }));
        expect(useInputStore.getState().input).toBe('/find ');
        expect(document.activeElement).toBe(commandInput);
    });

    it('opens a category submenu instead of applying a broad filter on tap', () => {
        const setFilter = vi.fn();
        render(
            <MapFilterBar
                activeMapFilter={null}
                mapSearchQuery=""
                setActiveMapFilter={setFilter}
                setMapSearchQuery={mockMapperContext.setMapSearchQuery}
            />
        );

        const shopsButton = screen.getByTitle('Choose a Shops subcategory');
        expect(shopsButton).toBeTruthy();

        fireEvent.click(shopsButton);
        expect(screen.getByText('Weapon')).toBeTruthy();
        expect(setFilter).not.toHaveBeenCalled();
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

    it('applies the selected subcategory and clears any text search', () => {
        const setFilter = vi.fn();
        const setQuery = vi.fn();
        render(
            <MapFilterBar
                activeMapFilter={null}
                mapSearchQuery="herb"
                setActiveMapFilter={setFilter}
                setMapSearchQuery={setQuery}
            />
        );

        fireEvent.click(screen.getByTitle('Choose a Shops subcategory'));

        // Subflags dropup should appear
        expect(screen.getByText('Weapon')).toBeTruthy();
        expect(screen.getByText('Armour')).toBeTruthy();

        // Clicking subflag
        fireEvent.click(screen.getByText('Weapon'));
        expect(setFilter).toHaveBeenCalledWith('WEAPON_SHOP');
        expect(setQuery).toHaveBeenCalledWith('');
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
