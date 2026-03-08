import { useCallback } from 'react';
import { parseMM2 } from '../mm2Parser';

export const useMapperExportImport = (
    rooms: Record<string, any>,
    setRooms: (rooms: Record<string, any>) => void,
    markers: Record<string, any>,
    setMarkers: (markers: Record<string, any>) => void,
    characterName: string | null | undefined,
    addMessage: ((type: string, msg: string) => void) | undefined,
    controller: any
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
                if (data.markers) setMarkers(data.markers);
                addMessage?.('system', '[Mapper] Map data imported successfully.');
            } catch (err) {
                addMessage?.('system', '[Mapper] Error importing map data.');
            }
        };
        reader.readAsText(file);
    }, [addMessage, setRooms, setMarkers]);

    const handleImportMMapper = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            addMessage?.('system', '[Mapper] Reading MMapper file...');
            const data = await parseMM2(file, 1.0);
            controller.loadImportedMapData(data);
        } catch (err) {
            console.error(err);
            addMessage?.('system', '[Mapper] Error parsing .mm2 file.');
        }
    }, [addMessage, controller]);

    return { handleExportMap, handleImportMap, handleImportMMapper };
};