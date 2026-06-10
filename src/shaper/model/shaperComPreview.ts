/**
 * @file shaperComPreview.ts
 * @description Builds /com command previews from Shaper room reset content.
 */

import type { ShaperItemRef, ShaperMobPlacement, ShaperRoomDraft } from './shaperTypes';

export interface ShaperComPreviewNode {
    id: string;
    depth: number;
    label: string;
    command: string;
}

const DEFAULT_LIMIT = '0';

// --- Formatting Section ---
const entityLabel = (vnum: string, name: string): string =>
    `${vnum || '?'}${name ? ` (${name})` : ''}`;

const objectCommand = (object: ShaperItemRef): string =>
    `/com add object ${object.vnum || '<obj>'} ${DEFAULT_LIMIT}`;

const giveCommand = (object: ShaperItemRef): string =>
    `/com add + give ${object.vnum || '<obj>'} ${DEFAULT_LIMIT} parent`;

// --- Preview Section ---
export const buildShaperComPreview = (room: ShaperRoomDraft): ShaperComPreviewNode[] => {
    const nodes: ShaperComPreviewNode[] = [];

    room.mobs.forEach((mob: ShaperMobPlacement) => {
        nodes.push({
            id: `mob-${mob.id}`,
            depth: 0,
            label: `Mobile ${entityLabel(mob.vnum, mob.name)}`,
            command: `/com add mobile ${mob.vnum || '<mob>'} ${DEFAULT_LIMIT}`
        });
        mob.items.forEach(item => nodes.push({
            id: `mob-${mob.id}-item-${item.id}`,
            depth: 1,
            label: `Give ${entityLabel(item.vnum, item.name)} to parent mobile`,
            command: giveCommand(item)
        }));
    });

    room.objects.forEach(object => nodes.push({
        id: `object-${object.id}`,
        depth: 0,
        label: `Object ${entityLabel(object.vnum, object.name)}`,
        command: objectCommand(object)
    }));

    return nodes;
};

