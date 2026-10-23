// @vitest-environment jsdom
/** @file useMountObjectCommands.test.tsx — Ensures selected cargo resolves to the correct mount and object. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';
import type { InteractionDeps } from './useInteractionHandlers';
import { useButtonClicks } from './interactions/useButtonClicks';
import { useUnifiedCommandActions } from './useUnifiedCommandActions';
import { getMountObjectTargets } from '../objects/mountObjectTargets';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { toGearRow } from '../utils/gearPanelUtils';
import type { GearRow, PopoverState } from '../types';

vi.mock('../context/GameContext', () => ({
    useGame: () => ({ btn: { buttons: [] }, entities: {}, roomNpcs: [], roomPlayers: [], inlineCategories: [] }),
    useVitals: () => ({ groupMembers: [] })
}));
afterEach(() => { cleanup(); vi.useRealTimers(); });

// --- Cargo Selection and Execution ---
describe('mount object commands', () => {
    it('keeps duplicate items individually addressable on the selected mount', () => {
        const mount: CommandActionTargetEntry = { id: 'roomchars:17', label: 'horse', context: '2.horse', keyword: '2.horse',
            category: 'cat-mount', group: 'npcs', scope: 'room' };
        const rows = [1, 2].map(id => toGearRow({ id: String(id), text: 'a leather bag', html: '', isItem: true }))
            .filter((row): row is GearRow => row !== null);
        const entries = getMountObjectTargets(mount, rows, 'mount:17');
        expect(entries.map(entry => entry.context)).toEqual(['1.bag', '2.bag']);
        expect(entries.map(entry => entry.parentNoun)).toEqual(['2.horse', '2.horse']);
        expect(new Set(entries.map(entry => entry.id)).size).toBe(2);
    });

    it.each([
        { context: '2.bag', name: 'leather bag', trait: 'Mount Object', template: 'unsaddle %p %n', command: 'unsaddle 2.horse 2.bag' },
        { context: 'saddle', name: 'leather saddle', trait: 'Saddle', template: 'unsaddle %p', command: 'unsaddle 2.horse' }
    ])('sends $command from the $trait trait without an automatic get', ({ context, name, trait, template, command }) => {
        vi.useFakeTimers();
        const selected: PopoverState = { x: 0, y: 0, category: 'cat-mount-object', setId: 'cat-mount-object',
            entityId: 'mount:17:cargo:2', context, parentNoun: '2.horse', displayName: name };
        const { result: actions } = renderHook(() => useUnifiedCommandActions(selected, 'selected', selected.context || null));
        expect(actions.current.actionGroups.map(group => group.section.label)).toEqual([trait]);
        const button = actions.current.actionGroups[0].buttons[0];
        expect(button.command).toBe(template);
        const executeCommand = vi.fn();
        const deps = { executeCommand, initAudio: vi.fn(), triggerHaptic: vi.fn(), btn: { isEditMode: false },
            joystick: {}, viewport: { isMobile: false }, keywordOverrides: {}, popoverState: selected,
            setPopoverState: vi.fn(), setInput: vi.fn(), setCommandPreview: vi.fn(), target: 'unrelated' } as unknown as InteractionDeps;
        const { result } = renderHook(() => useButtonClicks(deps));
        const event = { stopPropagation: vi.fn(), currentTarget: null } as unknown as React.MouseEvent;
        act(() => result.current.handleButtonClick(button, event, selected.context, undefined, selected.parentNoun));
        expect(executeCommand).toHaveBeenCalledTimes(1);
        expect(executeCommand.mock.calls[0][0]).toBe(command);
    });

    it.each(['cat-inventory-object', 'cat-room-object', 'cat-worn-object'])('offers Saddle only in inventory: %s', category => {
        const selected: PopoverState = { x: 0, y: 0, category, setId: category, entityId: 'saddle-item', context: 'saddle' };
        const { result } = renderHook(() => useUnifiedCommandActions(selected, 'selected', 'saddle'));
        const saddle = result.current.actionGroups.find(group => group.section.key === 'trait-saddle');
        if (category === 'cat-inventory-object') {
            expect(saddle?.buttons.map(button => button.command)).toEqual(['saddle mount']);
        } else expect(saddle).toBeUndefined();
    });
});
