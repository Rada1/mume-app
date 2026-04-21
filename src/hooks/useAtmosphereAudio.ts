import { useEffect } from 'react';
import { FX_THRESHOLD } from '../constants';
import { audioManager } from '../services/audio/AudioManager';
import { useSettingsStore } from '../stores/useSettingsStore';

interface AtmosphereAudioDeps {
    hpRatio: number;
    manaRatio: number;
    moveRatio: number;
    hpRowRef: React.RefObject<HTMLDivElement>;
    manaRowRef: React.RefObject<HTMLDivElement>;
    moveRowRef: React.RefObject<HTMLDivElement>;
    isSoundEnabled: boolean;
}

export const useAtmosphereAudio = ({
    hpRatio,
    manaRatio,
    moveRatio,
    hpRowRef,
    manaRowRef,
    moveRowRef,
    isSoundEnabled
}: AtmosphereAudioDeps) => {
    const masterVolume = useSettingsStore(state => state.masterVolume);
    const musicVolume = useSettingsStore(state => state.musicVolume);

    // --- Audio Update Logic ---
    useEffect(() => {
        if (isSoundEnabled) {
            // We pass ratios to audioManager which handles its own internal thresholds
            audioManager.updateAtmosphere(hpRatio, moveRatio);
        }
    }, [hpRatio, moveRatio, isSoundEnabled]);

    // --- Visual Heartbeat Logic ---
    useEffect(() => {
        if (hpRowRef.current) {
            const intensity = 0.3 + (0.7 * (1 - hpRatio));
            const duration = 0.5 + (2.5 * hpRatio);
            hpRowRef.current.style.setProperty('--pulse-intensity', intensity.toString());
            
            if (hpRatio <= FX_THRESHOLD) {
                hpRowRef.current.style.animation = `heartbeat-pulse ${duration}s ease-in-out infinite`;
            } else {
                hpRowRef.current.style.animation = 'none';
            }
        }
    }, [hpRatio, hpRowRef]);

    // --- Visual Breath Logic ---
    useEffect(() => {
        if (moveRowRef.current) {
            const intensity = 0.3 + (0.7 * (1 - moveRatio));
            const duration = 0.5 + (3.5 * moveRatio);
            moveRowRef.current.style.setProperty('--breath-intensity', intensity.toString());

            if (moveRatio <= FX_THRESHOLD) {
                moveRowRef.current.style.animation = `breath-pulse ${duration}s ease-in-out infinite`;
            } else {
                moveRowRef.current.style.animation = 'none';
            }
        }
    }, [moveRatio, moveRowRef]);

    // --- Visual Mana Pulse Logic ---
    useEffect(() => {
        const el = manaRowRef.current;
        if (!el) return;
        let active = true;
        let timeoutId: NodeJS.Timeout;

        const loop = () => {
            if (!active) return;
            const baseDelay = 100 + (1400 * manaRatio);
            const intensity = 0.4 + (0.6 * (1 - manaRatio));
            const isSpark = Math.random() < (0.2 + (0.3 * (1 - manaRatio)));
            let boxShadow = `0 0 ${5 * intensity}px rgba(168, 85, 247, ${0.3 * intensity})`;
            if (isSpark) {
                boxShadow = `0 0 ${15 * intensity}px rgba(216, 180, 254, ${0.8 * intensity}), inset 0 0 ${5 * intensity}px rgba(168, 85, 247, 0.8)`;
            }
            el.style.boxShadow = boxShadow;
            el.style.transition = `box-shadow ${baseDelay * 0.4}ms ease-out`;
            timeoutId = setTimeout(loop, baseDelay * (0.8 + Math.random() * 0.4));
        };

        loop();
        return () => {
            active = false;
            clearTimeout(timeoutId);
        };
    }, [manaRatio, manaRowRef]);
};
