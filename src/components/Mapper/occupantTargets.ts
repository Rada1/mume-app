/**
 * @file occupantTargets.ts
 * @description Shared map occupant layout and hit-test targets.
 */

import { GRID_SIZE } from './mapperUtils';
import { classifyOccupant } from '../../services/classification/classifyOccupant';
import { getCategoryIdForKindLocation, toCategoryId } from '../../utils/inlineActionModel';
import { getMemberColor } from '../../utils/groupUtils';
import { getOccupantCommandTarget } from './mapperOccupantTargetUtils';
import type { GmcpOccupant, GroupMember, InlineCategoryConfig } from '../../types';

type OccupantSource = GmcpOccupant | string;
type OccupantKind = 'player' | 'npc' | 'self' | 'enemy' | 'neutral';

const OUTER_RING_RADIUS = GRID_SIZE * 0.34; // 17px  — ~3.5px gap to tile edge
const INNER_RING_RADIUS = GRID_SIZE * 0.13; // 6.5px — ~1.5px gap to outer ring at same angle
const DOT_RADIUS        = GRID_SIZE * 0.09; // 4.5px — unchanged

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
        if (classified?.category) return toCategoryId(classified.category) || classified.category;
        if (occupant.category) return toCategoryId(occupant.category) || occupant.category;
    }

    if (kind === 'npc') return getCategoryIdForKindLocation('npc', 'room');
    if (kind === 'enemy') return getCategoryIdForKindLocation('enemy', 'room');
    if (kind === 'neutral') return getCategoryIdForKindLocation('neutral', 'room');
    return getCategoryIdForKindLocation('player', 'room');
};

const nameMatches = (occupantName: string, memberName: string) => (
    memberName === occupantName ||
    occupantName.startsWith(memberName + ' ') ||
    occupantName.endsWith(' ' + memberName)
);

interface OccupantRef { id?: string | number; name?: string }

/**
 * Resolve which occupant (by id) belongs to which group member. Each member
 * claims at most one occupant: mapid match wins; otherwise the lowest-id
 * same-named occupant (matches MUME's `1.thing` ordering). Siblings sharing
 * a name with the grouped one stay ungrouped.
 */
const resolveGroupAssignments = (
    occupants: OccupantRef[],
    groupMembers?: GroupMember[]
): Map<string, number> => {
    const assignment = new Map<string, number>();
    if (!groupMembers || groupMembers.length === 0) return assignment;

    const claimed = new Set<string>();
    const keyOf = (o: OccupantRef) => o.id != null ? `id:${o.id}` : `name:${o.name?.toLowerCase()}`;

    // Pass 1: exact mapid match.
    groupMembers.forEach((m, idx) => {
        if (m.mapid == null) return;
        const mapStr = String(m.mapid);
        const occ = occupants.find(o => o.id != null && String(o.id) === mapStr);
        if (occ) {
            const k = keyOf(occ);
            if (!claimed.has(k)) {
                assignment.set(k, idx);
                claimed.add(k);
            }
        }
    });

    // Pass 2: name fallback. Claim the lowest-id unclaimed occupant whose name
    // matches. Applies to every group member that didn't already claim via mapid.
    const memberClaimed = new Set<number>(assignment.values());
    groupMembers.forEach((m, idx) => {
        if (memberClaimed.has(idx)) return;
        const memberName = m.name?.toLowerCase();
        if (!memberName) return;
        const candidates = occupants
            .filter(o => {
                const oName = o.name?.toLowerCase();
                return !!oName && nameMatches(oName, memberName) && !claimed.has(keyOf(o));
            })
            .sort((a, b) => {
                const an = Number(a.id);
                const bn = Number(b.id);
                if (!isNaN(an) && !isNaN(bn)) return an - bn;
                return 0;
            });
        if (candidates.length > 0) {
            const k = keyOf(candidates[0]);
            assignment.set(k, idx);
            claimed.add(k);
        }
    });

    return assignment;
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
    if (displayKind !== 'player') return;

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

    const allOccupantRefs: OccupantRef[] = [...players, ...enemies, ...neutrals, ...npcs].map(o => ({
        id: typeof o === 'string' ? undefined : o.id,
        name: getOccupantName(o)
    }));
    const groupAssignment = resolveGroupAssignments(allOccupantRefs, options.groupMembers);

    const lookupGroup = (occupant: OccupantSource): number => {
        const id = typeof occupant === 'string' ? undefined : occupant.id;
        const name = getOccupantName(occupant);
        const key = id != null ? `id:${id}` : `name:${name?.toLowerCase()}`;
        const idx = groupAssignment.get(key);
        return idx != null ? idx : -1;
    };

    players.forEach(player => {
        const name = getOccupantName(player);
        if (!name) return;
        const groupIndex = lookupGroup(player);
        const isGrouped = groupIndex !== -1;
        addOccupantTarget(
            isGrouped ? groupOccupants : otherOccupants,
            player,
            options.playerColor,
            isGrouped ? 'inner' : 'outer',
            options
        );
    });

    enemies.forEach(enemy => {
        const name = getOccupantName(enemy);
        if (!name) return;
        const groupIndex = lookupGroup(enemy);
        const isGrouped = groupIndex !== -1;
        addOccupantTarget(
            isGrouped ? groupOccupants : otherOccupants,
            enemy,
            options.enemyColor || '#ef4444',
            isGrouped ? 'inner' : 'outer',
            options
        );
    });

    neutrals.forEach(neutral => {
        const name = getOccupantName(neutral);
        if (!name) return;
        const groupIndex = lookupGroup(neutral);
        const isGrouped = groupIndex !== -1;
        addOccupantTarget(
            isGrouped ? groupOccupants : otherOccupants,
            neutral,
            options.neutralColor || '#eab308',
            isGrouped ? 'inner' : 'outer',
            options
        );
    });

    npcs.forEach(npc => {
        const name = getOccupantName(npc);
        if (!name) return;
        const groupIndex = lookupGroup(npc);
        const isGrouped = groupIndex !== -1;
        addOccupantTarget(
            isGrouped ? groupOccupants : otherOccupants,
            npc,
            options.npcColor,
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
            const cx = Math.cos(angle);
            const cy = Math.sin(angle);
            const maxComp = Math.max(Math.abs(cx), Math.abs(cy)) || 1;
            target.x = px + (cx / maxComp) * orbitRadius;
            target.y = py + (cy / maxComp) * orbitRadius;
            target.radius = DOT_RADIUS;
        });
    };

    placeRing(otherOccupants, OUTER_RING_RADIUS);
    placeRing(groupOccupants, INNER_RING_RADIUS);

    return [...otherOccupants, ...groupOccupants];
};
