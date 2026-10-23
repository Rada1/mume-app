/** @file twilightSceneLayers.ts -- Blend actual day/night sky scenes throughout twilight. */
import type { EnvironmentSceneLayer, LightingType, TwilightAppearance } from '../types';

// --- Clock-Driven Scene Weights ---
export const getTwilightSceneLayers = (
    layers: EnvironmentSceneLayer[], twilight: TwilightAppearance, nightLighting: LightingType,
): EnvironmentSceneLayer[] => {
    if (!twilight.phase) return layers;
    const eased = twilight.progress ** 2 * (3 - 2 * twilight.progress);
    const daylight = twilight.phase === 'dawn' ? eased : 1 - eased;
    const profiles = new Map<string, EnvironmentSceneLayer>();
    const add = (layer: EnvironmentSceneLayer) => {
        const { lighting, weather, isIndoor, isOutdoor, isNight, isVignetteReady } = layer.scene;
        const key = `${lighting}:${weather}:${isIndoor}:${isOutdoor}:${isNight}:${isVignetteReady}:${Boolean(layer.scene.blocksSky)}`;
        const previous = profiles.get(key);
        if (!previous) profiles.set(key, layer);
        else {
            const total = previous.opacity + layer.opacity;
            previous.cloudEntryProgress = total > 0
                ? (previous.cloudEntryProgress * previous.opacity + layer.cloudEntryProgress * layer.opacity) / total
                : previous.cloudEntryProgress;
            previous.opacity = total;
        }
    };
    for (const layer of layers) {
        const { scene } = layer;
        if (scene.blocksSky || !scene.isOutdoor || scene.isIndoor || !['sun', 'moon', 'dark'].includes(scene.lighting)) {
            add({ ...layer });
            continue;
        }
        add({ ...layer, scene: { ...scene, lighting: 'sun', isNight: false }, opacity: layer.opacity * daylight });
        const night = scene.lighting === 'sun' ? scene.nightLighting ?? nightLighting : scene.lighting;
        add({ ...layer, scene: { ...scene, lighting: night, isNight: true }, opacity: layer.opacity * (1 - daylight) });
    }
    return [...profiles.values()];
};

// --- Stars Share the Sky's Visible Night Contribution ---
export const getSceneStarsOpacity = (layers: EnvironmentSceneLayer[]): number =>
    0.96 * layers.reduce((total, { scene, opacity }) => total + (!scene.blocksSky && scene.isOutdoor && !scene.isIndoor && (
        scene.lighting === 'moon' || scene.lighting === 'dark' || (scene.lighting === 'artificial' && scene.isNight)
    ) ? opacity : 0), 0);
