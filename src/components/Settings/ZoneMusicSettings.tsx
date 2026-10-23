/** @file Zone music mapping editor. */
import React from 'react';
import { Upload, Trash2, Plus, Music, RotateCcw } from 'lucide-react';
import { AUDIO_MANIFEST } from '../../constants/audioManifest';
import { useZoneMusicSettings } from '../../hooks/useZoneMusicSettings';

// --- Zone Music View ---
const ZoneMusicSettings = ({ isSoundEnabled }: { isSoundEnabled: boolean }) => {
    const { zoneMusic, newZoneName, setNewZoneName, newZoneUrl, setNewZoneUrl,
        addZoneMusic, removeZoneMusic, handleZoneOverrideUpload } = useZoneMusicSettings();
    return (
            <div className="setting-group" style={{ opacity: isSoundEnabled ? 1 : 0.5, pointerEvents: isSoundEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Music size={16} /> Zone Music
                </label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '12px' }}>
                    Configure background music for game zones. Show/override default zones or add custom mappings.
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                        className="setting-input"
                        placeholder="Zone Name (e.g. Bree)"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <input
                        className="setting-input"
                        placeholder="Audio URL (e.g. /assets/Music/bree.mp3)"
                        value={newZoneUrl}
                        onChange={(e) => setNewZoneUrl(e.target.value)}
                        style={{ flex: 2 }}
                    />
                    <button 
                        className="btn-primary" 
                        onClick={addZoneMusic}
                        disabled={!newZoneName || !newZoneUrl}
                        style={{ width: 'auto', margin: 0, padding: '0 15px' }}
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <div className="trigger-list" style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Render active customizations first, followed by default zones */}
                    {Object.entries(AUDIO_MANIFEST.ambient.zones).map(([zoneName, defaultMapping]) => {
                        const custom = zoneMusic.find(m => m.zone.toLowerCase() === zoneName.toLowerCase());
                        const isOverridden = !!custom;
                        const url = isOverridden ? custom.url : defaultMapping.url;

                        return (
                            <div key={`default-zone-${zoneName}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel, rgba(255,255,255,0.03))', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ color: 'var(--text-primary, #fff)', fontWeight: '500', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {zoneName}
                                        <span style={{ fontSize: '0.7rem', color: isOverridden ? 'var(--accent)' : 'var(--text-dim, #777)', border: `1px solid ${isOverridden ? 'var(--accent)' : '#444'}`, padding: '1px 4px', borderRadius: '3px' }}>
                                            {isOverridden ? 'Overridden' : 'Default'}
                                        </span>
                                    </div>
                                    <div style={{ color: 'var(--text-dim, #aaa)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {url}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="file"
                                        id={`zone-override-${zoneName}`}
                                        hidden
                                        onChange={(e) => handleZoneOverrideUpload(zoneName, e)}
                                        accept="audio/*"
                                    />
                                    <label htmlFor={`zone-override-${zoneName}`} style={{ cursor: 'pointer', color: 'var(--text-dim, #aaa)', display: 'flex', alignItems: 'center' }} title="Upload custom track">
                                        <Upload size={14} />
                                    </label>
                                    {isOverridden && (
                                        <button
                                            onClick={() => removeZoneMusic(custom.zone)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                            title="Restore default music"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Custom user zones that do not overlap with defaults */}
                    {zoneMusic.filter(m => !AUDIO_MANIFEST.ambient.zones[m.zone.toLowerCase()]).map((m, idx) => {
                        return (
                            <div key={`custom-zone-${m.zone}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel, rgba(255,255,255,0.05))', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ color: 'var(--text-primary, #fff)', fontWeight: '500', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {m.zone}
                                        <span style={{ fontSize: '0.7rem', color: '#10b981', border: '1px solid #10b981', padding: '1px 4px', borderRadius: '3px' }}>Custom Mapping</span>
                                    </div>
                                    <div style={{ color: 'var(--text-dim, #aaa)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {m.url}
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeZoneMusic(m.zone)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

    );
};
export default ZoneMusicSettings;
