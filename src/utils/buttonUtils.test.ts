/** @file buttonUtils.test.ts — Tests tactical swipe command target and direction composition. */
import { describe, expect, it } from 'vitest';
import type { CustomButton } from '../types';
import { getButtonCommand } from './buttonUtils';

describe('getButtonCommand tactical door targeting', () => {
    const doorsButton = {
        id: 'tactical-doors',
        command: 'doors',
        style: {},
        swipeCommands: { down: 'close' }
    } as CustomButton;

    it('uses exit as the default target before appending a direction', () => {
        const result = getButtonCommand(
            doorsButton,
            0,
            30,
            undefined,
            undefined,
            [],
            { currentDir: 'w', isTargetModifierActive: false },
            null
        );

        expect(result?.cmd).toBe('close exit west');
    });

    it('keeps an explicitly selected target before appending a direction', () => {
        const result = getButtonCommand(
            doorsButton,
            0,
            30,
            undefined,
            undefined,
            [],
            { currentDir: 'w', isTargetModifierActive: false },
            'exit'
        );

        expect(result?.cmd).toBe('close exit west');
    });
});
