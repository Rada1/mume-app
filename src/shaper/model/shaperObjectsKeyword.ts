/**
 * @file shaperObjectsKeyword.ts
 * @description Generates a MUME-style object load report for the zone.
 */

import type { ShaperWorkspaceDoc } from './shaperTypes';
import { useShaperEntityStore } from './useShaperEntityStore';

export const generateShaperObjectsReport = (doc: ShaperWorkspaceDoc): string => {
    // 1. Gather all unique object command nodes
    const nodes = Object.values(doc.commandNodes).filter(
        node => ['object', 'hide', 'put', 'give', 'equip'].includes(node.type)
    );

    const statsCache = useShaperEntityStore.getState().objectStats;

    interface ObjectSummary {
        vnum: string;
        name: string;
        type: string;
        wearFlags: string[];
        firstLoad: number;
        maxLoad: number;
        roomOffsets: Set<string>;
    }

    const summaries: Record<string, ObjectSummary> = {};

    nodes.forEach(node => {
        const vnum = String(node.fields.vnum ?? '').trim();
        if (!vnum) return;

        const cached = statsCache[Number(vnum)];
        const shortDesc = (cached?.name ?? String(node.fields.name ?? '').trim()) || `o${vnum}`;
        const type = cached?.type ?? 'OTHER';
        const wearFlags = cached?.wearFlags ?? [];

        const limitWorld = node.limit?.world;
        const limitZone = node.limit?.zone;
        const limitRoom = node.limit?.room;
        const max = limitWorld ?? limitZone ?? limitRoom ?? 1;

        const chance = node.limit?.chancePercent ?? 100;
        const first = Math.round(max * (chance / 100));

        // Get room offset string
        const room = doc.rooms[node.roomId];
        let offset = '';
        if (room) {
            const parts = room.roomNumber.split(':');
            offset = parts[1] || '';
        }

        if (!summaries[vnum]) {
            summaries[vnum] = {
                vnum,
                name: shortDesc,
                type,
                wearFlags,
                firstLoad: 0,
                maxLoad: 0,
                roomOffsets: new Set<string>()
            };
        }

        summaries[vnum].firstLoad += first;
        summaries[vnum].maxLoad += max;
        if (offset) {
            summaries[vnum].roomOffsets.add(offset);
        }
    });

    const objectList = Object.values(summaries);

    // Classification logic:
    // Herbs/plants: type is HERB or PLANT
    // Food: type is FOOD
    // Key: type is KEY
    // Immobile: doesn't have TAKE flag, or type is CONTAINER/FURNITURE etc.
    // Equipment: has TAKE flag and has wear flags (not OTHER/KEY/FOOD/HERB)
    // Other: fallback
    const categorizer = (obj: ObjectSummary): 'herbs' | 'food' | 'key' | 'immobile' | 'equipment' | 'other' => {
        const t = obj.type.toUpperCase();
        if (t.includes('HERB') || t.includes('PLANT')) return 'herbs';
        if (t.includes('FOOD') || t.includes('POTION') || t.includes('DRINK') || t.includes('LIQUID')) return 'food';
        if (t.includes('KEY')) return 'key';
        
        // Immobile: no 'TAKE' in wear flags (case insensitive)
        const hasTake = obj.wearFlags.some(f => f.toUpperCase() === 'TAKE');
        if (!hasTake || t.includes('FURNITURE') || t.includes('CONTAINER') || t.includes('TRAP')) return 'immobile';

        // Equipment: has wear locations
        const hasWear = obj.wearFlags.some(f => 
            ['FINGER', 'NECK', 'BODY', 'HEAD', 'LEGS', 'FEET', 'HANDS', 'ARMS', 'SHIELD', 'ABOUT', 'WAIST', 'WRIST', 'WIELD', 'HOLD'].includes(f.toUpperCase())
        );
        if (hasWear) return 'equipment';

        return 'other';
    };

    const grouped = {
        herbs: [] as ObjectSummary[],
        food: [] as ObjectSummary[],
        key: [] as ObjectSummary[],
        immobile: [] as ObjectSummary[],
        equipment: [] as ObjectSummary[],
        other: [] as ObjectSummary[]
    };

    objectList.forEach(obj => {
        grouped[categorizer(obj)].push(obj);
    });

    const sumLoad = (list: ObjectSummary[], field: 'firstLoad' | 'maxLoad') =>
        list.reduce((acc, obj) => acc + obj[field], 0);

    const firstTotal = objectList.reduce((acc, o) => acc + o.firstLoad, 0);
    const maxTotal = objectList.reduce((acc, o) => acc + o.maxLoad, 0);

    const today = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/,/g, '');

    const lines: string[] = [];
    lines.push(`Keyword "objects" (lgit: info/zones/${doc.zoneNumber}/objects)`);
    lines.push(`z${doc.zoneNumber}, objects`);
    lines.push(`${today}, Shaper`);
    lines.push(`                                    MIN LOAD        MAX LOAD`);
    lines.push(`    Herbs/plants                    ${String(sumLoad(grouped.herbs, 'firstLoad')).padEnd(16, ' ')}${sumLoad(grouped.herbs, 'maxLoad')}`);
    lines.push(`    Food                            ${String(sumLoad(grouped.food, 'firstLoad')).padEnd(16, ' ')}${sumLoad(grouped.food, 'maxLoad')}`);
    lines.push(`    Immobile                        ${String(sumLoad(grouped.immobile, 'firstLoad')).padEnd(16, ' ')}${sumLoad(grouped.immobile, 'maxLoad')}`);
    lines.push(`    Equipment                       ${String(sumLoad(grouped.equipment, 'firstLoad')).padEnd(16, ' ')}${sumLoad(grouped.equipment, 'maxLoad')}`);
    lines.push(`    Other                           ${String(sumLoad(grouped.other, 'firstLoad')).padEnd(16, ' ')}${sumLoad(grouped.other, 'maxLoad')}`);
    lines.push(`    Key                             ${String(sumLoad(grouped.key, 'firstLoad')).padEnd(16, ' ')}${sumLoad(grouped.key, 'maxLoad')}`);
    lines.push(`                                    ======          ======`);
    lines.push(`    Total                           ${String(firstTotal).padEnd(16, ' ')}${maxTotal}`);
    lines.push(``);

    const formatListSection = (title: string, list: ObjectSummary[]) => {
        lines.push(`${title}:`);
        if (list.length === 0) {
            lines.push(` (None)`);
        } else {
            list.forEach(o => {
                const objStr = `o${o.vnum}`.padEnd(6, ' ') + `${o.name}`.padEnd(35, ' ');
                const loadStr = (o.firstLoad === o.maxLoad ? `${o.firstLoad}` : `${o.firstLoad}-${o.maxLoad}`).padEnd(24, ' ');
                const sortedOffsets = Array.from(o.roomOffsets).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                const offsetStr = sortedOffsets.length > 0 ? `${doc.zoneNumber}:${sortedOffsets.join('/')}` : '';
                lines.push(objStr + loadStr + offsetStr);
            });
        }
        lines.push(``);
    };

    formatListSection('HERBS/PLANTS', grouped.herbs);
    formatListSection('FOOD', grouped.food);
    formatListSection('IMMOBILE', grouped.immobile);
    formatListSection('EQUIPMENT', grouped.equipment);
    formatListSection('KEY', grouped.key);
    formatListSection('OTHER', grouped.other);

    return lines.join('\n');
};
