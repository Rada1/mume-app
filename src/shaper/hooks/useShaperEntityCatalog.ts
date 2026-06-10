/**
 * @file useShaperEntityCatalog.ts
 * @description Shared mob/object catalog lookup for Shaper entity inputs.
 */

import { useEffect, useMemo, useState } from 'react';

export interface ShaperCatalogEntry {
    kind: 'mob' | 'object';
    vnum: string;
    name: string;
}

interface StatsEntity {
    vnum: number;
    name: string;
}

const parseFallback = (kind: ShaperCatalogEntry['kind'], item: string): ShaperCatalogEntry => {
    const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
    return { kind, vnum: match?.[1] ?? '', name: match?.[2] ?? item };
};

// --- Hook Section ---
export const useShaperEntityCatalog = (kind: ShaperCatalogEntry['kind']) => {
    const [entries, setEntries] = useState<ShaperCatalogEntry[]>([]);

    useEffect(() => {
        let alive = true;
        fetch('/mume_entities_with_stats.json')
            .then(res => {
                if (!res.ok) throw new Error('Missing stats catalog');
                return res.json();
            })
            .then(data => {
                const source = (kind === 'mob' ? data.mobiles : data.objects) as StatsEntity[] | undefined;
                if (alive) setEntries((source ?? []).map(item => ({ kind, vnum: String(item.vnum), name: item.name })));
            })
            .catch(() => {
                fetch('/mume_usable_entities.json')
                    .then(res => res.ok ? res.json() : Promise.reject(new Error('Missing fallback catalog')))
                    .then(data => {
                        const source = (kind === 'mob' ? data.mobiles : data.objects) as string[] | undefined;
                        if (alive) setEntries((source ?? []).map(item => parseFallback(kind, item)));
                    })
                    .catch(() => { if (alive) setEntries([]); });
            });
        return () => { alive = false; };
    }, [kind]);

    return useMemo(() => entries, [entries]);
};

export const matchShaperCatalogEntries = (
    entries: ShaperCatalogEntry[],
    query: string,
    limit = 6
): ShaperCatalogEntry[] => {
    const text = query.trim().toLowerCase();
    if (text.length < 2) return [];
    return entries
        .filter(entry => entry.name.toLowerCase().includes(text) || entry.vnum.includes(text))
        .slice(0, limit);
};
