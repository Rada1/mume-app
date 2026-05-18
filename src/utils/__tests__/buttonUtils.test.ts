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
});
