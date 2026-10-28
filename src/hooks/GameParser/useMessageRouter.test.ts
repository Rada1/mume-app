// @vitest-environment jsdom
/**
 * @file useMessageRouter.test.ts
 * @description Unit tests for message routing and weather classification.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { classifyRoutedMessageType, isVisibleDuringSuppressedCapture, useMessageRouter } from './useMessageRouter';
import type { GmcpOccupant } from '../../types';

describe('useMessageRouter - classifyRoutedMessageType', () => {
    it('classifies messages with <weather> tags as weather', () => {
        const type = classifyRoutedMessageType(
            'game',
            'It starts to rain heavily.',
            'it starts to rain heavily.',
            '<weather>It starts to rain heavily.</weather>',
            '',
            false,
            false
        );
        expect(type).toBe('weather');
    });

    it('classifies environment event lines as weather', () => {
        const lines = [
            'It starts to rain.',
            'The rain stops.',
            'It starts to snow.',
            'The clouds disappear.',
            'Thick fog covers the area.',
            'A flash of lightning illuminates the sky.',
            'The sun rises in the east.',
            'The sun begins to set.',
            'The sun dips below the western horizon, leaving the city in darkness. You feel hopeful as the Star of Eärendil shines on the horizon!',
            'The last light of the sun fades.',
            'The light of the sun returns.'
        ];

        for (const line of lines) {
            const type = classifyRoutedMessageType(
                'game',
                line,
                line.toLowerCase(),
                line,
                '',
                false,
                false
            );
            expect(type).toBe('weather');
        }
    });

    it('leaves standard game messages as their original type', () => {
        const type = classifyRoutedMessageType(
            'game',
            'You open the wooden door.',
            'you open the wooden door.',
            'You open the wooden door.',
            '',
            false,
            false
        );
        expect(type).toBe('game');
    });
});

describe('capture visibility', () => {
    it('keeps the server prompt visible while suppressing score response text', () => {
        expect(isVisibleDuringSuppressedCapture(true, false, false)).toBe(true);
        expect(isVisibleDuringSuppressedCapture(false, false, false)).toBe(false);
    });
});

describe('room item detection', () => {
    it('counts a tagged food appearance once, while keeping the plain-text fallback', () => {
        let items: GmcpOccupant[] = [];
        const deps = {
            capture: { hasSession: () => false },
            setRoomItems: (update: (previous: GmcpOccupant[]) => GmcpOccupant[]) => { items = update(items); },
            setDiscoveredItems: vi.fn(), registerEntity: vi.fn(), extractNoun: (name: string) => name,
            isSpectateMode: false
        } as unknown as Parameters<typeof useMessageRouter>[0];
        const { result } = renderHook(() => useMessageRouter(deps));
        const line = 'A magic mushroom suddenly appears.';

        result.current.detectItemsInRoom(line, 'A <object>magic mushroom</object> suddenly appears.', false);
        expect(items.map(item => item.name)).toEqual(['magic mushroom']);

        items = [];
        result.current.detectItemsInRoom(line, line, false);
        expect(items.map(item => item.name)).toEqual(['magic mushroom']);
    });
});
