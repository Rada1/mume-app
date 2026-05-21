/**
 * @file MapSettings.tsx
 * @description Settings-panel controls for mapper persistence, visibility, and map data actions.
 */

import React from 'react';
import { Crosshair, Download, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useGame, useLog, useUI } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { useMapperExportImport } from '../Mapper/hooks/useMapperExportImport';

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
        rooms, setRooms, markers, setMarkers, allowPersistence, setAllowPersistence,
        unveilMap, setUnveilMap, handleResetAndSync, handleClearMap
    } = mapper;
    const { handleExportMap, handleImportMap, handleImportMMapper } = useMapperExportImport(
        rooms,
        setRooms,
        markers,
        setMarkers,
        characterName,
        addMessage,
        mapper
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
                        <label className="setting-label" style={{ margin: 0 }}>Session Saving</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Persist mapper edits locally between sessions.</div>
                    </div>
                    <button className={`setting-toggle ${allowPersistence ? 'active' : ''}`} onClick={() => setAllowPersistence(!allowPersistence)} style={toggleStyle(allowPersistence)}>
                        <div style={knobStyle(allowPersistence)} />
                    </button>
                </div>
            </div>

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
        </div>
    );
};

export default MapSettings;
