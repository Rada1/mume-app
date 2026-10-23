/** @file Persistent tombstones prevent bundled markers from returning after deletion. */
import type { MapperMarker } from '../components/Mapper/mapperTypes';

// --- Marker Deletion Preferences ---
const STORAGE_KEY = 'mume_mapper_deleted_markers_v1';
export const getDeletedMapMarkerIds = (): Set<string> => {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []);
    } catch { return new Set(); }
};

export const setMapMarkerDeleted = (id: string, deleted: boolean): void => {
    const ids = getDeletedMapMarkerIds();
    if (deleted) ids.add(id); else ids.delete(id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); }
    catch (error) { console.warn('[Mapper] Could not save marker deletion:', error); }
};

export const withoutDeletedMapMarkers = (markers: Record<string, MapperMarker>): Record<string, MapperMarker> => {
    const deleted = getDeletedMapMarkerIds();
    return Object.fromEntries(Object.entries(markers).filter(([id]) => !deleted.has(id)));
};
