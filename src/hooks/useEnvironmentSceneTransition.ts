/** @file useEnvironmentSceneTransition.ts -- One frame clock for coordinated corner light and weather. */
import { useLayoutEffect, useRef, useState } from 'react';
import type { EnvironmentSceneSnapshot, EnvironmentSceneTransition } from '../types';
import { hasWeatherClouds } from '../utils/environmentWeatherAppearance';

// --- Scene Identity ---
const keyFor = (scene: EnvironmentSceneSnapshot): string =>
    `${scene.lighting}:${scene.weather}:${(scene.lighting === 'dark' || hasWeatherClouds(scene.weather)) && scene.isIndoor}:${scene.isVignetteReady}:${Boolean(scene.blocksSky)}`;

// --- Shared One-Second Frame Clock ---
export const useEnvironmentSceneTransition = (scene: EnvironmentSceneSnapshot): EnvironmentSceneTransition => {
    const key = keyFor(scene);
    const observed = useRef(scene);
    const [state, setState] = useState<EnvironmentSceneTransition>({
        key, previous: null, progress: 1, layers: [{ scene, opacity: 1, cloudEntryProgress: 1 }],
    });
    let visible = state;
    if (state.key !== key) {
        const canFade = observed.current.isVignetteReady && scene.isVignetteReady;
        // Preserve every visible contribution if GMCP sends lighting and weather separately.
        const layers = state.layers.filter(layer => layer.opacity > 0).map(layer => ({
            ...layer, scene: keyFor(layer.scene) === state.key ? observed.current : layer.scene,
        }));
        if (!layers.some(layer => keyFor(layer.scene) === key)) {
            const sameClouds = observed.current.weather === scene.weather && !observed.current.isIndoor;
            const entry = sameClouds ? state.layers.find(layer => keyFor(layer.scene) === state.key)?.cloudEntryProgress ?? 1 : 0;
            layers.push({ scene, opacity: 0, cloudEntryProgress: entry });
        }
        visible = {
            key, previous: canFade ? observed.current : null, progress: canFade ? 0 : 1,
            layers: canFade ? layers : [{ scene, opacity: 1, cloudEntryProgress: 1 }],
        };
        // Resolve the new scene before committing DOM, preserving the outgoing layer's identity.
        setState(visible);
    }
    observed.current = scene;

    useLayoutEffect(() => {
        if (!visible.previous) return;
        let frame = 0;
        let cancelled = false;
        const startedAt = performance.now();
        const advance = (timestamp: number) => {
            // A key can repeat during rapid room movement; an older fade still owns
            // that key, so key comparison alone cannot identify the active animation.
            if (cancelled) return;
            const elapsed = Math.min(1, Math.max(0, (timestamp - startedAt) / 1000));
            const progress = elapsed * elapsed * (3 - 2 * elapsed);
            setState(current => cancelled || current.key !== key ? current : {
                ...current, progress, previous: elapsed === 1 ? null : current.previous,
                layers: elapsed === 1 ? [{ scene, opacity: 1, cloudEntryProgress: 1 }]
                    : visible.layers.map(layer => {
                        const isTarget = keyFor(layer.scene) === key;
                        return {
                            ...layer,
                            opacity: layer.opacity * (1 - progress) + (isTarget ? progress : 0),
                            cloudEntryProgress: isTarget
                                ? layer.cloudEntryProgress + (1 - layer.cloudEntryProgress) * progress
                                : layer.cloudEntryProgress,
                        };
                    }),
            });
            if (elapsed < 1) frame = window.requestAnimationFrame(advance);
        };
        frame = window.requestAnimationFrame(advance);
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(frame);
        };
    }, [key]);
    return { ...visible, layers: visible.layers.map(layer => keyFor(layer.scene) === key ? { ...layer, scene } : layer) };
};
