// @vitest-environment jsdom
/** @file useRoomNoLight.test.tsx — Dark and no-light room metadata both block celestial effects. */
import { renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useRoomNoLight } from './useRoomNoLight';

// --- Mapper Fixtures Section ---
const mapper = vi.hoisted(() => ({
    currentRoomId: 'm_123',
    rooms: {} as Record<string, { mobFlags?: string[]; flags?: string[]; light?: string | number }>,
    preloadedCoordsRef: { current: {} as Record<string, unknown[]> }
}));
vi.mock('../context/useMapper', () => ({ useMapper: () => mapper }));
beforeEach(() => { mapper.rooms = {}; mapper.preloadedCoordsRef.current = {}; });
afterEach(cleanup);

// --- Celestial Visibility Section ---
it.each(['DARK', 'NOLIGHT', 'NO_LIGHT', 'dark'])('blocks the %s room flag', flag => {
    mapper.rooms.m_123 = { mobFlags: [flag] };
    expect(renderHook(useRoomNoLight).result.current).toBe(true);
});
it.each([1, '1', 'DARK'])('blocks the dark light metadata value %s', light => {
    mapper.rooms.m_123 = { light };
    expect(renderHook(useRoomNoLight).result.current).toBe(true);
});
it('recognizes flags in imported map rooms and local room flags', () => {
    mapper.preloadedCoordsRef.current['123'] = [0, 0, 0, 'Field', {}, '', '', ['DARK']];
    const view = renderHook(useRoomNoLight);
    expect(view.result.current).toBe(true);
    mapper.preloadedCoordsRef.current = {};
    mapper.rooms.m_123 = { flags: ['DARK'] };
    view.rerender();
    expect(view.result.current).toBe(true);
});
it('allows celestial effects for lit rooms without blocking flags', () => {
    mapper.rooms.m_123 = { light: 2, mobFlags: [] };
    expect(renderHook(useRoomNoLight).result.current).toBe(false);
});
