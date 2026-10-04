// @vitest-environment jsdom
/** @file useVisibleRoomOrder.test.ts — Checks visible room lines reach auto targeting. */

// --- Logic Section ---
import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { Message } from '../types';
import { useRoomStore } from '../stores/useRoomStore';
import { getAutoRoomTarget } from '../utils/commandAutoTarget';
import { useVisibleRoomOrder } from './useVisibleRoomOrder';

const roomMessage = (id: string, type: Message['type'], textRaw: string): Message => ({
    id, type, textRaw, html: '', timestamp: 0
});

afterEach(() => useRoomStore.setState({ chars: {}, visibleRoomSubjects: [], roomNum: 0 }));

it('updates the automatic target from the first character in the visible room block', () => {
    useRoomStore.setState({
        roomNum: 42,
        visibleRoomSubjects: [],
        chars: {
            1: { id: 1, name: 'a hungry warg', type: 'npc', _roomOrder: 0 },
            2: { id: 2, name: 'an Ohurk-uai warg-rider', type: 'npc', _roomOrder: 1 }
        }
    });
    const { result } = renderHook(() => useVisibleRoomOrder());

    act(() => {
        result.current({ ...roomMessage('title', 'room-name', 'Overgrown Trail'), isRoomName: true });
        result.current({
            ...roomMessage('rider', 'game', 'An Ohurk-uai warg-rider is here riding a hungry warg.'),
            tokens: [{ type: 'entity', content: 'Ohurk-uai warg-rider', entityId: '2', metadata: { kind: 'npc', occupantId: 2 } }]
        });
        result.current(roomMessage('warg', 'game', 'A hungry warg is standing here.'));
        result.current(roomMessage('exits', 'game', 'Exits: north, east, south, west.'));
    });

    expect(getAutoRoomTarget('hit', Object.values(useRoomStore.getState().chars))).toBe('rider');
});
