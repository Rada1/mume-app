// @vitest-environment jsdom
/**
 * @file ZoneBackgroundPositionSettings.test.tsx
 * @description Keeps the per-zone immersion viewpoint control available in Appearance settings.
 */

// --- Logic Section ---
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_MAP_BACKGROUND_VISUALS, useSettingsStore } from '../../stores/useSettingsStore';
import ZoneBackgroundPositionSettings from './ZoneBackgroundPositionSettings';

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({ roomZone: 'the Shire' })
}));

// --- Test Section ---
describe('ZoneBackgroundPositionSettings', () => {
    afterEach(cleanup);

    beforeEach(() => {
        useSettingsStore.setState({
            bgImage: null,
            zoneBackgroundPositions: {},
            zoneFilters: {},
            mapBackgroundVisuals: { ...DEFAULT_MAP_BACKGROUND_VISUALS }
        });
    });

    it('shows the active zone and saves its reset viewpoint', () => {
        render(<ZoneBackgroundPositionSettings />);

        const zonePicker = screen.getByRole('combobox', { name: 'Zone for background viewpoint' });
        expect((zonePicker as HTMLSelectElement).value).toBe('shire');

        fireEvent.click(screen.getByRole('button', { name: 'Reset Position' }));
        expect(useSettingsStore.getState().zoneBackgroundPositions.shire).toEqual({ x: 0, y: 0 });
    });

    it('saves background blur and zoom adjustments', () => {
        render(<ZoneBackgroundPositionSettings />);

        fireEvent.change(screen.getByRole('slider', { name: 'Immersion background blur' }), { target: { value: '6.5' } });
        fireEvent.change(screen.getByRole('slider', { name: 'Immersion background zoom' }), { target: { value: '135' } });

        expect(useSettingsStore.getState().mapBackgroundVisuals.blur).toBe(6.5);
        expect(useSettingsStore.getState().mapBackgroundVisuals.zoom).toBe(1.35);
        const preview = screen.getByRole('group', { name: /Background image position preview/ }).querySelector('img');
        expect(preview?.style.width).toBe('1080%');
        expect(preview?.style.filter).toContain('blur(6.5px)');
    });
});
