/** @file RoomInfoCard.tsx — Room information and always-available notes editor. */
import React from 'react';
import { Pencil } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { RoomInfoCardProps } from '../../types';
import { useRoomInfoCard } from '../../hooks/useRoomInfoCard';
import { TERRAIN_MAP, stripAnsi } from './mapperUtils';
import { RoomInfoFlags } from './RoomInfoFlags';
import { RoomInfoExits } from './RoomInfoExits';
import { RoomMapFlagsEditor } from './RoomMapFlagsEditor';
import './RoomInfoCard.css';

// --- Room card presentation ---
export const RoomInfoCard: React.FC<RoomInfoCardProps> = (props) => {
    const {roomId, mode, onClose, cardRef, isDarkMode, onWalkStart, stopWalking, walkTargetId, isMobile = false} = props;
    const editor = useRoomInfoCard(props);
    const {room, terrainLabel, updateRoom, updateNotes, editExit, noteBadges} = editor;
    if (!room) return null;
    const staticContents = room.contents || '';
    const card = (
        <div
            ref={cardRef}
            className="mapper-room-info-panel"
            style={{
                position: isMobile ? 'fixed' : 'absolute',
                top: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 56px)' : '80px',
                bottom: isMobile
                    ? 'calc(var(--mobile-map-panel-height, 110px) + var(--mobile-bottom-reserved-space, 0px) + env(safe-area-inset-bottom, 0px) + 12px)'
                    : '48px',
                left: isMobile ? '12px' : '48px',
                right: isMobile ? '12px' : '48px',
                zIndex: isMobile ? 65002 : 100,
                backgroundColor: isMobile
                    ? (isDarkMode ? 'rgba(24, 24, 27, 0.96)' : 'rgba(245, 245, 247, 0.96)')
                    : (isDarkMode ? 'rgba(24, 24, 27, 0.4)' : 'rgba(245, 245, 247, 0.6)'),
                padding: isMobile ? '10px 12px' : '8px 12px',
                borderRadius: '12px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.8)', 
                border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)',
                display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px',
                overflowY: 'auto', pointerEvents: 'auto', color: isDarkMode ? '#e4e4e7' : '#1d1d1f', touchAction: 'pan-y'
            }}
        >
            <div className="room-info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, color: '#ffcc00', fontSize: '18px', fontWeight: 'bold' }}>Room Info</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {mode === 'play' && onWalkStart && (
                        walkTargetId === roomId ? (
                            <button
                                onClick={() => stopWalking?.()}
                                style={{ background: 'rgba(243, 139, 168, 0.15)', border: '1px solid rgba(243, 139, 168, 0.4)', color: '#f38ba8', cursor: 'pointer', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: '600' }}
                            >
                                Stop
                            </button>
                        ) : (
                            <button
                                onClick={() => onWalkStart(roomId)}
                                style={{ background: 'rgba(166, 227, 161, 0.15)', border: '1px solid rgba(166, 227, 161, 0.4)', color: '#a6e3a1', cursor: 'pointer', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: '600' }}
                            >
                                Walk Here
                            </button>
                        )
                    )}
                    <button aria-label="Close room info" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>

            <div className="room-info-card-ids" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a1a1aa' }}>
                <span>Client ID: <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{roomId}</span></span>
                <span>GMCP ID: <span style={{ color: '#60a5fa' }}>{room.gmcpId || 'N/A'}</span></span>
            </div>

            <div className="room-info-card-name" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                    type="text"
                    value={stripAnsi(room.name)}
                    onChange={(e) => updateRoom({ name: e.target.value })}
                    style={{ backgroundColor: isDarkMode ? '#1c1c1f' : '#ffffff', border: isDarkMode ? '1px solid #3f3f46' : '1px solid #d1d1d6', padding: '10px 14px', borderRadius: '8px', color: isDarkMode ? 'white' : '#1d1d1f', fontWeight: 'bold', fontSize: '15px' }}
                    readOnly={mode !== 'edit'}
                    placeholder="Room Name"
                />
            </div>

            <div className="room-info-card-meta" style={{ display: 'flex', gap: '10px' }}>
                <div style={{ backgroundColor: isDarkMode ? '#1c1c1f' : '#ffffff', border: isDarkMode ? '1px solid #27272a' : '1px solid #d1d1d6', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: isDarkMode ? '#71717a' : '#8e8e93', marginRight: '4px' }}>Zone: </span>
                    <input
                        type="text"
                        value={room.zone || ''}
                        onChange={(e) => updateRoom({ zone: e.target.value })}
                        style={{ backgroundColor: 'transparent', border: 'none', color: '#d4d4d8', width: '100%', outline: 'none', fontSize: '12px' }}
                        readOnly={mode !== 'edit'}
                        placeholder="Zone"
                    />
                </div>
                <div style={{ backgroundColor: '#1c1c1f', border: '1px solid #27272a', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#71717a', marginRight: '4px' }}>Terrain: </span>
                    {mode === 'edit' ? (
                        <select
                            value={terrainLabel}
                            onChange={(e) => updateRoom({ terrain: e.target.value })}
                            style={{ backgroundColor: 'transparent', border: 'none', color: '#10b981', fontWeight: 'bold', cursor: 'pointer', outline: 'none', fontSize: '12px' }}
                        >
                            {Array.from(new Set([...Object.values(TERRAIN_MAP), terrainLabel])).map(t => (
                                <option key={t} value={t} style={{ backgroundColor: '#181825', color: 'white' }}>{t}</option>
                            ))}
                        </select>
                    ) : (
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>{terrainLabel}</span>
                    )}
                </div>
            </div>

            {room.desc && (
                <div className="room-info-card-description" style={{ fontSize: '13px', color: isDarkMode ? '#d1d5db' : '#3a3a3c', backgroundColor: isDarkMode ? '#141417' : '#ffffff', padding: '14px', borderRadius: '8px', border: isDarkMode ? '1px solid #27272a' : '1px solid #d1d1d6', lineHeight: '1.6' }}>
                    {room.desc}
                </div>
            )}

            {staticContents && (
                <div className="room-info-card-static" style={{
                    fontSize: '12px',
                    color: isDarkMode ? '#dff6ff' : '#164e63',
                    backgroundColor: isDarkMode ? 'rgba(116, 199, 236, 0.08)' : 'rgba(8, 145, 178, 0.08)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: isDarkMode ? '1px solid rgba(116, 199, 236, 0.22)' : '1px solid rgba(8, 145, 178, 0.22)',
                    lineHeight: '1.4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginTop: '4px'
                }}>
                    <span style={{ fontWeight: '800', textTransform: 'uppercase', fontSize: '9px', color: '#74c7ec', letterSpacing: '0.05em' }}>Static Room Contents</span>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{staticContents}</div>
                </div>
            )}

            <div className="room-info-attributes-summary">
                <RoomInfoFlags room={room} noteBadges={noteBadges} />
                <button type="button" className="room-info-edit-flags" aria-label="Edit room attributes and flags"
                    title="Edit room attributes and flags" aria-expanded={editor.flagsEditing}
                    aria-controls="room-info-flag-editor" onClick={editor.toggleFlagsEditor}><Pencil size={13} /></button>
            </div>
            <RoomMapFlagsEditor editor={editor} />

            <div className="room-info-card-notes">
                <label htmlFor={`room-notes-${roomId}`}>Notes</label>
                <textarea id={`room-notes-${roomId}`} value={room.notes} rows={4}
                    placeholder="Add notes for this room…"
                    onChange={event => updateNotes(event.target.value)}
                    onKeyDown={event => event.stopPropagation()} />
                <small>Notes save with your map.</small>
            </div>

            <div className="room-info-card-divider" style={{ height: '1px', backgroundColor: '#27272a', margin: '4px 0' }} />

            <RoomInfoExits room={room} mode={mode} isDarkMode={isDarkMode} editExit={editExit} />
        </div>
    );

    if (isMobile && typeof document !== 'undefined') {
        const overlayRoot = document.querySelector('.app-container') ?? document.body;
        return createPortal(card, overlayRoot);
    }
    return card;
};
