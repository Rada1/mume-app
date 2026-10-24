/** @file roomFieldUpdate.test.ts — Repeated Look state must not notify room subscribers. */
import { expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createRoomActions, initialRoomState, type RoomState } from './roomSlice';

// --- Room Subscription Checks ---
it('publishes real changes but skips repeated text, exits and unchanged item lists', () => {
    const store = createStore<RoomState>((set, get) => ({...initialRoomState, ...createRoomActions(set, get)}));
    const listener = vi.fn();
    store.subscribe(listener);
    const room = store.getState();
    room.setRoomName('Garden');
    room.setRoomDesc('A quiet garden.');
    room.setRoomZone('Valinor');
    room.setRoomExits(['n', 's']);
    room.setCurrentTerrain('field');
    const published = listener.mock.calls.length;
    const exits = store.getState().exits;
    room.setRoomName('Garden');
    room.setRoomDesc(previous => previous);
    room.setRoomZone('Valinor');
    room.setExits(['n', 's']);
    room.setTerrain('field');
    room.setItems(previous => [...previous]);
    expect(listener).toHaveBeenCalledTimes(published);
    expect(store.getState().exits).toBe(exits);
    room.setRoomExits(['s', 'n']);
    expect(listener).toHaveBeenCalledTimes(published + 1);
    room.setItems([{id: 'sword', name: 'a sword'}]);
    expect(listener).toHaveBeenCalledTimes(published + 2);
});
