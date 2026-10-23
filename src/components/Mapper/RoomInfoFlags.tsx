/** @file RoomInfoFlags.tsx — Compact room attribute and note badges. */
import React from 'react';
import type { RoomInfoFlagsProps } from '../../types';
import { getRoomPortableState, getRoomRidableState } from './mapperUtils';

// --- Room badges ---
export const RoomInfoFlags = ({ room, noteBadges }: RoomInfoFlagsProps) => {
    const hasNoteHerb = noteBadges.some(badge => badge.text.includes('Herb'));
    const getAdditionalFlags = () => {
        const flags: React.JSX.Element[] = [];

        const alignLabels: Readonly<Record<number, string>> = {
            0: 'undefined',
            1: 'good',
            2: 'neutral',
            3: 'evil',
        };
        const alignLabel = typeof room.align === 'number'
            ? alignLabels[room.align] || String(room.align)
            : room.align?.trim();
        const normalizedAlign = alignLabel?.toLowerCase();

        if (alignLabel && normalizedAlign !== 'undefined' && normalizedAlign !== '0') {
            let color = '#cad3f5';
            let bg = 'rgba(202, 211, 245, 0.1)';
            if (normalizedAlign === 'good') { color = '#89b4fa'; bg = 'rgba(137, 180, 250, 0.15)'; }
            else if (normalizedAlign === 'evil') { color = '#f38ba8'; bg = 'rgba(243, 139, 168, 0.15)'; }
            
            flags.push(
                <span key="align" style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                    Align: {alignLabel}
                </span>
            );
        }

        const portableState = getRoomPortableState(room.portable);
        if (portableState !== null) {
            const isPort = portableState;
            const color = isPort ? '#a6e3a1' : '#f38ba8';
            const bg = isPort ? 'rgba(166, 227, 161, 0.1)' : 'rgba(243, 139, 168, 0.1)';
            flags.push(
                <span key="portable" style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                    {isPort ? 'PORTABLE' : 'NO_PORT'}
                </span>
            );
        }

        const ridableState = getRoomRidableState(room.ridable);
        if (ridableState !== null) {
            const isRide = ridableState;
            const color = isRide ? '#a6e3a1' : '#ee99a0';
            const bg = isRide ? 'rgba(166, 227, 161, 0.1)' : 'rgba(238, 153, 160, 0.1)';
            flags.push(
                <span key="ridable" style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                    {isRide ? 'RIDABLE' : 'NO_RIDE'}
                </span>
            );
        }

        return flags;
    };

    return <>
            {(room.mobFlags?.length || room.loadFlags?.length || room.roomQuestFlags?.length || room.align || room.portable !== undefined || room.ridable !== undefined || room.notes) ? (
                <div className="room-info-card-flags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {room.mobFlags?.map(f => {
                        const isAgg = f.includes('AGGRESSIVE');
                        const isShop = f.includes('SHOP');
                        const isGuild = f.includes('GUILD');
                        const isDark = f === 'DARK';
                        const isNoSun = f === 'NO_SUNDEATH';
                        
                        let color = '#94e2d5'; // DEFAULT TEAL
                        let bg = 'rgba(148, 226, 213, 0.1)';
                        if (isAgg) { color = '#f38ba8'; bg = 'rgba(243, 139, 168, 0.15)'; }
                        else if (isShop) { color = '#f9e2af'; bg = 'rgba(249, 226, 175, 0.15)'; }
                        else if (isGuild) { color = '#cba6f7'; bg = 'rgba(203, 166, 247, 0.15)'; }
                        else if (isDark) { color = '#cad3f5'; bg = 'rgba(202, 211, 245, 0.15)'; }
                        else if (isNoSun) { color = '#ee99a0'; bg = 'rgba(238, 153, 160, 0.15)'; }

                        return (
                            <span key={f} style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                                {f.replace('BIN_MOB_', '')}
                            </span>
                        );
                    })}
                    {room.loadFlags?.map(f => {
                        const flag = f.toUpperCase();
                        const isHerb = flag.includes('HERB');
                        if (isHerb && hasNoteHerb) return null;
                        const isWater = flag.includes('WATER') || flag.includes('POND') || flag.includes('WELL') || flag.includes('FOUNTAIN');
                        const isFood = /FOOD|BERRY|VEGETABLE/i.test(flag);
                        const isHorse = /HORSE|STALLION|DONKEY/i.test(flag);
                        const isBoat = /BOAT/i.test(flag);
                        const isStable = /STABLE/i.test(flag);
                        const isDT = /DT|DEATHTRAP/i.test(flag);
                        const isFerry = /FERRY/i.test(flag);
                        const isCoach = /COACH/i.test(flag);

                        let color = '#94e2d5'; // DEFAULT TEAL
                        let bg = 'rgba(148, 226, 213, 0.1)';
                        if (isHerb) { color = '#a6e3a1'; bg = 'rgba(166, 227, 161, 0.15)'; }
                        else if (isWater) { color = '#89b4fa'; bg = 'rgba(137, 180, 250, 0.15)'; }
                        else if (isFood) { color = '#f9e2af'; bg = 'rgba(249, 226, 175, 0.15)'; }
                        else if (isHorse) { color = '#cba6f7'; bg = 'rgba(203, 166, 247, 0.15)'; }
                        else if (isBoat) { color = '#94e2d5'; bg = 'rgba(148, 226, 213, 0.15)'; }
                        else if (isStable) { color = '#fab387'; bg = 'rgba(250, 179, 135, 0.15)'; }
                        else if (isDT) { color = '#f38ba8'; bg = 'rgba(243, 139, 168, 0.15)'; }
                        else if (isFerry) { color = '#74c7ec'; bg = 'rgba(116, 199, 236, 0.15)'; }
                        else if (isCoach) { color = '#b4befe'; bg = 'rgba(180, 190, 254, 0.15)'; }

                        return (
                            <span key={f} style={{ color, backgroundColor: bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${color}33`, textTransform: 'uppercase' }}>
                                {f.replace('BIN_LOAD_', '')}
                            </span>
                        );
                    })}
                    {room.roomQuestFlags?.map(f => (
                        <span key={f} style={{ color: '#00c0ff', backgroundColor: 'rgba(0, 192, 255, 0.15)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #00c0ff33', textTransform: 'uppercase' }}>
                            {f}
                        </span>
                    ))}
                    {getAdditionalFlags()}
                    {noteBadges.map((badge, idx) => (
                        <span key={`note-badge-${idx}`} style={{ color: badge.color, backgroundColor: badge.bg, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', border: `1px solid ${badge.color}33`, textTransform: 'uppercase' }}>
                            {badge.text}
                        </span>
                    ))}
                </div>
            ) : null}

    </>;
};
