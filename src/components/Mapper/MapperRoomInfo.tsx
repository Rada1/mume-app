/**
 * @file MapperRoomInfo.tsx
 * @description Renders current room name, description, and clock as an overlay on the map.
 */

import React, { useState } from 'react';
import { useGame, useLog, useUI } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { TokenRenderer } from '../Messages/TokenRenderer';
import './MapperRoomInfo.css';
import './MapperRoomMeta.css';

const formatChipText = (value: string): string => (
    value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
);

const flagLabels = [
    { regex: /QUEST|MISSION/i, label: 'Quest' },
    { regex: /SHOP|STORE/i, label: 'Shop' },
    { regex: /GUILD|OFFICE/i, label: 'Guild' },
    { regex: /RENT|INN/i, label: 'Rent' },
    { regex: /AGGRESSIVE|DEATH|DANGER/i, label: 'Danger' },
    { regex: /STABLE|HORSE|MULE|PACK_HORSE|TRAINED_HORSE|WARG/i, label: 'Stable' },
    { regex: /HERB/i, label: 'Herb' },
    { regex: /WATER|POND|WELL|FOUNTAIN/i, label: 'Water' },
    { regex: /NO_SUNDEATH/i, label: 'No Sundeath' },
    { regex: /DARK/i, label: 'Dark' }
];

const deriveNoteFlags = (notes: string | undefined): string[] => {
    const noteLower = (notes || '').toLowerCase();
    if (!noteLower) return [];

    const flags: string[] = [];
    if (/(herb|plant|flower|root|berr|sage|thyme|clover|tarragon|cardamom|rosemary|mandrake|ginseng|garlic|wolfsbane|hemlock|belladonna|foxglove|lavender|comfrey)/.test(noteLower)) {
        flags.push('Herb');
    }
    if (/(gear|equipment|weapon|sword|shield|ring|cloak|boots|helmet|armou?r|mail|blade|dagger|bow|arrow|axe|spear|staff|robe|greaves|vambraces|gauntlets|circlet|belt)/.test(noteLower)) {
        flags.push('Equipment');
    }
    if (/(chest|coffer|key|lock)/.test(noteLower)) {
        flags.push('Key/Chest');
    }
    return flags;
};

const deriveMapFlags = (room: any, preloaded: any[] | undefined): string[] => {
    const mobFlags = [...(preloaded?.[7] || []), ...(room?.mobFlags || [])];
    const loadFlags = [...(preloaded?.[8] || []), ...(room?.loadFlags || [])];
    const questFlags = [...(room?.roomQuestFlags || [])];
    const allFlags = [...mobFlags, ...loadFlags, ...questFlags];
    const joined = allFlags.join('|');

    const labels = flagLabels
        .filter(flag => flag.regex.test(joined) || (flag.label === 'Quest' && questFlags.length > 0))
        .map(flag => flag.label);

    if (room?.align) labels.push(`Align ${room.align}`);
    if (room?.portable !== undefined) labels.push(String(room.portable) === 'true' ? 'Portable' : 'No Port');
    if (room?.ridable !== undefined) labels.push(String(room.ridable) === 'true' ? 'Ridable' : 'No Ride');

    return Array.from(new Set([...labels, ...deriveNoteFlags(room?.notes || preloaded?.[15])]));
};

export const MapperRoomInfo: React.FC = () => {
    const { roomName, roomDesc, roomZone, currentTerrain, triggerHaptic, env, viewport } = useGame();
    const { setPopoverState, popoverState } = useUI();
    const mapper = useMapper();
    const [isExpanded, setIsExpanded] = useState(false);
    const log = useLog();
    const processMessageTokens = log?.processMessageTokens;

    if (!roomName) return null;

    const { getLightingIcon, getWeatherIcon, lighting, weather } = env;
    const isMobilePortrait = viewport.isMobile && !viewport.isLandscape;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const inlineRoomName = (e.target as HTMLElement).closest('.room-name-inline') as HTMLElement | null;
        if (inlineRoomName) {
            const entityId = inlineRoomName.getAttribute('data-id') || `room:${roomName.toLowerCase()}`;
            if (popoverState?.entityId === entityId) {
                setPopoverState(null);
                triggerHaptic?.(10);
                return;
            }
            const rect = inlineRoomName.getBoundingClientRect();
            setPopoverState({
                x: rect.right,
                y: rect.top + rect.height / 2,
                setId: 'cat-room',
                category: 'cat-room',
                context: roomName,
                entityId,
                menuDisplay: 'list',
                accentColor: inlineRoomName.style.getPropertyValue('--glow-color').trim() || undefined,
                preferSide: 'right'
            });
            triggerHaptic?.(20);
            return;
        }
        triggerHaptic?.(10);
        setIsExpanded(!isExpanded);
    };

    // --- Logic Section: Tokenization ---
    const nameTokens = processMessageTokens ? processMessageTokens(roomName) : [];
    const currentRoomKey = mapper.currentRoomId || '';
    const roomIdVnum = currentRoomKey.replace(/^m_/, '');
    const mapRoom = mapper.rooms[currentRoomKey] || mapper.rooms[`m_${roomIdVnum}`] || mapper.rooms[roomIdVnum];
    const currentVnum = mapRoom?.gmcpId ? String(mapRoom.gmcpId) : roomIdVnum;
    const preloadedRoom = currentVnum ? mapper.preloadedCoordsRef.current?.[currentVnum] : undefined;
    const displayZone = formatChipText(mapRoom?.zone || preloadedRoom?.[9] || roomZone || '');
    const displayFlags = deriveMapFlags(mapRoom, preloadedRoom).map(formatChipText).filter(Boolean);
    const isNewlyExplored = !!(mapper as any).newlyExploredRoomId && (mapper as any).newlyExploredRoomId === mapper.currentRoomId;

    return (
        <div className={`mapper-room-info-container terrain-${String(currentTerrain || 'field').toLowerCase()} ${isExpanded ? 'expanded' : ''}`}>
            <div className="mri-content" onClick={handleToggle}>
                {displayZone && (
                    <div className="mri-corner-chip mri-zone-chip" title={displayZone}>
                        {displayZone}
                    </div>
                )}
                {displayFlags.length > 0 && (
                    <div key={isNewlyExplored ? 'new' : 'stable'} className={`mri-corner-flags${isNewlyExplored ? ' first-explored' : ''}`} aria-label="Room flags">
                        {displayFlags.slice(0, 3).map(flag => (
                            <span className="mri-corner-chip mri-flag-chip" key={flag} title={flag}>
                                {flag}
                            </span>
                        ))}
                        {displayFlags.length > 3 && (
                            <span className="mri-corner-chip mri-flag-chip" title={displayFlags.slice(3).join(', ')}>
                                +{displayFlags.length - 3}
                            </span>
                        )}
                    </div>
                )}
                <div className="mri-name">
                    {nameTokens.length > 0 ? (
                        <TokenRenderer
                            tokens={nameTokens}
                            metadata={{
                                id: `room:${roomName.toLowerCase()}`,
                                context: roomName,
                                category: 'cat-room',
                                cmd: 'cat-room',
                                action: 'menu'
                            }}
                        />
                    ) : (
                        <span className="fallback-room-name">{roomName}</span>
                    )}
                </div>
                {roomDesc && (
                    <div key={currentRoomKey} className="mri-desc">
                        {roomDesc.replace(/\x1b\[[0-9;]*m/g, '').split(' ').map((word, i) => (
                            <span key={i} className="mri-desc-word" style={{ animationDelay: `${i * 80}ms` }}>
                                {word}{' '}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
