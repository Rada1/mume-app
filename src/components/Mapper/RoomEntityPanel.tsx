import React, { useMemo } from 'react';
import type { GmcpOccupant, GroupMember } from '../../types';
import { getOccupantDisplayKind, getOccupantName } from './occupantTargets';
import { getMemberColor } from '../../utils/groupUtils';
import { getCategoryIdForKindLocation } from '../../utils/inlineActionModel';

interface Props {
    roomChars?: Record<number, GmcpOccupant>;
    roomNpcs?: GmcpOccupant[];
    roomPlayers?: GmcpOccupant[];
    groupMembers?: GroupMember[];
    characterName?: string | null;
    setPopoverState: (val: any) => void;
    popoverState?: any;
    enemyColor: string;
    npcColor: string;
    neutralColor: string;
    playerColor: string;
}

type Kind = 'enemy' | 'neutral' | 'npc' | 'player';

const KIND_ORDER: Record<Kind, number> = { enemy: 0, neutral: 1, npc: 2, player: 3 };

const RoomEntityPanel: React.FC<Props> = ({
    roomChars, roomNpcs, roomPlayers, groupMembers, characterName,
    setPopoverState, popoverState, enemyColor, npcColor, neutralColor, playerColor,
}) => {
    const entities = useMemo(() => {
        const charList = Object.values(roomChars || {});
        const sources: GmcpOccupant[] = charList.length > 0
            ? charList
            : [...(roomPlayers || []), ...(roomNpcs || [])];

        const result: {
            entityId: string;
            id?: number | string;
            name: string;
            keyword: string;
            kind: Kind;
            color: string;
            category: string;
        }[] = [];
        const seenNames = new Set<string>();

        for (const char of sources) {
            const kind = getOccupantDisplayKind(char, characterName || null);
            if (kind === 'self') continue;

            const name = getOccupantName(char);
            if (!name) continue;

            const id = typeof char !== 'string' ? char.id : undefined;
            const keyword = (typeof char !== 'string' && char.keyword) || name;
            seenNames.add(name.toLowerCase());

            const color =
                kind === 'enemy' ? enemyColor :
                kind === 'neutral' ? neutralColor :
                kind === 'player' ? playerColor :
                npcColor;

            const category = getCategoryIdForKindLocation(kind, 'room');
            const entityId = id != null
                ? `roomchars:${id}`
                : `map-${kind}:${name.toLowerCase()}`;

            result.push({ entityId, id, name, keyword, kind: kind as Kind, color, category });
        }

        groupMembers?.forEach((member, index) => {
            const name = member.name || member.label;
            if (!name || seenNames.has(name.toLowerCase())) return;
            const color = getMemberColor(index).core;
            const category = getCategoryIdForKindLocation('player', 'room');
            result.push({ entityId: `map-player:${name.toLowerCase()}`, name, keyword: name, kind: 'player', color, category });
        });

        result.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
        return result;
    }, [roomChars, roomNpcs, roomPlayers, groupMembers, characterName, enemyColor, npcColor, neutralColor, playerColor]);

    if (entities.length === 0) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 8,
            zIndex: 500,
            background: 'rgba(15, 15, 15, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 6,
            padding: '4px 4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxHeight: '60%',
            overflowY: 'auto',
            pointerEvents: 'auto',
            touchAction: 'pan-y',
        }}>
            {entities.map((entity, i) => (
                <span
                    key={entity.entityId ?? i}
                    className={`inline-btn${popoverState?.entityId === entity.entityId ? ' menu-active' : ''}`}
                    style={{
                        '--glow-color': entity.color,
                        display: 'block',
                        fontFamily: 'var(--font-mono, var(--font-main))',
                        fontSize: 'var(--dynamic-log-size, 16px)',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        padding: '2px 6px',
                    } as React.CSSProperties}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (popoverState?.entityId === entity.entityId) {
                            setPopoverState(null);
                            return;
                        }
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setPopoverState({
                            x: rect.right,
                            y: rect.top + rect.height / 2,
                            setId: entity.category,
                            kind: entity.kind,
                            location: 'room',
                            category: entity.category,
                            context: entity.keyword,
                            entityId: entity.entityId,
                            menuDisplay: 'list',
                            accentColor: entity.color,
                            preferSide: 'right',
                        });
                    }}
                >
                    {entity.name}
                </span>
            ))}
        </div>
    );
};

export default RoomEntityPanel;
