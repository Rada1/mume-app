/**
 * @file useCurrentMapRoomNote.ts
 * @description Reads the note attached to the player's current mapper room.
 */

// --- Logic Section ---
import { useMapper } from '../context/useMapper';
import { getMapperRoomNote } from '../utils/mapperRoomNotes';

export const useCurrentMapRoomNote = (): string => {
    const { currentRoomId, rooms, preloadedCoordsRef } = useMapper();
    if (!currentRoomId) return '';

    const rawRoomId = currentRoomId.replace(/^m_/, '');
    const room = rooms[currentRoomId] ?? rooms[`m_${rawRoomId}`] ?? rooms[rawRoomId];
    const preloadedNote: unknown = preloadedCoordsRef.current[rawRoomId]?.[15];
    const note = getMapperRoomNote(room, preloadedNote);
    return note.trim();
};
