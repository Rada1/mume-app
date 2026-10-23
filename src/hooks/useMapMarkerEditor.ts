/** @file Marker selection, editing, deletion, and undo through shared mapper state. */
import { useRef, useState } from 'react';
import { useMapper } from '../context/useMapper';
import type { DeletedMapMarker, MapMarkerDraft } from '../types';
import type { MapperMarker } from '../components/Mapper/mapperTypes';
import { generateId } from '../components/Mapper/mapperUtils';
import { setMapMarkerDeleted } from '../utils/deletedMapMarkers';
import { useSettingsStore } from '../stores/useSettingsStore';

// --- Draft Conversion ---
const draftFor = (marker: MapperMarker): MapMarkerDraft => ({
    text: marker.text, x: String(marker.x), y: String(marker.y), z: String(marker.z ?? 0),
    fontSize: String(marker.fontSize || 12), dotSize: String(marker.dotSize || 5)
});

// --- Editor Actions ---
export const useMapMarkerEditor = () => {
    const showDotSize = useSettingsStore(state => !state.isPerformanceMode && !state.isClassicMode);
    const { markers, setMarkers, selectedMarkerId, setSelectedMarkerId, exploredMarkers,
        setExploredMarkers, triggerRender } = useMapper();
    const [isOpen, setIsOpen] = useState(false);
    const [draft, setDraft] = useState<MapMarkerDraft | null>(null);
    const [error, setError] = useState('');
    const [deleted, setDeleted] = useState<DeletedMapMarker | null>(null);
    const pendingNewId = useRef<string | null>(null);
    const discardNewMarker = () => {
        const id = pendingNewId.current;
        if (!id) return;
        pendingNewId.current = null;
        setMarkers(previous => { const next = { ...previous }; delete next[id]; return next; });
        setExploredMarkers(previous => { const next = new Set(previous); next.delete(id); return next; });
    };
    const select = (marker: MapperMarker) => {
        if (pendingNewId.current !== marker.id) discardNewMarker();
        setSelectedMarkerId(marker.id);
        setDraft(draftFor(marker));
        setError('');
        triggerRender();
    };
    const open = (id: string) => {
        const marker = markers[id];
        if (!marker) return;
        setIsOpen(true);
        select(marker);
    };
    const close = () => {
        discardNewMarker();
        setIsOpen(false);
        setSelectedMarkerId(null);
        setDraft(null);
        triggerRender();
    };
    const create = (x: number, y: number, z: number) => {
        const id = generateId();
        const marker = { id, x, y, z, text: 'New Marker', dotSize: 5, fontSize: 12, createdAt: Date.now() };
        discardNewMarker();
        pendingNewId.current = id;
        setMarkers(previous => ({ ...previous, [id]: marker }));
        setExploredMarkers(previous => new Set([...previous, id]));
        setIsOpen(true);
        select(marker);
    };
    const save = () => {
        if (!draft || !selectedMarkerId || !markers[selectedMarkerId]) return;
        const x = Number(draft.x), y = Number(draft.y), z = Number(draft.z);
        const fontSize = Number(draft.fontSize), dotSize = Number(draft.dotSize);
        if ([draft.x, draft.y, draft.z, draft.fontSize, draft.dotSize].some(value => !value.trim())
            || ![x, y, z, fontSize, dotSize].every(Number.isFinite)
            || fontSize < 6 || fontSize > 72 || dotSize < 1 || dotSize > 30) {
            setError('Enter valid coordinates, a text size from 6–72, and a dot size from 1–30.');
            return;
        }
        setMarkers(previous => previous[selectedMarkerId] ? {
            ...previous, [selectedMarkerId]: { ...previous[selectedMarkerId], text: draft.text.trim(), x, y, z, fontSize, dotSize }
        } : previous);
        pendingNewId.current = null;
        close();
    };
    const remove = () => {
        const marker = selectedMarkerId ? markers[selectedMarkerId] : null;
        if (!marker) return;
        pendingNewId.current = null;
        setDeleted({ marker, explored: exploredMarkers.has(marker.id) });
        setMapMarkerDeleted(marker.id, true);
        setMarkers(previous => { const next = { ...previous }; delete next[marker.id]; return next; });
        setExploredMarkers(previous => { const next = new Set(previous); next.delete(marker.id); return next; });
        setSelectedMarkerId(null);
        setDraft(null);
        triggerRender();
    };
    const undo = () => {
        if (!deleted) return;
        setMapMarkerDeleted(deleted.marker.id, false);
        setMarkers(previous => ({ ...previous, [deleted.marker.id]: deleted.marker }));
        if (deleted.explored) setExploredMarkers(previous => new Set([...previous, deleted.marker.id]));
        select(deleted.marker);
        setDeleted(null);
    };
    const change = (field: keyof MapMarkerDraft, value: string) => {
        setDraft(previous => previous ? { ...previous, [field]: value } : null);
        setError('');
    };
    return { isOpen, selectedMarkerId, draft, error, deleted, showDotSize,
        open, close, create, save, remove, undo, change };
};
