// @vitest-environment jsdom
/**
 * @file EnvironmentEffects.test.tsx
 * @description Verifies immersion background brightness stays independent from room lighting.
 */

// --- Logic Section ---
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EnvironmentEffects } from './EnvironmentEffects';
import { useSettingsStore } from '../../stores/useSettingsStore';

vi.mock('./EnvironmentWeatherLayers', () => ({
    EnvironmentWeatherLayers: ({ isEnabled }: { isEnabled: boolean }) => isEnabled ? <div data-testid="weather-effects" /> : null
}));
vi.mock('./EnvironmentVignetteLayers', () => ({
    EnvironmentVignetteLayers: ({ lighting, isEnabled }: { lighting: string; isEnabled: boolean }) =>
        isEnabled ? <div data-testid="corner-vignettes" data-lighting={lighting} /> : null
}));
vi.mock('./Embers', () => ({ Embers: ({ count }: { count: number }) => <div data-testid="embers" data-count={count} /> }));
vi.mock('./EnvironmentGlow', () => ({ EnvironmentGlow: () => <div data-testid="terrain-glow" /> }));
vi.mock('../../hooks/useDeathBackgroundFade', () => ({ useDeathBackgroundFade: () => 'none' }));
vi.mock('../../hooks/useEnvironmentTransitions', () => ({
    useEnvironmentTransitions: ({ lighting }: { lighting: string }) => ({
        lightingTransition: {
            scenes: [], previousLighting: null, previousIsIndoor: false, previousIsNight: false,
            previousWeather: null, isFading: false, progress: 1
        },
        weatherTransition: { scenes: [], lighting },
        starsOpacity: 0
    })
}));

// --- Test Section ---
describe('EnvironmentEffects immersion background', () => {
    it('keeps image brightness fixed by its setting while lighting remains in corner vignettes', () => {
        useSettingsStore.setState({
            isPerformanceMode: false,
            isImmersionWeatherEffectsEnabled: true,
            isImmersionAmbientLightingEnabled: true,
            isImmersionTerrainGlowEnabled: true,
            isImmersionZoneAuraEnabled: true,
            isImmersionEmbersEnabled: true,
            immersionEmberCount: 24,
            showImmersionBackgroundImage: true,
            useImmersionBackgroundSidePanel: false,
            mapBackgroundVisuals: { ...useSettingsStore.getState().mapBackgroundVisuals, brightness: 0.82 },
            zoneBackgroundPositions: {}
        });
        const props = {
            lighting: 'dark' as const,
            weather: 'clear' as const,
            isFoggy: false,
            lightning: false,
            isImmersionMode: true,
            isMobile: false,
            bgImage: '/background.png',
            terrain: 'Field',
            zone: 'Shire'
        };
        const { container, rerender } = render(<EnvironmentEffects {...props} />);

        const imageLayer = container.querySelector('.background-layer');
        expect(imageLayer).not.toBeNull();
        expect((imageLayer as HTMLElement).style.getPropertyValue('--immersion-background-brightness')).toBe('0.82');
        expect((imageLayer as HTMLElement).style.getPropertyValue('--immersion-background-blur')).toBe('3px');
        expect((imageLayer as HTMLElement).style.getPropertyValue('--immersion-background-size')).toBe('800%');
        expect(imageLayer?.children).toHaveLength(0);
        expect(container.querySelector('.client-dark-overlay')).toBeNull();
        expect(container.querySelector('.client-lighting-overlay')).toBeNull();
        expect(screen.getByTestId('weather-effects')).toBeTruthy();
        expect(screen.getByTestId('terrain-glow')).toBeTruthy();
        expect(container.querySelector('.client-terrain-ambient-aura')).not.toBeNull();
        expect(screen.getByTestId('embers')).toBeTruthy();
        expect(screen.getByTestId('embers').getAttribute('data-count')).toBe('24');
        expect(screen.getByTestId('corner-vignettes').getAttribute('data-lighting')).toBe('dark');

        useSettingsStore.setState({ immersionEmberCount: 12 });
        rerender(<EnvironmentEffects {...props} />);
        expect(screen.getByTestId('embers').getAttribute('data-count')).toBe('12');

        useSettingsStore.setState({ isImmersionWeatherEffectsEnabled: false });
        rerender(<EnvironmentEffects {...props} />);
        expect(screen.queryByTestId('weather-effects')).toBeNull();
        expect(screen.queryByTestId('corner-vignettes')).toBeNull();
        expect(screen.getByTestId('terrain-glow')).toBeTruthy();
        expect(container.querySelector('.client-terrain-ambient-aura')).not.toBeNull();
        expect((container.querySelector('.background-layer') as HTMLElement).style.getPropertyValue('--immersion-background-brightness')).toBe('0.82');

        useSettingsStore.setState({ isImmersionWeatherEffectsEnabled: true });

        rerender(<EnvironmentEffects {...props} lighting="sun" />);
        expect((container.querySelector('.background-layer') as HTMLElement).style.getPropertyValue('--immersion-background-brightness')).toBe('0.82');
        expect(screen.getByTestId('corner-vignettes').getAttribute('data-lighting')).toBe('sun');

        useSettingsStore.setState({ isImmersionTerrainGlowEnabled: false });
        rerender(<EnvironmentEffects {...props} lighting="sun" />);
        expect(screen.queryByTestId('terrain-glow')).toBeNull();
        expect(container.querySelector('.client-terrain-ambient-aura')).not.toBeNull();
        expect(screen.getByTestId('embers')).toBeTruthy();
        expect(screen.getByTestId('corner-vignettes').getAttribute('data-lighting')).toBe('sun');

        useSettingsStore.setState({ isImmersionZoneAuraEnabled: false });
        rerender(<EnvironmentEffects {...props} lighting="sun" />);
        expect(container.querySelector('.client-terrain-ambient-aura')).toBeNull();
        expect(screen.getByTestId('embers')).toBeTruthy();

        useSettingsStore.setState({ isImmersionEmbersEnabled: false });
        rerender(<EnvironmentEffects {...props} lighting="sun" />);
        expect(screen.queryByTestId('embers')).toBeNull();

        useSettingsStore.setState({ useImmersionBackgroundSidePanel: true });
        rerender(<EnvironmentEffects {...props} lighting="sun" />);
        expect(container.querySelector('.background-layer')).toBeNull();

        rerender(<EnvironmentEffects {...props} lighting="sun" isMobile />);
        expect(container.querySelector('.background-layer')).not.toBeNull();

        useSettingsStore.setState({ useImmersionBackgroundSidePanel: false, showImmersionBackgroundImage: false });
        rerender(<EnvironmentEffects {...props} lighting="sun" />);
        expect(container.querySelector('.background-layer')).toBeNull();

        useSettingsStore.setState({ showImmersionBackgroundImage: true });
        rerender(<EnvironmentEffects {...props} lighting="sun" />);
        expect(container.querySelector('.background-layer')).not.toBeNull();

        useSettingsStore.setState({
            isPerformanceMode: false,
            isImmersionWeatherEffectsEnabled: true,
            isImmersionTerrainGlowEnabled: true,
            isImmersionZoneAuraEnabled: true,
            isImmersionEmbersEnabled: true,
            immersionEmberCount: 24,
        });
        rerender(<EnvironmentEffects {...props} lighting="sun" isMobile />);
        expect(screen.getByTestId('embers').getAttribute('data-count')).toBe('24');
        expect(screen.getByTestId('terrain-glow')).toBeTruthy();
        expect(container.querySelector('.client-terrain-ambient-aura')).not.toBeNull();
        expect(screen.getByTestId('weather-effects')).toBeTruthy();
    });
});
