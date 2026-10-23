/** @file RoomInfoExits.tsx — Room exit diagnostics and map-edit controls. */
import React from 'react';
import type { RoomInfoExitsProps } from '../../types';

// --- Exit presentation ---
export const RoomInfoExits = ({ room, mode, isDarkMode, editExit }: RoomInfoExitsProps) => (
            <div className="room-info-card-exits" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Exits & Diagnostics</span>
                    {mode === 'edit' && <span style={{ fontSize: '9px', color: '#52525b' }}>Shift+Click to delete</span>}
                </div>
                <div className="room-info-card-exit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {['n', 'u', 's', 'w', 'd', 'e'].map(d => {
                        const exit = room.exits[d];
                        const isActive = !!exit;
                        if (!isActive && mode !== 'edit') return null;

                        return (
                            <div key={d} className="room-info-card-exit" style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: isDarkMode ? '#1c1c1f' : '#ffffff', padding: '8px', borderRadius: '8px', border: isDarkMode ? '1px solid #27272a' : '1px solid #d1d1d6' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: isActive ? '#60a5fa' : (isDarkMode ? '#3f3f46' : '#8e8e93') }}>{d.toUpperCase()}</span>
                                    {isActive && (
                                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: exit.hasDoor ? '#fab387' : '#52525b' }}>
                                            {exit.doorName || `DOOR: ${exit.hasDoor ? 'YES' : 'NO'}`}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={event => editExit(d, event.shiftKey)}
                                    style={{
                                        width: '100%',
                                        backgroundColor: isActive ? (exit?.closed ? (isDarkMode ? '#521313' : '#fee2e2') : (isDarkMode ? '#27272a' : '#f2f2f7')) : 'transparent',
                                        color: isActive ? (exit?.closed ? (isDarkMode ? '#f87171' : '#ef4444') : (isDarkMode ? '#e4e4e7' : '#1d1d1f')) : (isDarkMode ? '#3f3f46' : '#8e8e93'),
                                        border: '1px solid',
                                        borderColor: isActive ? (exit?.closed ? (isDarkMode ? '#f87171' : '#ef4444') : (isDarkMode ? '#3f3f46' : '#d1d1d6')) : (isDarkMode ? '#313244' : '#e5e5ea'),
                                        padding: '6px 4px',
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        fontWeight: '500',
                                        cursor: mode === 'edit' ? 'pointer' : 'default',
                                        transition: 'all 0.2s',
                                        opacity: isActive ? 1 : 0.4
                                    }}
                                >
                                    {isActive ? (exit.target.startsWith('m_') ? `#${exit.target.substring(2)}` : 'Local') : 'NO EXIT'}
                                </button>
                                {isActive && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                                        {exit.flags && exit.flags.length > 0 ? (
                                            exit.flags.map(f => (
                                                <span key={f} style={{ fontSize: '8px', color: '#a6e3a1', backgroundColor: isDarkMode ? 'rgba(166, 227, 161, 0.1)' : 'rgba(52, 199, 89, 0.1)', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(166, 227, 161, 0.2)' }}>
                                                    {f}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '8px', color: '#52525b', fontStyle: 'italic' }}>no flags</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
);
