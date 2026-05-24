import React, { useCallback } from 'react';
import { parseMM2 } from '../mm2Parser';

export const useMapperExportImport = (
    rooms: Record<string, any>,
    setRooms: (rooms: Record<string, any>) => void,
    markers: Record<string, any>,
    setMarkers: (markers: Record<string, any>) => void,
    characterName: string | null | undefined,
    addMessage: ((type: string, msg: string) => void) | undefined,
    controller: any,
    setExploredMarkers?: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
    const handleExportMap = useCallback(() => {
        const data = {
            rooms,
            markers,
            characterName,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mume_map_${characterName || 'player'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [rooms, markers, characterName]);

    const handleImportMap = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.rooms) setRooms(data.rooms);
                if (data.markers) {
                    setMarkers(data.markers);
                    const ids = Object.keys(data.markers);
                    if (ids.length > 0) setExploredMarkers?.(prev => new Set([...prev, ...ids]));
                }
                addMessage?.('system', '[Mapper] Map data imported successfully.');
            } catch (err) {
                addMessage?.('system', '[Mapper] Error importing map data.');
            }
        };
        reader.readAsText(file);
    }, [addMessage, setRooms, setMarkers, setExploredMarkers]);

    const handleImportMMapper = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            addMessage?.('system', '[Mapper] Reading MMapper file...');
            const data = await parseMM2(file, 1.0);
            const markerCount = data.markers ? Object.keys(data.markers).length : 0;
            console.log('[mm2 import] parser returned:', {
                rooms: Object.keys(data.rooms || {}).length,
                markers: markerCount,
                firstMarkers: data.markers ? Object.values(data.markers).slice(0, 5) : []
            });
            controller.loadImportedMapData(data.rooms);
            if (data.markers && markerCount > 0) {
                setMarkers(data.markers);
                const ids = Object.keys(data.markers);
                setExploredMarkers?.(prev => new Set([...prev, ...ids]));
                const sampleTexts = Object.values(data.markers).slice(0, 5).map((m: any) => `"${m.text}" @(${m.x},${m.y})`).join(', ');
                addMessage?.('system', `[Mapper] Imported ${ids.length} markers (saved). First few: ${sampleTexts}`);
            } else {
                addMessage?.('system', '[Mapper] No markers found in .mm2 (parser may not have decoded them).');
            }
        } catch (err) {
            console.error('[mm2 import] error:', err);
            addMessage?.('system', '[Mapper] Error parsing .mm2 file.');
        }
    }, [addMessage, controller, setMarkers, setExploredMarkers]);

    return { handleExportMap, handleImportMap, handleImportMMapper };
};
