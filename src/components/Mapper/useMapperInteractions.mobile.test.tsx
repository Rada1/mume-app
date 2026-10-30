// @vitest-environment jsdom
/** @file useMapperInteractions.mobile.test.tsx — Mobile taps select rooms beneath map targets. */
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapperInteractions, type InteractionDeps } from './useMapperInteractions';
import { MovementPad } from '../HUD/MovementPad';

// --- Logic Section ---
const hit = vi.hoisted(() => ({
    screenToWorld: vi.fn(() => ({ x: 25, y: 25 })),
    getRoomAt: vi.fn(() => 'm_1'),
    getExitAt: vi.fn(),
    getOccupantAt: vi.fn(),
    getMarkerAt: vi.fn()
}));
vi.mock('./hooks/useMapHitTest', () => ({ useMapHitTest: () => hit }));
vi.mock('../../services/audio/AudioManager', () => ({ audioManager: { playEffect: vi.fn() } }));
vi.mock('./occupantAnimStore', () => ({ registerOccupantTap: vi.fn() }));
vi.mock('../../context/GameContext', () => ({ useGame: () => ({ executeCommand: vi.fn(), triggerHaptic: vi.fn() }) }));

const pointer = (target: EventTarget, type: 'pointerdown' | 'pointerup', pointerType: string) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 25, clientY: 25, button: 0 });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } });
    act(() => { target.dispatchEvent(event); });
};

const mountMap = (isMobile: boolean, readability = false, held = false, withPad = false) => {
    const host = document.createElement('div');
    host.className = `app-container ${isMobile ? 'is-mobile' : ''} ${readability ? 'readability-mode' : ''}`;
    const canvas = document.createElement('canvas');
    let padButton = document.createElement('button');
    const padCommand = vi.fn();
    if (withPad) {
        const branches = document.createElement('div');
        const branch = document.createElement('div');
        branch.className = 'is-movement-branch';
        const pad = document.createElement('div');
        render(<MovementPad layout="menu" onCommand={padCommand} onDirectionHold={vi.fn()} onDirectionRelease={vi.fn()} />, { container: pad });
        padButton = pad.querySelector<HTMLButtonElement>('.pad-n')!;
        branch.append(pad);
        const slot = document.createElement('div');
        slot.className = 'command-tree-movement-map-slot';
        slot.dataset.mapVisible = 'true';
        slot.append(canvas);
        branches.append(branch, slot);
        host.append(branches);
    } else host.append(canvas);
    document.body.append(host);
    const executeCommand = vi.fn();
    const setContextMenu = vi.fn();
    const setPopoverState = vi.fn();
    const onEditMarker = vi.fn();
    const deps = {
        canvasRef: { current: canvas }, cardRef: { current: null },
        cameraRef: { current: { x: 0, y: 0, zoom: 1 } },
        rooms: {}, markers: {}, selectedRoomIds: new Set(), currentRoomId: 'm_1',
        entitiesRef: { current: {} }, spatialIndexRef: { current: {} }, preloadedCoordsRef: { current: {} },
        mode: 'play', isMobile, viewZ: 0, isDesignMode: false, isMinimized: false,
        heldButton: held ? { id: 'attack', baseCommand: 'kill %n', didFire: false } : null,
        joystick: { handleJoystickStart: vi.fn(), handleJoystickCancel: vi.fn(), handleJoystickEnd: vi.fn() },
        executeCommand, setContextMenu, setPopoverState, onEditMarker,
        triggerRender: vi.fn(), setRooms: vi.fn(), setMarkers: vi.fn(), setViewZ: vi.fn(),
        setAutoCenter: vi.fn(), setInfoRoomId: vi.fn(), setMapSwipeWheel: vi.fn(), setSelectedRoomIds: vi.fn(),
        setSelectedMarkerId: vi.fn(), triggerHaptic: vi.fn(), startWalking: vi.fn(), stopWalking: vi.fn(),
        setIsDragging: vi.fn(), handleAddRoom: vi.fn(), setActiveSet: vi.fn()
    } as unknown as InteractionDeps;
    renderHook(() => useMapperInteractions(deps));
    const tap = () => {
        pointer(canvas, 'pointerdown', isMobile ? 'touch' : 'mouse');
        pointer(window, 'pointerup', isMobile ? 'touch' : 'mouse');
    };
    return { tap, executeCommand, setContextMenu, setPopoverState, onEditMarker, canvas, padButton, padCommand, camera: deps.cameraRef };
};

const touch = (target: EventTarget, type: string, id: number, x: number, y: number) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'touch' } });
    act(() => { target.dispatchEvent(event); });
    return event;
};

beforeEach(() => {
    vi.clearAllMocks();
    hit.getExitAt.mockReturnValue(null);
    hit.getOccupantAt.mockReturnValue(null);
    hit.getMarkerAt.mockReturnValue(null);
});
afterEach(() => { cleanup(); document.body.replaceChildren(); });

describe.each([false, true])('mobile map taps with readability=%s', readability => {
    it.each(['door', 'player', 'npc', 'item', 'marker'])('opens the room menu beneath a %s without targeting it', kind => {
        if (kind === 'door') hit.getExitAt.mockReturnValue({ direction: 'n', roomId: 'm_1', isClosed: true });
        else if (kind === 'marker') hit.getMarkerAt.mockReturnValue('marker-1');
        else hit.getOccupantAt.mockReturnValue({ id: 12, name: 'Target', kind, category: 'players', commandTarget: 'target' });
        const map = mountMap(true, readability);
        map.tap();
        expect(map.setContextMenu).toHaveBeenCalledWith(expect.objectContaining({ roomId: 'm_1' }));
        expect(map.executeCommand).not.toHaveBeenCalled();
        expect(map.setPopoverState).not.toHaveBeenCalled();
        expect(map.onEditMarker).not.toHaveBeenCalled();
        expect(hit.getExitAt).not.toHaveBeenCalled();
        expect(hit.getOccupantAt).not.toHaveBeenCalled();
    });

    it('does not apply a held command to an occupant on a map tap', () => {
        hit.getOccupantAt.mockReturnValue({ id: 12, name: 'Target', kind: 'player', commandTarget: 'target' });
        const map = mountMap(true, readability, true);
        map.tap();
        expect(map.executeCommand).not.toHaveBeenCalled();
        expect(map.setContextMenu).toHaveBeenCalledWith(expect.objectContaining({ roomId: 'm_1' }));
    });
});

describe('desktop map target interactions', () => {
    it('continues opening closed doors', () => {
        hit.getExitAt.mockReturnValue({ direction: 'n', roomId: 'm_1', isClosed: true });
        const map = mountMap(false);
        map.tap();
        expect(map.executeCommand.mock.calls[0]?.[0]).toBe('open exit north');
    });

    it('continues opening occupant menus', () => {
        hit.getOccupantAt.mockReturnValue({ id: 12, name: 'Target', kind: 'player', category: 'players', commandTarget: 'target' });
        const map = mountMap(false);
        map.tap();
        expect(map.setPopoverState).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'roomchars:12', context: 'target' }));
    });
});

describe('mobile movement pad map gestures', () => {
    it('keeps an activated direction hold through movement and a second touch on the map', () => {
        vi.useFakeTimers();
        try {
            const map = mountMap(true, true, false, true);
            touch(map.padButton, 'pointerdown', 1, 25, 25);
            act(() => vi.advanceTimersByTime(120));
            expect(map.padButton.dataset.activeMovementHold).toBe('true');
            touch(map.padButton, 'pointermove', 1, 45, 25);
            touch(map.canvas, 'pointerdown', 2, 75, 25);
            touch(map.canvas, 'pointermove', 2, 100, 25);
            touch(map.canvas, 'pointerup', 2, 100, 25);
            expect(map.padButton.dataset.activeMovementHold).toBe('true');
            expect(map.padButton.dataset.mapGesture).toBeUndefined();
            expect(map.camera.current.x).toBe(0);
            expect(map.camera.current.zoom).toBe(1);
            touch(map.padButton, 'pointerup', 1, 45, 25);
            expect(map.padButton.dataset.activeMovementHold).toBeUndefined();
        } finally {
            vi.useRealTimers();
        }
    });
    it('keeps a direction tap available and pans when the finger moves', () => {
        const map = mountMap(true, true, false, true);
        expect(touch(map.padButton, 'pointerdown', 1, 25, 25).defaultPrevented).toBe(false);
        touch(map.padButton, 'pointerup', 1, 25, 25);
        fireEvent.click(map.padButton, { detail: 1 });
        expect(map.padCommand).toHaveBeenCalledTimes(1);
        expect(map.padButton.classList.contains('is-key-pressed')).toBe(true);
        expect(map.padButton.dataset.mapGesture).toBeUndefined();
        expect(map.setContextMenu).not.toHaveBeenCalled();

        touch(map.padButton, 'pointerdown', 2, 25, 25);
        touch(map.padButton, 'pointermove', 2, 45, 25);
        expect(map.camera.current.x).toBe(-20);
        expect(map.padButton.dataset.mapGesture).toBe('true');
        touch(map.padButton, 'pointerup', 2, 45, 25);
        fireEvent.click(map.padButton, { detail: 1 });
        expect(map.padCommand).toHaveBeenCalledTimes(1);
        expect(map.executeCommand).not.toHaveBeenCalled();
    });

    it('zooms when a pinch starts across the pad and map', () => {
        const map = mountMap(true, true, false, true);
        touch(map.padButton, 'pointerdown', 1, 25, 25);
        touch(map.canvas, 'pointerdown', 2, 75, 25);
        touch(map.canvas, 'pointermove', 2, 100, 25);
        expect(map.camera.current.zoom).toBeGreaterThan(1);
        expect(map.padButton.dataset.mapGesture).toBe('true');
        touch(map.padButton, 'pointerup', 1, 25, 25);
        touch(map.canvas, 'pointerup', 2, 100, 25);
        fireEvent.click(map.padButton, { detail: 1 });
        expect(map.padCommand).not.toHaveBeenCalled();
        expect(map.executeCommand).not.toHaveBeenCalled();
        expect(map.setContextMenu).not.toHaveBeenCalled();
    });

    it('suppresses both direction taps when a pinch starts on two pad buttons', () => {
        const map = mountMap(true, true, false, true);
        const west = map.padButton.closest('.movement-pad')!.querySelector<HTMLButtonElement>('.pad-w')!;
        touch(map.padButton, 'pointerdown', 1, 25, 25);
        touch(west, 'pointerdown', 2, 75, 25);
        touch(west, 'pointermove', 2, 100, 25);
        expect(map.camera.current.zoom).toBeGreaterThan(1);
        touch(map.padButton, 'pointerup', 1, 25, 25);
        touch(west, 'pointerup', 2, 100, 25);
        fireEvent.click(map.padButton, { detail: 1 });
        fireEvent.click(west, { detail: 1 });
        expect(map.padCommand).not.toHaveBeenCalled();
    });
});
