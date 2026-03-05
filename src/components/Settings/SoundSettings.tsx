import React from 'react';
import { Upload, Trash2, Volume2 } from 'lucide-react';
import { SoundTrigger } from '../../types';

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
    return (
        <>
            <div className="setting-group" style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: '#c4b5fd', fontWeight: 'bold', margin: 0 }}>Enable Sound</label>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Play audio triggers when patterns match.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: isSoundEnabled ? '#c4b5fd' : '#64748b' }}>{isSoundEnabled ? 'ON' : 'OFF'}</span>
                        <div
                            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: isSoundEnabled ? '#8b5cf6' : '#334155',
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

            <div className="setting-group" style={{ opacity: isSoundEnabled ? 1 : 0.5, pointerEvents: isSoundEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                <label className="setting-label">Add Sound Trigger</label>
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
                    <label htmlFor="new-sound-regex" style={{ color: '#aaa', fontSize: '0.9rem', cursor: 'pointer' }}>Regex?</label>
                </div>

                <div className="trigger-list" style={{ marginTop: '20px' }}>
                    <label className="setting-label">Configured Triggers</label>
                    {!soundTriggers.length && <div style={{ color: '#64748b', fontStyle: 'italic', padding: '10px' }}>No triggers defined yet.</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {soundTriggers.map((t) => (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Volume2 size={16} color="var(--accent)" />
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ color: '#fff', fontWeight: '500', fontSize: '0.9rem' }}>{t.pattern} {t.isRegex ? <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '4px' }}>[Regex]</span> : ''}</div>
                                        <div style={{ color: '#aaa', fontSize: '0.75rem' }}>{t.fileName}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSoundTriggers(soundTriggers.filter((st) => st.id !== t.id))}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SoundSettings;
