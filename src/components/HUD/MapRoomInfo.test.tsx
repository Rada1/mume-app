// @vitest-environment jsdom
/**
 * @file MapRoomInfo.test.tsx
 * @description Unit tests for MapRoomInfoHeader and MapRoomInfoFooter visibility toggling.
 */

// --- Logic Section ---
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MapRoomInfoHeader } from './MapRoomInfoHeader';
import { MapRoomInfoFooter } from './MapRoomInfoFooter';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useVitalsStore } from '../../stores/useVitalsStore';

let mockIsMobile = false;

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        gameState: 'playing',
        gameTime: 1200,
        currentTerrain: 'forest',
        viewport: { isMobile: mockIsMobile }
    })
}));

describe('MapRoomInfoHeader and MapRoomInfoFooter', () => {
    beforeEach(() => {
        mockIsMobile = false;
        useSettingsStore.setState({ hideMapHeaderFooter: false });
        useRoomStore.setState({
            roomName: 'Bree West Gate',
            roomZone: 'Bree-land',
            exits: ['n', 'e', 'w'],
            rawExits: { n: 101, e: 102, w: 103 }
        });
        useVitalsStore.setState({
            lighting: 'artificial',
            weather: 'clear'
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('MapRoomInfoHeader', () => {
        it('renders environmental telemetry (time, dawn/dusk, weather, season, date) and excludes room, zone, exits, terrain, light', () => {
            render(<MapRoomInfoHeader />);

            expect(screen.getByRole('region', { name: /environmental telemetry/i })).toBeTruthy();
            expect(screen.getByText('time:')).toBeTruthy();
            expect(screen.getByText('dawn:')).toBeTruthy();
            expect(screen.getByText('dusk:')).toBeTruthy();
            expect(screen.getByText('weather:')).toBeTruthy();
            expect(screen.getByText('clear')).toBeTruthy();
            expect(screen.getByText('Summer')).toBeTruthy();

            // Excluded items:
            expect(screen.queryByText('Bree West Gate')).toBeNull();
            expect(screen.queryByText(/Bree-land/)).toBeNull();
            expect(screen.queryByText('N, E, W')).toBeNull();
            expect(screen.queryByText('forest')).toBeNull();
            expect(screen.queryByText('artificial')).toBeNull();
        });

        it('returns null and does not render when hideMapHeaderFooter is true', () => {
            useSettingsStore.setState({ hideMapHeaderFooter: true });

            render(<MapRoomInfoHeader />);

            expect(screen.queryByRole('region', { name: /environmental telemetry/i })).toBeNull();
        });

        it('returns null and does not render on mobile devices', () => {
            mockIsMobile = true;

            render(<MapRoomInfoHeader />);

            expect(screen.queryByRole('region', { name: /environmental telemetry/i })).toBeNull();
        });
    });

    describe('MapRoomInfoFooter', () => {
        it('renders exits, terrain, and lighting when hideMapHeaderFooter is false', () => {
            render(<MapRoomInfoFooter />);

            expect(screen.getByRole('region', { name: /room details/i })).toBeTruthy();
            expect(screen.getByText('N, E, W')).toBeTruthy();
            expect(screen.getByText('Forest')).toBeTruthy();
            expect(screen.getByText('Artificial')).toBeTruthy();
        });

        it('returns null and does not render when hideMapHeaderFooter is true', () => {
            useSettingsStore.setState({ hideMapHeaderFooter: true });

            render(<MapRoomInfoFooter />);

            expect(screen.queryByRole('region', { name: /room details/i })).toBeNull();
            expect(screen.queryByText('N, E, W')).toBeNull();
        });
    });

    describe('useSettingsStore hideMapHeaderFooter toggle', () => {
        it('allows toggling hideMapHeaderFooter via setHideMapHeaderFooter', () => {
            expect(useSettingsStore.getState().hideMapHeaderFooter).toBe(false);

            act(() => {
                useSettingsStore.getState().setHideMapHeaderFooter(true);
            });
            expect(useSettingsStore.getState().hideMapHeaderFooter).toBe(true);

            act(() => {
                useSettingsStore.getState().setHideMapHeaderFooter(false);
            });
            expect(useSettingsStore.getState().hideMapHeaderFooter).toBe(false);
        });
    });
});
