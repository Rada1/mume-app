/**
 * @file SoundEffectOverrides.tsx
 * @description Preview and upload overrides for built-in sound effects.
 */

import React from 'react';
import { Play, RotateCcw, Upload, Volume2 } from 'lucide-react';
import type { SoundEffectOverridesProps } from '../../types';
import { useSoundEffectEditor } from '../../hooks/useSoundEffectEditor';

// --- Logic Section ---
const SoundEffectOverrides: React.FC<SoundEffectOverridesProps> = ({ isSoundEnabled, channel }) => {
    const { effects, customSoundEffects, removeCustomSoundEffect, handleOverrideUpload, preview } = useSoundEffectEditor(channel);

    return (
        <div className="setting-group" style={{ opacity: isSoundEnabled ? 1 : 0.5, pointerEvents: isSoundEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
            <label className="setting-label" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={16} /> {channel === 'ui' ? 'UI Sounds' : 'Sound Effects'}
            </label>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '12px' }}>
                Preview {channel === 'ui' ? 'interface sounds' : 'game sound effects'} or upload custom overrides.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {effects.map(([key, config]) => {
                    const hasOverride = !!customSoundEffects[key];
                    return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel, rgba(255,255,255,0.03))', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ color: 'var(--text-primary, #fff)', fontWeight: '500', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {key}
                                    {hasOverride && <span style={{ color: 'var(--accent)', fontSize: '0.7rem', border: '1px solid var(--accent)', padding: '1px 4px', borderRadius: '3px' }}>Custom Override</span>}
                                </div>
                                <div style={{ color: 'var(--text-dim, #aaa)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {hasOverride ? 'Custom blob URL' : config.path}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                    onClick={() => preview(key)}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                    title="Preview sound"
                                >
                                    <Play size={16} />
                                </button>
                                <input
                                    type="file"
                                    id={`override-${key}`}
                                    hidden
                                    onChange={(event) => handleOverrideUpload(key, event)}
                                    accept="audio/*"
                                />
                                <label htmlFor={`override-${key}`} style={{ cursor: 'pointer', color: 'var(--text-dim, #aaa)', display: 'flex', alignItems: 'center' }} title="Upload custom sound">
                                    <Upload size={14} />
                                </label>
                                {hasOverride && (
                                    <button
                                        onClick={() => removeCustomSoundEffect(key)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                        title="Restore default"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SoundEffectOverrides;
