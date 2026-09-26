/**
 * @file MapRegionLabelsSettings.tsx
 * @description Settings-panel controls for LOTR-style region titles across the world map.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { Plus, Trash2, Type } from 'lucide-react';
import { useMapper } from '../../context/useMapper';

// --- Render Section ---
export const MapRegionLabelsSettings: FC = () => {
    const mapper = useMapper();
    const { regionLabels, addRegionLabel, updateRegionLabel, deleteRegionLabel } = mapper;

    const regionLabelList = React.useMemo(
        () => Object.values(regionLabels).sort((a, b) => a.createdAt - b.createdAt),
        [regionLabels]
    );

    const handleAddAtCenter = () => {
        const text = window.prompt('Region label text (e.g. "Mordor"):')?.trim();
        if (!text) return;
        const cam = (mapper as unknown as { cameraRef?: React.MutableRefObject<{ x: number; y: number } | null> }).cameraRef?.current;
        const wx = cam ? (cam.x + 200) / 32 : 0;
        const wy = cam ? (cam.y + 200) / 32 : 0;
        addRegionLabel({ text, x: wx, y: wy, z: 0, fontSize: 80 });
    };

    return (
        <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                    <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Region Labels</label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>LOTR-style titles for huge areas (e.g. "Eregion", "Mordor"). Global across all characters.</div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0', borderTop: '1px solid var(--border-modal)' }}>
                <Type size={14} style={{ color: 'var(--text-dim)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{regionLabelList.length} label{regionLabelList.length === 1 ? '' : 's'}</span>
                <div style={{ flex: 1 }} />
                <button
                    className="btn-secondary"
                    style={{ marginTop: 0, width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
                    onClick={handleAddAtCenter}
                >
                    <Plus size={14} /> Add at center
                </button>
            </div>

            {regionLabelList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-modal)' }}>
                    {regionLabelList.map(label => (
                        <div key={label.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'var(--input-bg)', padding: '8px', borderRadius: '6px' }}>
                            <input
                                type="text"
                                value={label.text}
                                onChange={e => updateRegionLabel(label.id, { text: e.target.value })}
                                style={{ flex: 1, minWidth: 0, background: 'transparent', border: '1px solid var(--border-modal)', borderRadius: '4px', padding: '4px 6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                placeholder="Region name"
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-dim)' }} title="Font size (world units)">
                                Size
                                <input
                                    type="number"
                                    value={label.fontSize}
                                    min={10}
                                    max={500}
                                    step={5}
                                    onChange={e => updateRegionLabel(label.id, { fontSize: Number(e.target.value) || 80 })}
                                    style={{ width: '60px', background: 'transparent', border: '1px solid var(--border-modal)', borderRadius: '4px', padding: '4px 6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-dim)' }} title="Rotation (degrees, -180 to 180)">
                                Rot
                                <input
                                    type="number"
                                    value={Math.round(((label.rotation || 0) * 180 / Math.PI) * 10) / 10}
                                    min={-180}
                                    max={180}
                                    step={1}
                                    onChange={e => {
                                        const deg = Number(e.target.value) || 0;
                                        updateRegionLabel(label.id, { rotation: deg * Math.PI / 180 });
                                    }}
                                    style={{ width: '55px', background: 'transparent', border: '1px solid var(--border-modal)', borderRadius: '4px', padding: '4px 6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-dim)' }} title="Layer (Z floor)">
                                Z
                                <input
                                    type="number"
                                    value={label.z}
                                    step={1}
                                    onChange={e => updateRegionLabel(label.id, { z: Number(e.target.value) || 0 })}
                                    style={{ width: '50px', background: 'transparent', border: '1px solid var(--border-modal)', borderRadius: '4px', padding: '4px 6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                />
                            </label>
                            <button
                                onClick={() => deleteRegionLabel(label.id)}
                                style={{ background: 'transparent', border: '1px solid rgba(248, 113, 113, 0.4)', color: '#f87171', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer' }}
                                title="Delete label"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MapRegionLabelsSettings;
