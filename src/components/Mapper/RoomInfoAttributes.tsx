/** @file RoomInfoAttributes.tsx — Map-edit attribute controls for a room. */
import React from 'react';
import type { RoomInfoSectionProps } from '../../types';
import { getRoomPortableState, getRoomRidableState } from './mapperUtils';

// --- Attribute controls ---
export const RoomInfoAttributes = ({ room, mode, isDarkMode, updateRoom }: RoomInfoSectionProps) => <>
            {mode === 'edit' && (
                <div className="room-info-card-editor" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    backgroundColor: isDarkMode ? '#1c1c1f' : '#ffffff',
                    border: isDarkMode ? '1px solid #27272a' : '1px solid #d1d1d6',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px'
                }}>
                    <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Room Attributes</span>
                    
                    {/* Portable / Ridable / Align Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {/* Portable Select */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#71717a', fontSize: '10px', fontWeight: '600' }}>Portability</span>
                            <select
                                value={getRoomPortableState(room.portable) !== null ? String(getRoomPortableState(room.portable)) : 'undefined'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    updateRoom({ portable: val === 'undefined' ? 0 : val === 'true' ? 1 : 2 });
                                }}
                                style={{ backgroundColor: isDarkMode ? '#141417' : '#f4f4f5', border: 'none', color: isDarkMode ? '#e4e4e7' : '#1d1d1f', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
                            >
                                <option value="undefined">Unspecified</option>
                                <option value="true">Portable</option>
                                <option value="false">No Port</option>
                            </select>
                        </div>
                        
                        {/* Ridable Select */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#71717a', fontSize: '10px', fontWeight: '600' }}>Riding</span>
                            <select
                                value={getRoomRidableState(room.ridable) !== null ? String(getRoomRidableState(room.ridable)) : 'undefined'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    updateRoom({ ridable: val === 'undefined' ? undefined : val });
                                }}
                                style={{ backgroundColor: isDarkMode ? '#141417' : '#f4f4f5', border: 'none', color: isDarkMode ? '#e4e4e7' : '#1d1d1f', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
                            >
                                <option value="undefined">Unspecified</option>
                                <option value="true">Ridable</option>
                                <option value="false">No Ride (no_ride)</option>
                            </select>
                        </div>

                        {/* Align Select */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#71717a', fontSize: '10px', fontWeight: '600' }}>Alignment</span>
                            <select
                                aria-label="Room alignment"
                                value={Number(room.align) === 1 ? 'good' : Number(room.align) === 2 ? 'neutral' : Number(room.align) === 3 ? 'evil' : room.align || 'undefined'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    updateRoom({ align: val === 'undefined' ? undefined : val });
                                }}
                                style={{ backgroundColor: isDarkMode ? '#141417' : '#f4f4f5', border: 'none', color: isDarkMode ? '#e4e4e7' : '#1d1d1f', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
                            >
                                <option value="undefined">Neutral / None</option>
                                <option value="good">Good</option>
                                <option value="neutral">Neutral</option>
                                <option value="evil">Evil</option>
                            </select>
                        </div>
                    </div>

                    <div className="room-info-attribute-selects">
                        <label>Lighting<select aria-label="Room lighting" value={String(room.light ?? 0)} onChange={event => updateRoom({ light: Number(event.target.value) })}>
                            <option value="0">Unspecified</option><option value="1">Dark</option><option value="2">Lit</option>
                        </select></label>
                    </div>
                </div>
            )}

</>;
