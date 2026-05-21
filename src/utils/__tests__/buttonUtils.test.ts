/**
 * @file buttonUtils.test.ts
 * @description Regression tests for button command resolution.
 */

import { describe, expect, it } from 'vitest';
import { CustomButton } from '../../types';
import { getButtonCommand } from '../buttonUtils';

// --- Logic Section ---

const makeButton = (command: string): CustomButton => ({
    id: 'test-hit',
    label: 'Hit',
    command,
    setId: 'tactical',
    actionType: 'command',
    display: 'floating',
    style: {},
    position: { x: 0, y: 0, w: 80, h: 40 },
    isVisible: true
});

const makeDoorButton = (): CustomButton => ({
    ...makeButton('doors'),
    id: 'tactical-doors',
    label: 'Doors',
    swipeCommands: { up: 'open', down: 'close', left: 'lock', right: 'unlock', sw: 'knock' }
});

describe('getButtonCommand', () => {
    it('places command prefixes before the resolved button command and target', () => {
        const result = getButtonCommand(
            makeButton('hit'),
            0,
            0,
            undefined,
            undefined,
            [],
            { currentDir: null, isTargetModifierActive: true },
            'man',
            false,
            ['order followers']
        );

        expect(result?.cmd).toBe('order followers hit man');
    });

    it('defaults tactical door swipe actions to exit when no target is supplied', () => {
        const result = getButtonCommand(
            makeDoorButton(),
            0,
            -30,
            undefined,
            undefined,
            [],
            { currentDir: null, isTargetModifierActive: false },
            null
        );

        expect(result?.cmd).toBe('open exit');
    });

    it('uses the supplied target for tactical door swipe actions', () => {
        const result = getButtonCommand(
            makeDoorButton(),
            0,
            -30,
            undefined,
            undefined,
            [],
            { currentDir: null, isTargetModifierActive: false },
            'north'
        );

        expect(result?.cmd).toBe('open north');
    });

    it('resolves fallback targets when context is supplied', () => {
        const result = getButtonCommand(
            makeButton('pick %n|exit'),
            0,
            0,
            'exit west',
            undefined,
            [],
            { currentDir: null, isTargetModifierActive: false },
            null
        );

        expect(result?.cmd).toBe('pick exit west');
    });

    it('uses fallback targets when no context is supplied', () => {
        const result = getButtonCommand(
            makeButton("cast 'block door' %n|exit"),
            0,
            0,
            undefined,
            undefined,
            [],
            { currentDir: null, isTargetModifierActive: false },
            null
        );

        expect(result?.cmd).toBe("cast 'block door' exit");
    });

    it('uses target modifier as fallback target without appending it twice', () => {
        const result = getButtonCommand(
            makeButton('pick %n|exit'),
            0,
            0,
            undefined,
            undefined,
            [],
            { currentDir: null, isTargetModifierActive: true },
            'exit west'
        );

        expect(result?.cmd).toBe('pick exit west');
    });

    it('decodes escaped apostrophes in spell commands', () => {
        const result = getButtonCommand(
            makeButton('cast &apos;magic missile&apos;'),
            0,
            0
        );

        expect(result?.cmd).toBe("cast 'magic missile'");
    });
});
