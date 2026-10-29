// @vitest-environment jsdom
/**
 * @file ImmersionBackgroundSettings.test.tsx
 * @description Keeps immersion background controls in Appearance settings.
 */

// --- Logic Section ---
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import ImmersionBackgroundSettings from './ImmersionBackgroundSettings';

vi.mock('./ZoneBackgroundPositionSettings', () => ({
    default: () => <div data-testid="immersion-background-viewpoint" />
}));

// --- Test Section ---
describe('ImmersionBackgroundSettings', () => {
    afterEach(cleanup);

    beforeEach(() => {
        useSettingsStore.setState({
            showImmersionBackgroundImage: true,
            useImmersionBackgroundSidePanel: false
        });
    });

    it('shows image and viewpoint controls in Appearance settings', () => {
        render(<ImmersionBackgroundSettings />);

        expect(screen.getByRole('switch', { name: 'Show Background Image' })).toBeTruthy();
        expect(screen.getByRole('switch', { name: 'Show as Side Panel' })).toBeTruthy();
        expect(screen.getByTestId('immersion-background-viewpoint')).toBeTruthy();
    });

    it('keeps background options available when the image is hidden', () => {
        render(<ImmersionBackgroundSettings />);

        fireEvent.click(screen.getByRole('switch', { name: 'Show Background Image' }));

        expect(useSettingsStore.getState().showImmersionBackgroundImage).toBe(false);
        expect(screen.getByRole('switch', { name: 'Show as Side Panel' })).toBeTruthy();
        expect(screen.getByTestId('immersion-background-viewpoint')).toBeTruthy();
    });
});
