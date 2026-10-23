/** @file mapperRoomNotes.ts — Resolve local notes, including intentionally cleared imports. */
import type { MapperRoom } from '../components/Mapper/mapperTypes';

// --- Note precedence ---
export const getMapperRoomNote = (room: MapperRoom | undefined, importedNote: unknown): string => {
    if (room?.notesEdited) return room.notes;
    return room?.notes || (typeof importedNote === 'string' ? importedNote : '');
};
