/**
 * @file SpectateSettings.tsx
 * @description Settings for tell controlled spectating.
 */

import React from 'react';
import { Eye } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

// --- UI ---

export const SpectateSettings: React.FC = () => {
    const enabled = useSettingsStore(state => state.enableTellSpectateControl);
    const setEnabled = useSettingsStore(state => state.setEnableTellSpectateControl);

    return (
        <div className="setting-group" style={{ border: '1px solid rgba(212, 170, 0, 0.3)', background: 'rgba(10, 13, 21, 0.6)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                <Eye size={16} style={{ color: 'var(--accent)' }} />
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Spectate Commands</label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ flex: '1 1 200px' }}>
                    <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Allow tell controls</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        A tell or whisper containing only “spectateon” adds its sender to your spectate queue. “spectateoff” removes them and stops snooping them if active.
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-label="Allow spectating to be controlled by tells"
                    aria-checked={enabled}
                    className={`setting-toggle ${enabled ? 'active' : ''}`}
                    onClick={() => setEnabled(!enabled)}
                    style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: enabled ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                    <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: enabled ? '22px' : '2px', transition: 'all 0.3s' }} />
                </button>
            </div>
        </div>
    );
};
