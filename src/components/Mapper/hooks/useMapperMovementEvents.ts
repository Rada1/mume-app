/** @file Correlates server movement directions with their following room observations. */
import { useEffect, useRef } from 'react';
import { gmcpBus } from '../../../events/gmcpBus';
import { normalizeMovementDirection } from '../../../utils/movementDirections';

// --- Logic Section ---
export function useMapperMovementEvents(onMissingRoom: (direction: string) => void, active: boolean) {
    const pending = useRef<string | null>(null);
    const available = useRef(false);
    const missingRoom = useRef(onMissingRoom);
    missingRoom.current = onMissingRoom;

    useEffect(() => {
        const reset = () => { pending.current = null; available.current = false; };
        reset();
        const offMove = gmcpBus.on('Event.Moved', data => {
            if (!active) return;
            // Match MMapper/WebCockpit: a second move flushes an arrival whose
            // Room.Info was absent. Never consume both this event and its room.
            if (pending.current) missingRoom.current(pending.current);
            const raw = typeof data === 'string' ? data
                : data && typeof data === 'object' && 'dir' in data ? data.dir : null;
            pending.current = normalizeMovementDirection(typeof raw === 'string' ? raw : null);
            available.current = true;
        });
        const offDisconnect = gmcpBus.on('Connection.Disconnect', reset);
        const offSession = gmcpBus.on('Session.Reset', reset);
        const offStart = gmcpBus.on('Session.Start', reset);
        const offDeath = gmcpBus.on('Game.PlayerDeath', () => { pending.current = null; });
        return () => { offMove(); offDisconnect(); offSession(); offStart(); offDeath(); reset(); };
    }, [active]);

    return () => {
        const direction = available.current ? pending.current : undefined;
        pending.current = null;
        return direction;
    };
}
