/**
 * @file RoomChipRows.tsx
 * @description Displays room character and object keyword chips under the mapper room card.
 */

import React, { useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { useUIStore } from '../../stores/useUIStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import type { GmcpOccupant } from '../../types';
import { normalizeOccupantType } from '../../services/classification/normalizeOccupantType';
import { getCategoryIdForKindLocation, toCategoryId } from '../../utils/inlineActionModel';
import { getOccupantCommandKeyword } from '../../utils/occupantKeywordUtils';
import './RoomChipRows.css';

type CharacterKind = 'enemy' | 'npc' | 'ally' | 'neutral';
type ChipKind = CharacterKind | 'object';

interface RoomChip {
    entityId: string;
    label: string;
    context: string;
    category: string;
    kind: ChipKind;
}

type OccupantSource = GmcpOccupant | string;

const CHARACTER_ORDER: Record<CharacterKind, number> = {
    enemy: 0,
    npc: 1,
    ally: 2,
    neutral: 3
};

const getName = (source: OccupantSource): string => (
    typeof source === 'string'
        ? source
        : source.name || source.short || source.shortdesc || source.keyword || source.desc || ''
).trim();

const isSelf = (source: OccupantSource, characterName: string | null | undefined): boolean => {
    if (typeof source === 'string') return false;
    const type = normalizeOccupantType(source)?.toLowerCase();
    const name = getName(source);
    return type === 'you' || type === 'self' || (
        !!characterName && name.toLowerCase() === characterName.toLowerCase()
    );
};

const getCharacterKind = (source: OccupantSource): CharacterKind => {
    if (typeof source === 'string') return 'npc';
    const type = normalizeOccupantType(source)?.toLowerCase();
    if (type === 'enemy') return 'enemy';
    if (type === 'neutral') return 'neutral';
    if (type === 'npc' || type === 'mob' || type === 'mobile' || type === 'mount') return 'npc';
    return 'ally';
};

const getKeyword = (source: OccupantSource, fallback: string): string => {
    if (typeof source === 'string') return getOccupantCommandKeyword({ name: source }, fallback);
    return source.keyword || getOccupantCommandKeyword(source, fallback);
};

const getSourceId = (source: OccupantSource): string | number | undefined => (
    typeof source === 'string' ? undefined : source.id
);

const getCharacterEntityId = (source: OccupantSource, keyword: string): string => {
    const id = getSourceId(source);
    return id != null ? `roomchars:${id}` : `roomchars:${keyword}`;
};

const getItemEntityId = (source: GmcpOccupant, keyword: string): string => {
    const id = source.id;
    if (typeof id === 'string' && id.startsWith('roomitems:')) return id;
    return id != null ? `roomitems:${id}` : `roomitems:${keyword}`;
};

type ChipColorVars = React.CSSProperties & Record<
    '--enemy-color' | '--npc-color' | '--player-color' | '--neutral-color' | '--object-color',
    string
>;

const withDuplicateOrdinals = (chips: RoomChip[]): RoomChip[] => {
    const totals = chips.reduce<Record<string, number>>((acc, chip) => {
        acc[chip.label] = (acc[chip.label] || 0) + 1;
        return acc;
    }, {});
    const idTotals = chips.reduce<Record<string, number>>((acc, chip) => {
        acc[chip.entityId] = (acc[chip.entityId] || 0) + 1;
        return acc;
    }, {});
    const seen: Record<string, number> = {};
    const seenIds: Record<string, number> = {};

    return chips.map(chip => {
        const labelIndex = (seen[chip.label] || 0) + 1;
        const idIndex = (seenIds[chip.entityId] || 0) + 1;
        seen[chip.label] = labelIndex;
        seenIds[chip.entityId] = idIndex;

        return {
            ...chip,
            entityId: idTotals[chip.entityId] > 1 ? `${chip.entityId}#${idIndex}` : chip.entityId,
            label: totals[chip.label] > 1 ? `${labelIndex}.${chip.label}` : chip.label
        };
    });
};

export const RoomChipRows: React.FC = () => {
    const {
        characterName, roomChars, roomPlayers, roomNpcs, roomItems,
        triggerHaptic
    } = useGame();
    const selectedTarget = useUIStore(s => s.selectedTarget);
    const toggleObjectSelection = useUIStore(s => s.toggleObjectSelection);
    const colorVars: ChipColorVars = {
        '--enemy-color': useSettingsStore(s => s.enemyColor),
        '--npc-color': useSettingsStore(s => s.npcColor),
        '--player-color': useSettingsStore(s => s.playerColor),
        '--neutral-color': useSettingsStore(s => s.neutralColor),
        '--object-color': useSettingsStore(s => s.objectColor)
    };

    const characterChips = useMemo(() => {
        const charList = Object.values(roomChars || {});
        const sources: OccupantSource[] = charList.length > 0
            ? charList
            : [...roomPlayers, ...roomNpcs];

        const chips = sources
            .filter(source => !isSelf(source, characterName))
            .map<RoomChip | null>(source => {
                const name = getName(source);
                if (!name) return null;
                const kind = getCharacterKind(source);
                const keyword = getKeyword(source, name);
                const category = typeof source === 'string'
                    ? getCategoryIdForKindLocation(kind, 'room')
                    : toCategoryId(source.category) || getCategoryIdForKindLocation(kind, 'room');

                return {
                    entityId: getCharacterEntityId(source, keyword),
                    label: keyword,
                    context: keyword,
                    category,
                    kind
                };
            })
            .filter((chip): chip is RoomChip => !!chip)
            .sort((a, b) => CHARACTER_ORDER[a.kind as CharacterKind] - CHARACTER_ORDER[b.kind as CharacterKind]);

        return withDuplicateOrdinals(chips);
    }, [characterName, roomChars, roomNpcs, roomPlayers]);

    const itemChips = useMemo(() => {
        const chips = roomItems
            .map<RoomChip | null>(item => {
                const name = getName(item);
                if (!name) return null;
                const keyword = getKeyword(item, name);
                const category = toCategoryId(item.category) || getCategoryIdForKindLocation('object', 'room');

                return {
                    entityId: getItemEntityId(item, keyword),
                    label: keyword,
                    context: keyword,
                    category,
                    kind: 'object'
                };
            })
            .filter((chip): chip is RoomChip => !!chip);

        return withDuplicateOrdinals(chips);
    }, [roomItems]);

    const rows = [
        { id: 'characters', label: 'ppl/npcs', chips: characterChips },
        { id: 'items', label: 'items', chips: itemChips }
    ].filter(row => row.chips.length > 0);

    if (rows.length === 0) return null;

    const selectChip = (event: React.MouseEvent<HTMLButtonElement>, chip: RoomChip) => {
        event.stopPropagation();
        triggerHaptic?.(15);
        toggleObjectSelection({
            id: chip.entityId,
            setId: chip.category,
            category: chip.category,
            context: chip.context,
        });
    };

    return (
        <div className="room-chip-rows" style={colorVars} aria-label="Room entities and objects">
            {rows.map(row => (
                <div className="room-chip-row" key={row.id}>
                    <span className="room-chip-row-label">{row.label}</span>
                    <div className="room-chip-list">
                        {row.chips.map(chip => (
                            <button
                                key={chip.entityId}
                                type="button"
                                className={`room-chip room-chip-${chip.kind}${selectedTarget?.id === chip.entityId ? ' is-active' : ''}`}
                                onClick={event => selectChip(event, chip)}
                                title={chip.context}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default React.memo(RoomChipRows);
