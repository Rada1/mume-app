/** @file Channel-specific sound effect overrides. */
import type { ChangeEvent } from 'react';
import { AUDIO_MANIFEST } from '../constants/audioManifest';
import { useSettingsStore } from '../stores/useSettingsStore';
import { audioManager } from '../services/audio/AudioManager';

// --- Effect Editor Actions ---
const groupedEffects = {
    game: Object.entries(AUDIO_MANIFEST.effects).filter(([, effect]) => effect.channel !== 'ui'),
    ui: Object.entries(AUDIO_MANIFEST.effects).filter(([, effect]) => effect.channel === 'ui')
};
export const useSoundEffectEditor = (channel: 'game' | 'ui') => {
    const customSoundEffects = useSettingsStore(state => state.customSoundEffects);
    const removeCustomSoundEffect = useSettingsStore(state => state.removeCustomSoundEffect);
    const setCustomSoundEffect = useSettingsStore(state => state.setCustomSoundEffect);
    const handleOverrideUpload = (key: string, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) setCustomSoundEffect(key, URL.createObjectURL(file));
        event.target.value = '';
    };
    return { effects: groupedEffects[channel], customSoundEffects, removeCustomSoundEffect, handleOverrideUpload,
        preview: (key: string) => audioManager.playEffect(key, { skipJitter: true }) };
};
