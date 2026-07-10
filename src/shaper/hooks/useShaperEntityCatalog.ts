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

export interface ShaperCatalog {
    /** Catalog rows currently held in the store. */
    entries: ShaperCatalogEntry[];
    /** The query the store's rows were last fetched for (trimmed input). */
    catalogQuery: string;
}

// --- Hook Section ---
export const useShaperEntityCatalog = (
    kind: ShaperCatalogEntry['kind'],
    query?: string
): ShaperCatalog => {
    const mobiles = useShaperEntityStore(s => s.mobiles);
    const objects = useShaperEntityStore(s => s.objects);
    const mobilesQuery = useShaperEntityStore(s => s.mobilesQuery);
    const objectsQuery = useShaperEntityStore(s => s.objectsQuery);
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
        return {
            entries: source.map(item => ({
                kind,
                vnum: String(item.vnum),
                name: item.name
            })),
            catalogQuery: kind === 'mob' ? mobilesQuery : objectsQuery
        };
    }, [kind, mobiles, objects, mobilesQuery, objectsQuery]);
};

export const matchShaperCatalogEntries = (
    entries: ShaperCatalogEntry[],
    query: string,
    catalogQuery = '',
    limit = 100
): ShaperCatalogEntry[] => {
    const text = query.trim().toLowerCase();
    if (text.length < 2) return [];

    // When the live `/num` lookup has resolved for this exact query, `entries` is
    // the server's authoritative match set. Show it verbatim rather than
    // re-filtering by short-description substring — the server matches on object
    // keywords too, so a search for "pants" legitimately returns entries whose
    // short desc reads "leggings"/"trousers"/"breeches", which a substring filter
    // would wrongly hide.
    const isAuthoritative =
        catalogQuery.trim().toLowerCase() === text && entries.length > 0;

    const filtered = isAuthoritative
        ? entries
        : entries.filter(
              entry => entry.name.toLowerCase().includes(text) || entry.vnum.includes(text)
          );

    return filtered.slice(0, limit);
};
