// @vitest-environment jsdom
/**
 * @file MapSettings.test.tsx
 * @description Unit tests for MapSettings toggles and controls.
 */

// --- Logic Section ---
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MapSettings from './MapSettings';
import { useSettingsStore } from '../../stores/useSettingsStore';

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({ characterName: 'Tester' }),
    useLog: () => ({ addMessage: vi.fn() }),
    useUI: () => ({ ui: {}, setUI: vi.fn() })
}));

vi.mock('../../context/useMapper', () => ({
    useMapper: () => ({
        showBackgroundImage: false,
        setShowBackgroundImage: vi.fn(),
        showTerrainTiles: true,
        setShowTerrainTiles: vi.fn(),
        showDebugEchoes: false,
        setShowDebugEchoes: vi.fn(),
        useSessionColors: true,
        setUseSessionColors: vi.fn(),
        rooms: {},
        roomsRef: { current: {} },
        rawWorldBoundsRef: { current: null },
        rawWorldOriginRef: { current: null },
        loadData: vi.fn(),
        currentRoomIdRef: { current: null },
        triggerRender: vi.fn(),
        clearRooms: vi.fn(),
        fetchAndLoadMap: vi.fn()
    })
}));

vi.mock('../Mapper/hooks/useMapperExportImport', () => ({
    useMapperExportImport: () => ({
        handleExport: vi.fn(),
        handleImport: vi.fn()
    })
}));

vi.mock('./MapVisualSettings', () => ({
    default: () => <div data-testid="map-visual-settings" />
}));

vi.mock('./MapRegionLabelsSettings', () => ({
    default: () => <div data-testid="map-region-labels-settings" />
}));

// --- Test Section ---
describe('MapSettings Component', () => {
    beforeEach(() => {
        useSettingsStore.setState({ hideMapHeaderFooter: false });
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders the Hide Map Header & Footer toggle option', () => {
        render(<MapSettings />);

        expect(screen.getByText('Hide Map Header & Footer')).toBeTruthy();
        expect(screen.getByText(/Hide the room telemetry header and exits\/details footer overlaying the map/i)).toBeTruthy();

        const toggle = screen.getByRole('button', { name: 'Hide Map Header & Footer' });
        expect(toggle).toBeTruthy();
        expect(toggle.getAttribute('aria-pressed')).toBe('false');
    });

    it('toggles hideMapHeaderFooter setting when clicked', () => {
        render(<MapSettings />);

        const toggle = screen.getByRole('button', { name: 'Hide Map Header & Footer' });
        expect(useSettingsStore.getState().hideMapHeaderFooter).toBe(false);

        fireEvent.click(toggle);
        expect(useSettingsStore.getState().hideMapHeaderFooter).toBe(true);

        fireEvent.click(toggle);
        expect(useSettingsStore.getState().hideMapHeaderFooter).toBe(false);
    });
});
