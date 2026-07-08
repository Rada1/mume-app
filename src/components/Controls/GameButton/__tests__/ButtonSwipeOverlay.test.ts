/**
 * @file ButtonSwipeOverlay.test.ts
 * @description Regression tests for swipe-wheel center action labels.
 */

import { describe, expect, it } from 'vitest';
import { CustomButton } from '../../../../types';
import { toSwipeCenterActionLabel } from '../ButtonSwipeOverlay';

const makeButton = (overrides: Partial<CustomButton>): CustomButton => ({
    id: 'test-button',
    label: 'Test',
    command: 'test',
    setId: 'test',
    actionType: 'command',
    display: 'floating',
    isVisible: true,
    style: {
        x: 0,
        y: 0,
        w: 40,
        h: 40,
        backgroundColor: '#000',
        borderColor: '#fff'
    },
    position: { x: 0, y: 0, w: 40, h: 40 },
    trigger: {
        enabled: false,
        pattern: '',
        isRegex: false,
        autoHide: false,
        duration: 0,
        type: 'show'
    },
    ...overrides
});

describe('toSwipeCenterActionLabel', () => {
    it('shows tactical skill menus as the center action', () => {
        expect(toSwipeCenterActionLabel(makeButton({
            label: 'Warrior',
            command: 'warriorskilllist',
            actionType: 'menu'
        }))).toBe('skills');
    });

    it('shows tactical spell menus as the center action', () => {
        expect(toSwipeCenterActionLabel(makeButton({
            label: 'Mage',
            command: 'magespelllist',
            actionType: 'menu'
        }))).toBe('spells');
    });

    it('keeps non-class menu actions descriptive', () => {
        expect(toSwipeCenterActionLabel(makeButton({
            label: 'Scout',
            command: 'doors',
            actionType: 'menu'
        }))).toBe('doors');
    });

    it('uses the ability name for cast and commune commands', () => {
        expect(toSwipeCenterActionLabel(makeButton({
            label: 'Heal',
            command: "commune 'heal'"
        }))).toBe('heal');
    });
});
