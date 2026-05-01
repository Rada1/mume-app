/**
 * @file occupantTargets.ts
 * @description Shared map occupant layout and hit-test targets.
 */

import { GRID_SIZE } from './mapperUtils';
import { classifyOccupant } from '../../services/classification/classifyOccupant';
import { getCategoryForName } from '../../utils/categorizationUtils';
import { getMemberColor } from '../../utils/groupUtils';
import { getOccupantCommandTarget } from './mapperOccupantTargetUtils';
import type { GmcpOccupant, GroupMember, InlineCategoryConfig } from '../../types';

type OccupantSource = GmcpOccupant | string;
type OccupantKind = 'player' | 'npc' | 'self' | 'enemy' | 'neutral';

const OUTER_RING_RADIUS = GRID_SIZE * 0.30; // 15 world units — scales with zoom
const INNER_RING_RADIUS = GRID_SIZE * 0.15; // 7.5 world units
const DOT_RADIUS        = GRID_SIZE * 0.09; // 4.5 world units

export interface RoomAnchor {
    x: number;
    y: number;
    z: number;
}

export interface MapOccupantTarget {
    x: number;
    y: number;
    radius: number;
    name: string;
    commandTarget?: string;
    id?: string | number;
    fighting?: string | number | null;
    kind: Exclude<OccupantKind, 'self'>;
    category: string;
    color: string;
    ring: 'inner' | 'outer';
}

export interface MapOccupantTargetOptions {
    anchor: RoomAnchor;
    cameraZoom: number;
    roomChars?: Record<number, GmcpOccupant>;
    roomPlayers?: OccupantSource[];
    roomNpcs?: OccupantSource[];
    groupMembers?: GroupMember[];
    characterName?: string | null;
    inlineCategories?: InlineCategoryConfig[];
    playerColor: string;
    npcColor: string;
    enemyColor?: string;
    neutralColor?: string;
}

export const getOccupantName = (occupant: OccupantSource): string | undefined => (
    typeof occupant === 'string'
        ? occupant
        : occupant.name || occupant.short || occupant.shortdesc || occupant.keyword || occupant.desc
);

export const getOccupantDisplayKind = (
    occupant: OccupantSource,
    characterName: string | null
): OccupantKind => {
    if (typeof occupant === 'string') return 'npc';

    const name = getOccupantName(occupant);
    if (characterName && name?.toLowerCase() === characterName.toLowerCase()) return 'self';

    const type = typeof occupant.type === 'string' ? occupant.type.toLowerCase() : '';
    if (type === 'you' || type === 'self') return 'self';
    if (type === 'enemy') return 'enemy';
    if (occupant.pc === true || occupant.pc === 1) return 'player';
    if (type === 'neutral') return 'neutral';
    if (['ally', 'player', 'pc'].includes(type)) return 'player';
    if (occupant.pc === false || occupant.pc === 0) return 'npc';
    if (['npc', 'mob', 'mobile', 'enemy', 'shopkeeper', 'dealer', 'merchant', 'innkeeper', 'mount', 'guildmaster', 'trainer', 'guard'].includes(type)) return 'npc';

    return classifyOccupant(occupant)?.kind || 'npc';
};

const getOccupantCategory = (
    occupant: OccupantSource,
    kind: Exclude<OccupantKind, 'self'>,
    name: string,
    inlineCategories?: InlineCategoryConfig[]
): string => {
    if (typeof occupant !== 'string') {
        const classified = classifyOccupant(occupant);
        if (classified?.category) return classified.category;
        if (occupant.category) return occupant.category;
    }

    if (kind === 'npc') return getCategoryForName(name, inlineCategories) || 'inline-npc';
    return 'inline-ally';
};

const getGroupIndex = (name: string, groupMembers?: GroupMember[], occupantId?: string | number) => {
    if (!groupMembers) return -1;
    // Prefer mapid match: GroupMember.mapid is the NPC's room instance ID,
    // which equals the room occupant's numeric id from Room.Chars.
    if (occupantId != null) {
        const idStr = String(occupantId);
        const byMapId = groupMembers.findIndex(m => m.mapid != null && String(m.mapid) === idStr);
        if (byMapId !== -1) return byMapId;
    }
    // Name fallback for players and NPCs without unique room IDs
    if (!name) return -1;
    const lower = name.toLowerCase();
    return groupMembers.findIndex(member => {
        const memberName = member.name?.toLowerCase();
        return !!memberName && (
            memberName === lower ||
            lower.startsWith(memberName + ' ') ||
            lower.endsWith(' ' + memberName)
        );
    });
};

const addOccupantTarget = (
    target: MapOccupantTarget[],
    source: OccupantSource,
    color: string,
    ring: 'inner' | 'outer',
    options: MapOccupantTargetOptions
) => {
    const name = getOccupantName(source);
    if (!name) return;

    const displayKind = getOccupantDisplayKind(source, options.characterName || null);
    if (displayKind === 'self') return;

    target.push({
        x: 0,
        y: 0,
        radius: 0,
        name,
        commandTarget: typeof source === 'string' ? undefined : getOccupantCommandTarget(source, Object.values(options.roomChars || {}), name),
        id: typeof source === 'string' ? undefined : source.id,
        fighting: typeof source === 'string' ? undefined : (source as GmcpOccupant).fighting,
        kind: displayKind,
        category: getOccupantCategory(source, displayKind, name, options.inlineCategories),
        color,
        ring
    });
};

export const getMapOccupantTargets = (options: MapOccupantTargetOptions): MapOccupantTarget[] => {
    const groupOccupants: MapOccupantTarget[] = [];
    const otherOccupants: MapOccupantTarget[] = [];
    const charList = Object.values(options.roomChars || {});

    const players = charList.length > 0
        ? charList.filter(char => getOccupantDisplayKind(char, options.characterName || null) === 'player')
        : (options.roomPlayers || []);
    const enemies = charList.filter(char => getOccupantDisplayKind(char, options.characterName || null) === 'enemy');
    const neutrals = charList.filter(char => getOccupantDisplayKind(char, options.characterName || null) === 'neutral');
    const npcs = charList.length > 0
        ? charList.filter(char => getOccupantDisplayKind(char, options.characterName || null) === 'npc')
        : (options.roomNpcs || []);

    players.forEach(player => {
        const name = getOccupantName(player);
        if (!name) return;
        const id = typeof player === 'string' ? undefined : player.id;
        const groupIndex = getGroupIndex(name, options.groupMembers, id);
        const isGrouped = groupIndex !== -1;
        addOccupantTarget(
            isGrouped ? groupOccupants : otherOccupants,
            player,
            isGrouped ? getMemberColor(groupIndex).core : options.playerColor,
            isGrouped ? 'inner' : 'outer',
            options
        );
    });

    enemies.forEach(enemy => {
        const name = getOccupantName(enemy);
        if (!name) return;
        const id = typeof enemy === 'string' ? undefined : enemy.id;
        const groupIndex = getGroupIndex(name, options.groupMembers, id);
        const isGrouped = groupIndex !== -1;
        addOccupantTarget(
            isGrouped ? groupOccupants : otherOccupants,
            enemy,
            isGrouped ? getMemberColor(groupIndex).core : (options.enemyColor || '#ef4444'),
            isGrouped ? 'inner' : 'outer',
            options
        );
    });

    neutrals.forEach(neutral => {
        const name = getOccupantName(neutral);
        if (!name) return;
        const id = typeof neutral === 'string' ? undefined : neutral.id;
        const groupIndex = getGroupIndex(name, options.groupMembers, id);
        const isGrouped = groupIndex !== -1;
        addOccupantTarget(
            isGrouped ? groupOccupants : otherOccupants,
            neutral,
            isGrouped ? getMemberColor(groupIndex).core : (options.neutralColor || '#eab308'),
            isGrouped ? 'inner' : 'outer',
            options
        );
    });

    npcs.forEach(npc => {
        const name = getOccupantName(npc);
        if (!name) return;
        const id = typeof npc === 'string' ? undefined : npc.id;
        const groupIndex = getGroupIndex(name, options.groupMembers, id);
        const isGrouped = groupIndex !== -1;
        addOccupantTarget(
            isGrouped ? groupOccupants : otherOccupants,
            npc,
            isGrouped ? getMemberColor(groupIndex).core : options.npcColor,
            isGrouped ? 'inner' : 'outer',
            options
        );
    });

    const px = options.anchor.x * GRID_SIZE + GRID_SIZE / 2;
    const py = options.anchor.y * GRID_SIZE + GRID_SIZE / 2;

    const placeRing = (targets: MapOccupantTarget[], orbitRadius: number) => {
        const count = targets.length;
        targets.forEach((target, index) => {
            const angle = (index / count) * Math.PI * 2;
            target.x = px + Math.cos(angle) * orbitRadius;
            target.y = py + Math.sin(angle) * orbitRadius;
            target.radius = DOT_RADIUS;
        });
    };

    placeRing(otherOccupants, OUTER_RING_RADIUS);
    placeRing(groupOccupants, INNER_RING_RADIUS);

    return [...otherOccupants, ...groupOccupants];
};
