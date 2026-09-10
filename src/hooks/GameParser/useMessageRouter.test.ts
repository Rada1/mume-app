// @vitest-environment jsdom
/**
 * @file useMessageRouter.test.ts
 * @description Unit tests for message routing and weather classification.
 */

import { describe, it, expect } from 'vitest';
import { classifyRoutedMessageType } from './useMessageRouter';

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
