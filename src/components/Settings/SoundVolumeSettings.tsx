/**
 * @file SoundVolumeSettings.tsx
 * @description Independent master, effects, and music volume controls.
 */

import React from 'react';
import { Sliders } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface SoundVolumeSettingsProps {
    isSoundEnabled: boolean;
}

// --- Logic Section ---
const SoundVolumeSettings: React.FC<SoundVolumeSettingsProps> = ({ isSoundEnabled }) => {
    const {
        masterVolume, setMasterVolume,
        sfxVolume, setSfxVolume,
        musicVolume, setMusicVolume
    } = useSettingsStore();

    const volumeControl = (label: string, value: number, onChange: (value: number) => void, maxValue: number = 1) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary, #fff)' }}>{label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{Math.round(value * 100)}%</span>
            </div>
            <input
                type="range"
                min="0"
                max={maxValue}
                step="0.01"
                value={value}
                onChange={(event) => onChange(parseFloat(event.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
        </div>
    );

    return (
        <div className="setting-group" style={{
            opacity: isSoundEnabled ? 1 : 0.5,
            pointerEvents: isSoundEnabled ? 'auto' : 'none',
            transition: 'opacity 0.3s',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
        }}>
            <label className="setting-label" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Sliders size={16} /> Volume Levels
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {volumeControl('Master Volume', masterVolume, setMasterVolume)}
                {volumeControl('Sound Effects (Combat, UI)', sfxVolume, setSfxVolume)}
                {volumeControl('Atmosphere & Music', musicVolume, setMusicVolume)}
            </div>
        </div>
    );
};

export default SoundVolumeSettings;
