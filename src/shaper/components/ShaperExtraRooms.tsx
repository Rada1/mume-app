/**
 * @file ShaperExtraRooms.tsx
 * @description Extra room rail for irregular Shaper rooms on the active layer.
 */

import type { ShaperRoomDraft, ShaperRoomId } from '../model/shaperTypes';

interface ShaperExtraRoomsProps {
    rooms: ShaperRoomDraft[];
    selectedRoomId: ShaperRoomId;
    mimeType: string;
    onSelectRoom: (roomId: ShaperRoomId) => void;
}

// --- Component Section ---
export const ShaperExtraRooms: React.FC<ShaperExtraRoomsProps> = ({
    rooms,
    selectedRoomId,
    mimeType,
    onSelectRoom
}) => (
    <section className="shaper-extra-room-section" aria-label="Extra rooms on this layer">
        <div className="shaper-extra-room-heading">
            <span>Extra Rooms - drag onto the grid to place</span>
            <strong>{rooms.length}</strong>
        </div>
        {rooms.length === 0 ? (
            <p>No attached tunnel, tower, or overflow rooms on this layer.</p>
        ) : rooms.map(room => (
            <button
                key={room.id}
                type="button"
                draggable
                onDragStart={event => event.dataTransfer.setData(mimeType, room.id)}
                className={`shaper-extra-room sector-${room.sector || 'unset'} ${room.id === selectedRoomId ? 'selected' : ''}`}
                onClick={() => onSelectRoom(room.id)}
            >
                <span>{room.roomNumber}</span>
                <strong>{room.name || 'Extra draft room'}</strong>
                <em>{room.sector || 'unset'}</em>
            </button>
        ))}
    </section>
);
