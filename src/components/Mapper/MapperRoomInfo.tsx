/**
 * @file MapperRoomInfo.tsx
 * @description Renders current room name, description, ornamental chrome, room
 * flags, and an inline action strip (mirroring the room-name popover actions)
 * as an overlay on the map / atop the desktop log.
 */

import React, { useMemo, useState } from 'react';
import { Flag } from 'lucide-react';
import { useGame, useLog, useUI, useVitals, useBaseGame } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { TokenRenderer } from '../Messages/TokenRenderer';
import { isButtonValidForEntity } from '../../utils/actionUtils';
import { getRoomTerrainGlowColor } from '../../utils/roomTerrainVisuals';
import './MapperRoomInfo.css';
import './MapperRoomMeta.css';

const ROOM_CATEGORY_ID = 'cat-room';

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

interface MapperRoomInfoProps {
    /** Layout hint from the host; currently always "details". Kept for the call site. */
    section?: string;
}

export const MapperRoomInfo: React.FC<MapperRoomInfoProps> = () => {
    const { roomName, roomDesc, roomZone, currentTerrain, triggerHaptic, viewport, btn, entities, roomNpcs, executeCommand } = useGame();
    const { inlineCategories } = useBaseGame();
    const { characterInfo } = useVitals();
    const { setPopoverState, popoverState } = useUI();
    const mapper = useMapper();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFlagsOpen, setIsFlagsOpen] = useState(false);
    const log = useLog();
    const processMessageTokens = log?.processMessageTokens;

    // --- Logic Section: Tokenization & map lookups (hooks must run before any early return) ---
    const nameTokens = processMessageTokens && roomName ? processMessageTokens(roomName) : [];
    const currentRoomKey = mapper.currentRoomId || '';
    const roomIdVnum = currentRoomKey.replace(/^m_/, '');
    const mapRoom = mapper.rooms[currentRoomKey] || mapper.rooms[`m_${roomIdVnum}`] || mapper.rooms[roomIdVnum];
    const currentVnum = mapRoom?.gmcpId ? String(mapRoom.gmcpId) : roomIdVnum;
    const preloadedRoom = currentVnum ? mapper.preloadedCoordsRef.current?.[currentVnum] : undefined;
    const displayZone = formatChipText(mapRoom?.zone || preloadedRoom?.[9] || roomZone || '');
    const displayFlags = useMemo(
        () => deriveMapFlags(mapRoom, preloadedRoom).map(formatChipText).filter(Boolean),
        [mapRoom, preloadedRoom]
    );
    const isNewlyExplored = !!(mapper as any).newlyExploredRoomId && (mapper as any).newlyExploredRoomId === mapper.currentRoomId;

    const roomEntityId = roomName ? `room:${roomName.toLowerCase()}` : '';

    // Same button set as the cat-room popover opened by tapping the room name.
    const actionButtons = useMemo(() => {
        const buttons = btn?.buttons || [];
        if (!roomName || buttons.length === 0) return [];
        const filterDeps = { buttons, inlineCategories: inlineCategories || [], roomNpcs, entities, characterInfo };
        const seen = new Set<string>();
        return buttons.filter(b => {
            if (seen.has(b.command)) return false;
            if (!isButtonValidForEntity(b, roomEntityId, ROOM_CATEGORY_ID, filterDeps, ROOM_CATEGORY_ID, roomName)) return false;
            seen.add(b.command);
            return true;
        });
    }, [btn?.buttons, inlineCategories, roomNpcs, entities, characterInfo, roomEntityId, roomName]);

    if (!roomName) return null;

    const isMobilePortrait = viewport.isMobile && !viewport.isLandscape;

    const openRoomMenu = (inlineRoomName: HTMLElement) => {
        const entityId = inlineRoomName.getAttribute('data-id') || roomEntityId;
        if (popoverState?.entityId === entityId) {
            setPopoverState(null);
            triggerHaptic?.(10);
            return;
        }
        const rect = inlineRoomName.getBoundingClientRect();
        setPopoverState({
            x: rect.left + rect.width / 2,
            y: rect.bottom,
            sourceHeight: rect.height,
            sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            setId: ROOM_CATEGORY_ID,
            category: ROOM_CATEGORY_ID,
            context: roomName,
            entityId,
            menuDisplay: 'list',
            accentColor: inlineRoomName.style.getPropertyValue('--glow-color').trim() || undefined,
            preferSide: 'top'
        });
        triggerHaptic?.(20);
    };

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        const inlineRoomName = (e.target as HTMLElement).closest('.room-name-inline') as HTMLElement | null;
        if (inlineRoomName) {
            openRoomMenu(inlineRoomName);
            return;
        }
        triggerHaptic?.(10);
        setIsExpanded(!isExpanded);
    };

    const fireAction = (e: React.MouseEvent, command: string) => {
        e.stopPropagation();
        triggerHaptic?.(20);
        executeCommand(command, false, false, false, false, { shouldFocus: false, fromUi: true });
    };

    const toggleFlags = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic?.(10);
        setIsFlagsOpen(prev => !prev);
    };

    return (
        <div
            className={`mapper-room-info-container terrain-${String(currentTerrain || 'field').toLowerCase()} ${isExpanded ? 'expanded' : ''}`}
            style={{ '--terrain-glow-color': getRoomTerrainGlowColor(currentTerrain) } as React.CSSProperties}
        >
            <div className="mri-content" onClick={handleToggle}>
                {/* Ornamental divider — the "flourish" at the top of the card. */}
                <div className="mri-ornament-divider" aria-hidden="true">
                    <span className="mri-ornament-line" />
                    <svg className="mri-ornament-glyph" width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 0 L6.6 3.4 L10 5 L6.6 6.6 L5 10 L3.4 6.6 L0 5 L3.4 3.4 Z" fill="currentColor" />
                    </svg>
                    <span className="mri-ornament-line" />
                </div>

                <div className={`mri-current-room-block${isNewlyExplored ? ' first-explored' : ''}`}>
                    <span className="mri-room-corner tl" aria-hidden="true" />
                    <span className="mri-room-corner tr" aria-hidden="true" />
                    <span className="mri-room-corner bl" aria-hidden="true" />
                    <span className="mri-room-corner br" aria-hidden="true" />

                    {displayFlags.length > 0 && (
                        <button
                            type="button"
                            className={`mri-room-flag-indicator${isFlagsOpen ? ' is-open' : ''}`}
                            aria-label={`Room flags: ${displayFlags.join(', ')}`}
                            title={displayFlags.join(', ')}
                            onClick={toggleFlags}
                        >
                            <Flag size={11} strokeWidth={2.4} />
                            <span>{displayFlags.length}</span>
                        </button>
                    )}
                    {isFlagsOpen && displayFlags.length > 0 && (
                        <div className="mri-room-flag-popover" onClick={e => e.stopPropagation()}>
                            <div className="mri-room-flag-popover-title">
                                <Flag size={11} strokeWidth={2.4} />
                                <span>{displayZone || 'Room flags'}</span>
                            </div>
                            <div className="mri-room-flag-popover-list">
                                {displayFlags.map(flag => (
                                    <span className="mri-room-flag-popover-chip" key={flag}>{flag}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mri-room-main-grid">
                        <div className="mri-room-text-column">
                            <div className="mri-name">
                                {nameTokens.length > 0 ? (
                                    <TokenRenderer
                                        tokens={nameTokens}
                                        metadata={{
                                            id: roomEntityId,
                                            context: roomName,
                                            category: ROOM_CATEGORY_ID,
                                            cmd: ROOM_CATEGORY_ID,
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
                </div>

                {/* Inline action strip — same actions as tapping the room name. */}
                {!isMobilePortrait && actionButtons.length > 0 && (
                    <div className="mri-room-action-strip" onClick={e => e.stopPropagation()}>
                        {actionButtons.map(button => (
                            <button
                                key={button.id}
                                type="button"
                                className="mri-room-action-button"
                                style={{ '--room-action-color': button.color } as React.CSSProperties}
                                onClick={e => fireAction(e, button.command)}
                                title={button.command}
                            >
                                {button.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
