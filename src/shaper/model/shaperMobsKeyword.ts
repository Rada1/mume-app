/**
 * @file shaperMobsKeyword.ts
 * @description Generates a MUME-style mobile load report for the zone.
 */

import type { ShaperWorkspaceDoc } from './shaperTypes';
import { useShaperEntityStore } from './useShaperEntityStore';

export const generateShaperMobsReport = (doc: ShaperWorkspaceDoc): string => {
    const nodes = Object.values(doc.commandNodes).filter(
        node => node.type === 'mobile' || node.type === 'follow'
    );

    const statsCache = useShaperEntityStore.getState().mobileStats;

    interface MobSummary {
        vnum: string;
        name: string;
        level: number;
        firstLoad: number;
        maxLoad: number;
        areas: Set<string>;
    }

    const summaries: Record<string, MobSummary> = {};

    nodes.forEach(node => {
        const vnum = String(node.fields.vnum ?? '').trim();
        if (!vnum) return;

        const cached = statsCache[Number(vnum)];
        const level = cached?.level ?? 0;
        const shortDesc = (cached?.name ?? String(node.fields.name ?? '').trim()) || `m${vnum}`;

        const limitWorld = node.limit?.world;
        const limitZone = node.limit?.zone;
        const limitRoom = node.limit?.room;
        const max = limitWorld ?? limitZone ?? limitRoom ?? 1;
        
        const chance = node.limit?.chancePercent ?? 100;
        const first = Math.round(max * (chance / 100));

        const room = doc.rooms[node.roomId];
        const areaName = room ? (room.name ? room.name : room.sector || 'Plains') : 'Plains';

        if (!summaries[vnum]) {
            summaries[vnum] = {
                vnum,
                name: shortDesc,
                level,
                firstLoad: 0,
                maxLoad: 0,
                areas: new Set<string>()
            };
        }

        summaries[vnum].firstLoad += first;
        summaries[vnum].maxLoad += max;
        summaries[vnum].areas.add(areaName);
    });

    const mobList = Object.values(summaries);

    const sigList = mobList.filter(m => m.level >= 15).sort((a, b) => b.level - a.level);
    const highList = mobList.filter(m => m.level >= 10 && m.level <= 14).sort((a, b) => b.level - a.level);
    const midList = mobList.filter(m => m.level >= 5 && m.level <= 9).sort((a, b) => b.level - a.level);
    const lowList = mobList.filter(m => m.level >= 0 && m.level <= 4).sort((a, b) => b.level - a.level);

    const firstTotal = mobList.reduce((acc, m) => acc + m.firstLoad, 0);
    const maxTotal = mobList.reduce((acc, m) => acc + m.maxLoad, 0);

    const firstSig = sigList.reduce((acc, m) => acc + m.firstLoad, 0);
    const maxSig = sigList.reduce((acc, m) => acc + m.maxLoad, 0);

    const firstHigh = highList.reduce((acc, m) => acc + m.firstLoad, 0);
    const maxHigh = highList.reduce((acc, m) => acc + m.maxLoad, 0);

    const firstMid = midList.reduce((acc, m) => acc + m.firstLoad, 0);
    const maxMid = midList.reduce((acc, m) => acc + m.maxLoad, 0);

    const firstLow = lowList.reduce((acc, m) => acc + m.firstLoad, 0);
    const maxLow = lowList.reduce((acc, m) => acc + m.maxLoad, 0);

    const today = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/,/g, '');

    const lines: string[] = [];
    lines.push(`Keyword "mobs" (lgit: info/zones/${doc.zoneNumber}/mobs)`);
    lines.push(`z${doc.zoneNumber}, mobs`);
    lines.push(`${today}, Shaper`);
    lines.push(`This zone contains automatically summarized mobile load data.`);
    lines.push(``);
    lines.push(`Information:`);
    lines.push(` This is summary of the mobile load for z${doc.zoneNumber}.`);
    lines.push(`                                      First Load   Max load`);
    lines.push(` New`);
    lines.push(` Significant (lvl 15+)                ${String(firstSig).padEnd(13, ' ')}${maxSig}`);
    lines.push(` High        (lvl 10-14)              ${String(firstHigh).padEnd(13, ' ')}${maxHigh}`);
    lines.push(` Mid         (lvl 5-9)                ${String(firstMid).padEnd(13, ' ')}${maxMid}`);
    lines.push(` Low         (lvl 0-4)                ${String(firstLow).padEnd(13, ' ')}${maxLow}`);
    lines.push(`===========================================================`);
    lines.push(` Total       (all levels)             ${String(firstTotal).padEnd(13, ' ')}${maxTotal}`);
    lines.push(``);

    const formatListSection = (title: string, list: MobSummary[]) => {
        lines.push(`${title}:`);
        lines.push(` MOB:                                 LEVEL:     LOAD:       AREA:`);
        lines.push(` -----------------------------------------------------------------`);
        if (list.length === 0) {
            lines.push(` (None)`);
        } else {
            list.forEach(m => {
                const mobStr = ` m${m.vnum}`.padEnd(7, ' ') + `${m.name}`.padEnd(31, ' ');
                const lvlStr = `${m.level}`.padEnd(11, ' ');
                const loadStr = (m.firstLoad === m.maxLoad ? `${m.firstLoad}` : `${m.firstLoad}-${m.maxLoad}`).padEnd(12, ' ');
                const areaStr = Array.from(m.areas).slice(0, 2).join(', ');
                lines.push(mobStr + lvlStr + loadStr + areaStr);
            });
        }
        lines.push(``);
    };

    formatListSection('Significant mobiles', sigList);
    formatListSection('High', highList);
    formatListSection('Mid', midList);
    formatListSection('Low', lowList);

    return lines.join('\n');
};
