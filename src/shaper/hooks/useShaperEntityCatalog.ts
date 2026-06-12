/**
 * @file useShaperEntityCatalog.ts
 * @description Dynamic mob/object catalog lookup using the real-time Zustand store.
 */

import { useEffect, useMemo } from 'react';
import { useShaperEntityStore } from '../model/useShaperEntityStore';

export interface ShaperCatalogEntry {
    kind: 'mob' | 'object';
    vnum: string;
    name: string;
}

// --- Hook Section ---
export const useShaperEntityCatalog = (
    kind: ShaperCatalogEntry['kind'],
    query?: string
) => {
    const mobiles = useShaperEntityStore(s => s.mobiles);
    const objects = useShaperEntityStore(s => s.objects);
    const searchMobiles = useShaperEntityStore(s => s.searchMobiles);
    const searchObjects = useShaperEntityStore(s => s.searchObjects);

    // Trigger debounced search dynamically for autocomplete suggestions
    useEffect(() => {
        const trimmed = (query || '').trim();
        if (trimmed.length < 3) return;

        const handler = setTimeout(() => {
            if (kind === 'mob') {
                searchMobiles(trimmed);
            } else {
                searchObjects(trimmed);
            }
        }, 400);

        return () => clearTimeout(handler);
    }, [kind, query, searchMobiles, searchObjects]);

    return useMemo(() => {
        const source = kind === 'mob' ? mobiles : objects;
        return source.map(item => ({
            kind,
            vnum: String(item.vnum),
            name: item.name
        }));
    }, [kind, mobiles, objects]);
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
