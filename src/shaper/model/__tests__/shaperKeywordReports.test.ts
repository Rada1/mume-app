/**
 * @file shaperKeywordReports.test.ts
 * @description Verifies mobs/objects keyword reports bucket by the real level and
 *              object type carried by the entity-stat cache (populated via /stat).
 *              This is the payoff of auto-statting before "Generate from Grid":
 *              without cached stats mobs default to level 0 (all "Low") and
 *              objects default to OTHER (no herb/food/equipment split).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultShaperDocument } from '../shaperDocument';
import { generateShaperMobsReport } from '../shaperMobsKeyword';
import { generateShaperObjectsReport } from '../shaperObjectsKeyword';
import { useShaperEntityStore } from '../useShaperEntityStore';
import type { ShaperCommandNode } from '../shaperTypes';

const node = (roomId: string, type: ShaperCommandNode['type'], vnum: string): ShaperCommandNode => ({
    id: `node-${type}-${vnum}`,
    roomId,
    parentId: null,
    order: 0,
    type,
    limit: { world: null, zone: null, room: 1, chancePercent: 100, raw: '100' },
    fields: { vnum, name: '', target: 'parent', container: 'parent', position: '' },
    notes: ''
});

afterEach(() => {
    useShaperEntityStore.setState({ mobileStats: {}, objectStats: {} });
});

describe('generateShaperMobsReport', () => {
    it('buckets mobiles by their cached /stat level instead of defaulting to Low', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const roomId = doc.selectedRoomId;
        doc.commandNodes = {
            a: node(roomId, 'mobile', '100'),
            b: node(roomId, 'mobile', '200')
        };
        useShaperEntityStore.setState({
            mobileStats: {
                100: { vnum: 100, name: 'a wyrm', level: 20, class: 'ANIMAL', align: 0, rawText: '' },
                200: { vnum: 200, name: 'a rat', level: 3, class: 'ANIMAL', align: 0, rawText: '' }
            }
        });

        const report = generateShaperMobsReport(doc);
        const sig = report.slice(report.indexOf('Significant mobiles:'), report.indexOf('High:'));
        const low = report.slice(report.indexOf('Low:'));
        expect(sig).toContain('m100');
        expect(sig).toContain('a wyrm');
        expect(low).toContain('m200');
        // The high-level mob must NOT fall into the Low bucket.
        expect(low).not.toContain('m100');
    });
});

describe('generateShaperObjectsReport', () => {
    it('classifies objects by their cached /stat type and wear flags', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const roomId = doc.selectedRoomId;
        doc.commandNodes = {
            a: node(roomId, 'object', '300'),
            b: node(roomId, 'object', '400'),
            c: node(roomId, 'object', '500')
        };
        useShaperEntityStore.setState({
            objectStats: {
                300: { vnum: 300, name: 'some athelas', type: 'HERB', weight: 0, value: 0, extraFlags: [], wearFlags: ['TAKE'], rawText: '' },
                400: { vnum: 400, name: 'a loaf of bread', type: 'FOOD', weight: 1, value: 0, extraFlags: [], wearFlags: ['TAKE'], rawText: '' },
                500: { vnum: 500, name: 'a chain mail', type: 'ARMOR', weight: 5, value: 0, extraFlags: [], wearFlags: ['TAKE', 'BODY'], rawText: '' }
            }
        });

        const report = generateShaperObjectsReport(doc);
        const section = (title: string, next: string) =>
            report.slice(report.indexOf(`${title}:`), report.indexOf(`${next}:`));
        expect(section('HERBS/PLANTS', 'FOOD')).toContain('o300');
        expect(section('FOOD', 'IMMOBILE')).toContain('o400');
        expect(section('EQUIPMENT', 'KEY')).toContain('o500');
    });

    it('leaves everything unclassified (OTHER/immobile) when no stats are cached', () => {
        const doc = createDefaultShaperDocument({ zoneNumber: 31 });
        const roomId = doc.selectedRoomId;
        doc.commandNodes = { a: node(roomId, 'object', '300') };

        const report = generateShaperObjectsReport(doc);
        // Without a cached /stat, the herb can't be recognized as a herb.
        expect(report.slice(report.indexOf('HERBS/PLANTS:'), report.indexOf('FOOD:'))).toContain('(None)');
    });
});
