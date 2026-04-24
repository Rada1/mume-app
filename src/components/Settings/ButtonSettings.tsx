import React from 'react';
import { Settings2, Plus, Grid, Layout, Palette } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

interface ButtonSettingsProps {
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    isGridEnabled: boolean;
    setIsGridEnabled: (val: boolean) => void;
    createButton: () => void;
    setIsSetManagerOpen: (val: boolean) => void;
}

const COLOR_DEFAULTS = {
    player: '#89CFF0',
    npc: 'rgba(253, 224, 71, 0.95)',
    object: 'rgba(251, 146, 60, 0.95)',
};

const toHex = (color: string): string => {
    if (color.startsWith('#')) return color;
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#888888';
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
};

const ColorRow: React.FC<{
    label: string;
    color: string;
    onChange: (val: string) => void;
    onReset: () => void;
    dot?: boolean;
}> = ({ label, color, onChange, onReset }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: color, flexShrink: 0,
                boxShadow: `0 0 6px ${color}`
            }} />
            <span style={{ fontSize: '0.85rem' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
                type="color"
                value={toHex(color)}
                onChange={e => onChange(e.target.value)}
                style={{ width: '28px', height: '20px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            />
            <button
                className="btn-secondary"
                style={{ margin: 0, padding: '2px 8px', fontSize: '0.65rem', height: 'auto' }}
                onClick={onReset}
            >Reset</button>
        </div>
    </div>
);

const ButtonSettings: React.FC<ButtonSettingsProps> = ({
    isEditMode,
    setIsEditMode,
    isGridEnabled,
    setIsGridEnabled,
    createButton,
    setIsSetManagerOpen
}) => {
    const { playerColor, setPlayerColor, npcColor, setNpcColor, objectColor, setObjectColor } = useSettingsStore();

    return (
        <div className="settings-section">
            <h3 className="settings-section-title">
                <Layout size={18} /> Button & UI Layout
            </h3>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Design Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            Enable to drag, resize, and customize your HUD buttons.
                        </div>
                    </div>
                    <div
                        className={`setting-toggle ${isEditMode ? 'active' : ''}`}
                        onClick={() => setIsEditMode(!isEditMode)}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isEditMode ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isEditMode ? '22px' : '2px',
                            transition: 'all 0.3s'
                        }} />
                    </div>
                </div>

                {isEditMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', paddingTop: '15px', borderTop: '1px solid var(--border-modal)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Grid size={16} color="var(--text-dim)" />
                                <span style={{ fontSize: '0.85rem' }}>Snap to Grid</span>
                            </div>
                            <div
                                className={`setting-toggle ${isGridEnabled ? 'active' : ''}`}
                                onClick={() => setIsGridEnabled(!isGridEnabled)}
                                style={{ height: '20px', width: '38px', position: 'relative', border: 'none', backgroundColor: isGridEnabled ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.3s' }}
                            >
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '2px',
                                    left: isGridEnabled ? '20px' : '2px',
                                    transition: 'all 0.3s'
                                }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                                className="btn-secondary"
                                onClick={createButton}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px' }}
                            >
                                <Plus size={16} /> New Button
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setIsSetManagerOpen(true)}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px' }}
                            >
                                <Settings2 size={16} /> Manage Sets
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {!isEditMode && (
                <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border-modal)', borderRadius: '8px', opacity: 0.6, marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.85rem', marginBottom: '10px' }}>Design mode is currently disabled.</div>
                    <button className="btn-secondary" onClick={() => setIsEditMode(true)}>Enable Design Mode</button>
                </div>
            )}

            <h3 className="settings-section-title" style={{ marginTop: '8px' }}>
                <Palette size={18} /> Inline Entity Colors
            </h3>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <ColorRow
                    label="Players"
                    color={playerColor}
                    onChange={setPlayerColor}
                    onReset={() => setPlayerColor(COLOR_DEFAULTS.player)}
                />
                <ColorRow
                    label="NPCs"
                    color={npcColor}
                    onChange={setNpcColor}
                    onReset={() => setNpcColor(COLOR_DEFAULTS.npc)}
                />
                <ColorRow
                    label="Objects"
                    color={objectColor}
                    onChange={setObjectColor}
                    onReset={() => setObjectColor(COLOR_DEFAULTS.object)}
                />
            </div>
        </div>
    );
};

export default ButtonSettings;
