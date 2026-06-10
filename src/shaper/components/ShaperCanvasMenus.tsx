/**
 * @file ShaperCanvasMenus.tsx
 * @description Context menus for Shaper room and connection editing.
 */

import type { ShaperExitState } from '../model/shaperExits';
import type { ShaperDirection, ShaperExitDraft, ShaperRoomDraft, ShaperRoomId } from '../model/shaperTypes';
import type { ShaperConnectionMenuState, ShaperRoomMenuState } from './ShaperCanvasGeometry';

interface MenuPositionProps {
    viewport: HTMLDivElement | null;
}

interface RoomContextMenuProps extends MenuPositionProps {
    menu: ShaperRoomMenuState;
    selectedRoomIds: Set<ShaperRoomId>;
    viewZ: number;
    onAddRoomAt: (x: number, y: number, z: number) => void;
    onRemoveRoom: (roomId: ShaperRoomId) => void;
    onRemoveRooms: (roomIds: ShaperRoomId[]) => void;
    onClose: () => void;
}

interface ConnectionContextMenuProps extends MenuPositionProps {
    menu: ShaperConnectionMenuState;
    rooms: Record<ShaperRoomId, ShaperRoomDraft>;
    exits: Record<string, ShaperExitDraft>;
    onConnectExits: (aId: ShaperRoomId, bId: ShaperRoomId, dirAB: ShaperDirection, dirBA: ShaperDirection, state: ShaperExitState) => void;
    onToggleExitDoor: (fromRoomId: ShaperRoomId, direction: ShaperDirection) => void;
    onClose: () => void;
}

const styleFor = (
    viewport: HTMLDivElement | null,
    screenX: number,
    screenY: number
): React.CSSProperties => ({
    left: screenX - (viewport?.getBoundingClientRect().left ?? 0),
    top: screenY - (viewport?.getBoundingClientRect().top ?? 0)
});

const dirLabel = (dir: ShaperDirection): string => {
    const labels: Record<ShaperDirection, string> = {
        n: 'north',
        e: 'east',
        s: 'south',
        w: 'west',
        u: 'up',
        d: 'down'
    };
    return labels[dir];
};

// --- Room Menu Section ---
export const ShaperRoomContextMenu: React.FC<RoomContextMenuProps> = ({
    menu,
    selectedRoomIds,
    viewZ,
    viewport,
    onAddRoomAt,
    onRemoveRoom,
    onRemoveRooms,
    onClose
}) => (
    <div className="shaper-context-menu" style={styleFor(viewport, menu.screenX, menu.screenY)} onPointerDown={event => event.stopPropagation()}>
        {menu.roomId ? (
            selectedRoomIds.has(menu.roomId) && selectedRoomIds.size > 1 ? (
                <button type="button" onClick={() => { onRemoveRooms([...selectedRoomIds]); onClose(); }}>
                    Remove {selectedRoomIds.size} rooms
                </button>
            ) : (
                <button type="button" onClick={() => { onRemoveRoom(menu.roomId!); onClose(); }}>
                    Remove room
                </button>
            )
        ) : (
            <button type="button" onClick={() => { onAddRoomAt(menu.cellX, menu.cellY, viewZ); onClose(); }}>
                Add room here
            </button>
        )}
    </div>
);

// --- Connection Menu Section ---
export const ShaperConnectionContextMenu: React.FC<ConnectionContextMenuProps> = ({
    menu,
    rooms,
    exits,
    viewport,
    onConnectExits,
    onToggleExitDoor,
    onClose
}) => {
    const roomA = rooms[menu.aId];
    const roomB = rooms[menu.bId];
    const exit1 = exits[`${menu.aId}:${menu.dirAB}`];
    const exit2 = exits[`${menu.bId}:${menu.dirBA}`];
    const isTwoWay = exit1?.toRoomId === menu.bId && exit2?.toRoomId === menu.aId;
    const labelA = roomA?.roomNumber ?? 'Room A';
    const labelB = roomB?.roomNumber ?? 'Room B';
    const forwardLabel = `${labelA} ${dirLabel(menu.dirAB)} to ${labelB}`;
    const reverseLabel = `${labelB} ${dirLabel(menu.dirBA)} to ${labelA}`;

    const setState = (state: ShaperExitState) => {
        onConnectExits(menu.aId, menu.bId, menu.dirAB, menu.dirBA, state);
        onClose();
    };

    return (
        <div className="shaper-context-menu shaper-connection-menu" style={styleFor(viewport, menu.screenX, menu.screenY)} onPointerDown={event => event.stopPropagation()}>
            <div className="shaper-menu-heading">
                <span>Connection</span>
                <strong>{labelA} / {labelB}</strong>
            </div>

            <div className="shaper-menu-section">
                <span>Exit shape</span>
                <button type="button" onClick={() => setState('two-way')}>
                    <strong>Two-way</strong>
                    <em>{forwardLabel} and {reverseLabel}</em>
                </button>
                <button type="button" onClick={() => setState('forward')}>
                    <strong>One-way</strong>
                    <em>{forwardLabel} only</em>
                </button>
                <button type="button" onClick={() => setState('reverse')}>
                    <strong>One-way</strong>
                    <em>{reverseLabel} only</em>
                </button>
            </div>

            <div className="shaper-menu-section">
                <span>Doors</span>
                {exit1 ? (
                    <button type="button" onClick={() => { onToggleExitDoor(menu.aId, menu.dirAB); onClose(); }}>
                        <strong>{exit1.hasDoor ? 'Remove door' : 'Add door'}</strong>
                        <em>On {forwardLabel}</em>
                    </button>
                ) : <p>No exit from {labelA} to {labelB}.</p>}
                {exit2 ? (
                    <button type="button" onClick={() => { onToggleExitDoor(menu.bId, menu.dirBA); onClose(); }}>
                        <strong>{exit2.hasDoor ? 'Remove door' : 'Add door'}</strong>
                        <em>On {reverseLabel}</em>
                    </button>
                ) : <p>No exit from {labelB} to {labelA}.</p>}
            </div>

            <button type="button" onClick={() => setState('none')} className="shaper-danger-action">
                Delete both exits
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
        </div>
    );
};
