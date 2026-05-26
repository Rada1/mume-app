/**
 * @file MapSettings.tsx
 * @description Settings-panel controls for mapper persistence, visibility, and map data actions.
 */

import React from 'react';
import { Crosshair, Download, Plus, RefreshCw, Trash2, Type, Upload } from 'lucide-react';
import { useGame, useLog, useUI } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { useMapperExportImport } from '../Mapper/hooks/useMapperExportImport';
import { useSettingsStore } from '../../stores/useSettingsStore';
import MapVisualSettings from './MapVisualSettings';

const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderTop: '1px solid var(--border-modal)'
};

const toggleStyle = (active: boolean): React.CSSProperties => ({
    height: '24px',
    width: '45px',
    position: 'relative',
    border: 'none',
    backgroundColor: active ? 'var(--accent)' : 'var(--input-bg)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    flexShrink: 0
});

const knobStyle = (active: boolean): React.CSSProperties => ({
    width: '20px',
    height: '20px',
    background: '#fff',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: active ? '22px' : '2px',
    transition: 'all 0.3s'
});

const MapSettings: React.FC = () => {
    const { characterName } = useGame();
    const { addMessage } = useLog();
    const { ui, setUI } = useUI();
    const mapper = useMapper();
    const {
        showBackgroundImage,
        setShowBackgroundImage,
        showDebugEchoes,
        setShowDebugEchoes,
    } = useSettingsStore();
    const {
        rooms, setRooms, markers, setMarkers, allowPersistence, setAllowPersistence,
        unveilMap, setUnveilMap, handleResetAndSync, handleClearMap, setExploredMarkers,
        regionLabels, addRegionLabel, updateRegionLabel, deleteRegionLabel,
        regionLabelEditMode, setRegionLabelEditMode
    } = mapper;
    const regionLabelList = React.useMemo(
        () => Object.values(regionLabels).sort((a, b) => a.createdAt - b.createdAt),
        [regionLabels]
    );
    const { handleExportMap, handleImportMap, handleImportMMapper } = useMapperExportImport(
        rooms,
        setRooms,
        markers,
        setMarkers,
        characterName,
        addMessage,
        mapper,
        setExploredMarkers
    );
    return (
        <div className="settings-section">
            <h3 className="settings-section-title">Map</h3>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Map Visibility</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Control exploration display and local map persistence.</div>
                    </div>
                </div>

                <div style={rowStyle}>
                    <div>
                        <label className="setting-label" style={{ margin: 0 }}>Map Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Switch between navigation and mapper editing.</div>
                    </div>
                    <div style={{ display: 'flex', backgroundColor: 'var(--input-bg)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-modal)' }}>
                        <button
                            onClick={() => setUI(prev => ({ ...prev, mapMode: 'play' }))}
                            style={{ padding: '4px 12px', borderRadius: '18px', border: 'none', cursor: 'pointer', backgroundColor: (ui.mapMode || 'play') === 'play' ? 'var(--accent)' : 'transparent', color: (ui.mapMode || 'play') === 'play' ? '#000' : 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >Play</button>
                        <button
                            onClick={() => setUI(prev => ({ ...prev, mapMode: 'edit' }))}
                            style={{ padding: '4px 12px', borderRadius: '18px', border: 'none', cursor: 'pointer', backgroundColor: ui.mapMode === 'edit' ? 'var(--accent)' : 'transparent', color: ui.mapMode === 'edit' ? '#000' : 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 'bold' }}
                        >Edit</button>
                    </div>
                </div>

                <div style={rowStyle}>
                    <div>
                        <label className="setting-label" style={{ margin: 0 }}>Reveal All Rooms</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Show unexplored rooms on the mapper.</div>
                    </div>
                    <button className={`setting-toggle ${unveilMap ? 'active' : ''}`} onClick={() => setUnveilMap(!unveilMap)} style={toggleStyle(unveilMap)}>
                        <div style={knobStyle(unveilMap)} />
                    </button>
                </div>

                <div style={rowStyle}>
                    <div>
                        <label className="setting-label" style={{ margin: 0 }}>Show Background Image</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Show the Middle-earth map image behind the mapper.</div>
                    </div>
                    <button className={`setting-toggle ${showBackgroundImage ? 'active' : ''}`} onClick={() => setShowBackgroundImage(!showBackgroundImage)} style={toggleStyle(showBackgroundImage)}>
                        <div style={knobStyle(showBackgroundImage)} />
                    </button>
                </div>

                <div style={rowStyle}>
                    <div>
                        <label className="setting-label" style={{ margin: 0 }}>Session Saving</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Persist mapper edits locally between sessions.</div>
                    </div>
                    <button className={`setting-toggle ${allowPersistence ? 'active' : ''}`} onClick={() => setAllowPersistence(!allowPersistence)} style={toggleStyle(allowPersistence)}>
                        <div style={knobStyle(allowPersistence)} />
                    </button>
                </div>
            </div>

            <MapVisualSettings />

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', marginBottom: '12px', display: 'block' }}>Map Actions</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => window.dispatchEvent(new Event('mume-mapper-center-on-player'))}>
                        <Crosshair size={16} /> Center
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={handleResetAndSync}>
                        <RefreshCw size={16} /> Sync
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={handleExportMap}>
                        <Download size={16} /> Export
                    </button>
                    <label className="btn-secondary" style={{ marginTop: 0, width: 'auto' }}>
                        <Upload size={16} /> Import
                        <input type="file" onChange={handleImportMap} style={{ display: 'none' }} accept=".json" />
                    </label>
                    <label className="btn-secondary" style={{ marginTop: 0, width: 'auto' }}>
                        <Upload size={16} /> Import MM2
                        <input type="file" onChange={handleImportMMapper} style={{ display: 'none' }} accept=".mm2" />
                    </label>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.45)' }} onClick={() => handleClearMap()}>
                        <Trash2 size={16} /> Clear
                    </button>
                </div>
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Region Labels</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>LOTR-style titles for huge areas (e.g. "Eregion", "Mordor"). Global across all characters.</div>
                    </div>
                </div>

                <div style={rowStyle}>
                    <div>
                        <label className="setting-label" style={{ margin: 0 }}>Edit Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Click the map to drop a label. Click an existing label to select it.</div>
                    </div>
                    <button className={`setting-toggle ${regionLabelEditMode ? 'active' : ''}`} onClick={() => setRegionLabelEditMode(v => !v)} style={toggleStyle(regionLabelEditMode)}>
                        <div style={knobStyle(regionLabelEditMode)} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0', borderTop: '1px solid var(--border-modal)' }}>
                    <Type size={14} style={{ color: 'var(--text-dim)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{regionLabelList.length} label{regionLabelList.length === 1 ? '' : 's'}</span>
                    <div style={{ flex: 1 }} />
                    <button
                        className="btn-secondary"
                        style={{ marginTop: 0, width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => {
                            const text = window.prompt('Region label text (e.g. "Mordor"):')?.trim();
                            if (!text) return;
                            const cam = (mapper as any).cameraRef?.current;
                            const wx = cam ? (cam.x + 200) / 32 : 0;
                            const wy = cam ? (cam.y + 200) / 32 : 0;
                            addRegionLabel({ text, x: wx, y: wy, z: 0, fontSize: 80 });
                        }}
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
            <div style={rowStyle}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Debug Messages</span>
                        <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>DEV</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>Show technical client echoes (e.g. mapper coordinates).</div>
                </div>
                <button style={toggleStyle(showDebugEchoes)} onClick={() => setShowDebugEchoes(!showDebugEchoes)}>
                    <div style={knobStyle(showDebugEchoes)} />
                </button>
            </div>
        </div>
    );
};

export default MapSettings;
