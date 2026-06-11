/**
 * @file logGmcpParser.test.ts
 * @description Tests GMCP text extraction does not consume ordinary log lines.
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLogGmcpParser } from '../useLogGmcpParser';

const createDeps = () => ({
    setSpectateWaiting: () => {},
    setSpectateCharacterName: () => {},
    spectateCharacterName: null,
    setRoomName: () => {},
    setRoomDesc: () => {},
    setRoomZone: () => {},
    setRoomNum: () => {},
    setCurrentTerrain: () => {},
    setRoomExits: () => {},
    characterName: 'Ellessar',
    mapperRef: { current: null }
});

describe('useLogGmcpParser', () => {
    it('does not consume mail subjects containing GMCP Module', () => {
        const { result } = renderHook(() => useLogGmcpParser(createDeps()));

        expect(result.current.parseLogGmcp('5+: Object GMCP Module Request @Dain (Ellessar)')).toBe(false);
    });
});
