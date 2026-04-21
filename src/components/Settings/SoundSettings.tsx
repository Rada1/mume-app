import React, { useState } from 'react';
import { Upload, Trash2, Volume2, Plus, Music, Sliders } from 'lucide-react';
import { SoundTrigger } from '../../types';
import { useGame } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface SoundSettingsProps {
    isSoundEnabled: boolean;
    setIsSoundEnabled: (val: boolean) => void;
    soundTriggers: SoundTrigger[];
    setSoundTriggers: (val: SoundTrigger[]) => void;
    newSoundPattern: string;
    setNewSoundPattern: (val: string) => void;
    newSoundRegex: boolean;
    setNewSoundRegex: (val: boolean) => void;
    handleSoundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SoundSettings: React.FC<SoundSettingsProps> = ({
    isSoundEnabled,
    setIsSoundEnabled,
    soundTriggers,
    setSoundTriggers,
    newSoundPattern,
    setNewSoundPattern,
    newSoundRegex,
    setNewSoundRegex,
    handleSoundUpload,
}) => {
    const { zoneMusic, setZoneMusic } = useGame();
    const { 
        masterVolume, setMasterVolume, 
        sfxVolume, setSfxVolume, 
        musicVolume, setMusicVolume 
    } = useSettingsStore();
    const [newZoneName, setNewZoneName] = useState('');
    const [newZoneUrl, setNewZoneUrl] = useState('');

    const addZoneMusic = () => {
        if (!newZoneName || !newZoneUrl) return;
        setZoneMusic(prev => {
            const existingIdx = prev.findIndex(m => m.zone.toLowerCase() === newZoneName.toLowerCase());
            if (existingIdx >= 0) {
                const next = [...prev];
                const current = next[existingIdx];
                const urls = Array.isArray(current.url) ? current.url : [current.url];
                if (!urls.includes(newZoneUrl)) {
                    next[existingIdx] = { ...current, url: [...urls, newZoneUrl] };
                }
                return next;
            }
            return [...prev, { zone: newZoneName, url: newZoneUrl }];
        });
        setNewZoneName('');
        setNewZoneUrl('');
    };

    const removeZoneMusic = (zone: string) => {
        setZoneMusic(prev => prev.filter(m => m.zone !== zone));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="setting-group" style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: '#c4b5fd', fontWeight: 'bold', margin: 0 }}>Enable Sound</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginTop: '4px' }}>Play audio triggers and zone music.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: isSoundEnabled ? '#c4b5fd' : '#64748b' }}>{isSoundEnabled ? 'ON' : 'OFF'}</span>
                        <div
                            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: isSoundEnabled ? '#8b5cf6' : 'var(--input-bg, #334155)',
                                borderRadius: '20px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                background: '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isSoundEnabled ? '22px' : '2px',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Volume Levels Section */}
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
                    {/* Master Volume */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary, #fff)' }}>Master Volume</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{Math.round(masterVolume * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.01" 
                            value={masterVolume} 
                            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                    </div>

                    {/* SFX Volume */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary, #fff)' }}>Sound Effects (Combat, UI)</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{Math.round(sfxVolume * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.01" 
                            value={sfxVolume} 
                            onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                    </div>

                    {/* Music Volume */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary, #fff)' }}>Atmosphere & Music</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{Math.round(musicVolume * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.01" 
                            value={musicVolume} 
                            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent)' }}
                        />
                    </div>
                </div>
            </div>

            {/* Zone Music Section */}
            <div className="setting-group" style={{ opacity: isSoundEnabled ? 1 : 0.5, pointerEvents: isSoundEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Music size={16} /> Zone Music Mappings
                </label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '12px' }}>
                    Assign background music to game zones. Adding multiple URLs to one zone will pick one at random.
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

                <div className="trigger-list" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {zoneMusic.length === 0 && <div style={{ color: 'var(--text-dim, #64748b)', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>No zone music defined.</div>}
                    {zoneMusic.map((m, idx) => {
                        const urls = Array.isArray(m.url) ? m.url : [m.url];
                        return (
                            <div key={`${m.zone}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel, rgba(255,255,255,0.05))', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ color: 'var(--text-primary, #fff)', fontWeight: '500', fontSize: '0.85rem' }}>
                                        {m.zone} 
                                        {urls.length > 1 && <span style={{ color: 'var(--accent)', fontSize: '0.7rem', marginLeft: '8px' }}>({urls.length} variations)</span>}
                                    </div>
                                    <div style={{ color: 'var(--text-dim, #aaa)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {urls.length === 1 ? urls[0] : `${urls.length} files configured`}
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

            <div className="setting-group" style={{ opacity: isSoundEnabled ? 1 : 0.5, pointerEvents: isSoundEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                <label className="setting-label">Add Sound Trigger</label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '12px' }}>
                    Add sounds that play when text is matched. Multiple files for one pattern will pick one at random.
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                        className="setting-input"
                        placeholder="Text pattern to match..."
                        value={newSoundPattern}
                        onChange={(e) => setNewSoundPattern(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <input
                        type="file"
                        id="sound-upload"
                        hidden
                        onChange={handleSoundUpload}
                        accept="audio/*"
                    />
                    <label htmlFor="sound-upload" className={`btn-primary ${!newSoundPattern ? 'opacity-50' : ''}`} style={{ width: 'auto', margin: 0, padding: '0 15px', display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: !newSoundPattern ? 'none' : 'auto' }}>
                        <Upload size={16} /> Choose File
                    </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                    <input
                        type="checkbox"
                        id="new-sound-regex"
                        checked={newSoundRegex}
                        onChange={(e) => setNewSoundRegex(e.target.checked)}
                    />
                    <label htmlFor="new-sound-regex" style={{ color: 'var(--text-dim, #aaa)', fontSize: '0.9rem', cursor: 'pointer' }}>Regex?</label>
                </div>

                <div className="trigger-list">
                    <label className="setting-label">Configured Triggers</label>
                    {!soundTriggers.length && <div style={{ color: 'var(--text-dim, #64748b)', fontStyle: 'italic', padding: '10px' }}>No triggers defined yet.</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {soundTriggers.map((t) => {
                            const files = Array.isArray(t.fileName) ? t.fileName : [t.fileName];
                            return (
                                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel, rgba(255,255,255,0.05))', padding: '10px 15px', borderRadius: '6px', border: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Volume2 size={16} color="var(--accent)" />
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ color: 'var(--text-primary, #fff)', fontWeight: '500', fontSize: '0.9rem' }}>
                                                {t.pattern} {t.isRegex ? <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '4px' }}>[Regex]</span> : ''}
                                                {files.length > 1 && <span style={{ color: 'var(--accent)', fontSize: '0.7rem', marginLeft: '8px' }}>({files.length} variations)</span>}
                                            </div>
                                            <div style={{ color: 'var(--text-dim, #aaa)', fontSize: '0.75rem' }}>
                                                {files.length === 1 ? files[0] : `${files.length} variations configured`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSoundTriggers(soundTriggers.filter((st) => st.id !== t.id))}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SoundSettings;
