// @vitest-environment jsdom
/**
 * @file useDeckTransferTargeting.test.ts
 * @description Verifies staged object and destination selection for get, put, and give.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { PointerEvent } from 'react';
import type { DeckItem } from './useDeckTargeting';
import { useDeckTargeting } from './useDeckTargeting';
import { useRoomStore } from '../../stores/useRoomStore';
import type { DrawerLine } from '../../types';

// --- Logic Section ---
const openMenuFor = (result: { current: ReturnType<typeof useDeckTargeting> }, item: DeckItem) => {
    act(() => {
        result.current.handlePointerDown(item, { buttons: 1, pointerType: 'touch' } as PointerEvent<HTMLButtonElement>);
        vi.advanceTimersByTime(230);
    });
};

describe('useDeckTargeting staged transfers', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useRoomStore.setState({
            chars: { 1: { name: 'Town Guard', keyword: 'guard', type: 'npc', pc: false } },
            items: [
                { id: 'knife', name: 'knife', short: 'a knife', keyword: 'knife', type: 'object' },
                { id: 'pack', name: 'pack', short: 'a leather pack', keyword: 'pack', type: 'container' }
            ]
        });
    });

    afterEach(() => vi.useRealTimers());

    it('loads a selected Get container before offering its contents, then sends item before source', () => {
        const executeCommand = vi.fn();
        const requestContainerContents = vi.fn();
        const item: DeckItem = { label: 'Get', cmd: 'get ', needsTarget: true, targetKind: 'room-object-container' };
        const { result, rerender } = renderHook(({ containerContents }: { containerContents: Record<string, DrawerLine[]> }) => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand, flashPressed: vi.fn(), fire: vi.fn(),
            containerContents, requestContainerContents
        }), { initialProps: { containerContents: {} } });

        openMenuFor(result, item);
        expect(result.current.targetSuggestions?.map(suggestion => suggestion.value)).toContain('knife');
        expect(result.current.selectedSecondArgument).toBe('__room__');
        const pack = result.current.secondArgumentSuggestions.find(suggestion => suggestion.value === 'pack');
        expect(pack).toBeDefined();
        act(() => result.current.handleSelectTarget('pack', false, 1, pack));

        expect(requestContainerContents).toHaveBeenCalledWith(pack);
        expect(result.current.selectedFirstArgument).toBeNull();
        expect(result.current.isLoadingFirstArgument).toBe(true);
        expect(result.current.firstArgumentSuggestions).toEqual([]);

        const pumpkin: DrawerLine = { id: 'pumpkin-1', text: 'a pumpkin', html: 'a pumpkin', context: 'pumpkin', isItem: true };
        rerender({ containerContents: { [pack!.containerId!]: [pumpkin] } });
        expect(result.current.isLoadingFirstArgument).toBe(false);
        expect(result.current.firstArgumentSuggestions.map(suggestion => suggestion.value)).toContain('pumpkin');

        const pumpkinTarget = result.current.firstArgumentSuggestions.find(suggestion => suggestion.value === 'pumpkin');
        act(() => result.current.handleSelectTarget('pumpkin', false, 0, pumpkinTarget));
        expect(executeCommand).toHaveBeenCalledWith('get pumpkin pack');
        expect(result.current.isTargetMenuOpen).toBe(false);
    });

    it('defaults Get to Room and sends the one-argument command without looking in Room', () => {
        const executeCommand = vi.fn();
        const requestContainerContents = vi.fn();
        const item: DeckItem = { label: 'Get', cmd: 'get ', needsTarget: true, targetKind: 'room-object-container' };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand, flashPressed: vi.fn(), fire: vi.fn(), requestContainerContents
        }));

        openMenuFor(result, item);
        act(() => result.current.handleSelectTarget('knife', false, 0));

        expect(executeCommand).toHaveBeenCalledWith('get knife');
        expect(requestContainerContents).not.toHaveBeenCalled();
    });

    it('requests contents every time a Get container is selected', () => {
        const requestContainerContents = vi.fn();
        const item: DeckItem = { label: 'Get', cmd: 'get ', needsTarget: true, targetKind: 'room-object-container' };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand: vi.fn(), flashPressed: vi.fn(), fire: vi.fn(), requestContainerContents
        }));
        openMenuFor(result, item);
        const pack = result.current.secondArgumentSuggestions.find(suggestion => suggestion.value === 'pack');
        expect(pack).toBeDefined();

        act(() => result.current.handleSelectTarget('pack', false, 1, pack));
        act(() => result.current.handleSelectTarget('__room__', false, 1));
        act(() => result.current.handleSelectTarget('pack', false, 1, pack));

        expect(requestContainerContents).toHaveBeenCalledTimes(2);
    });

    it('lets Put choose an inventory object and then a container', () => {
        const executeCommand = vi.fn();
        const inventoryLines: DrawerLine[] = [
            { id: 'sword-1', text: 'a sword', html: '', context: 'sword', isItem: true },
            { id: 'pack-1', text: 'a leather pack', html: '', context: 'pack', isItem: true, isContainer: true }
        ];
        const item: DeckItem = { label: 'Put', cmd: 'put ', needsTarget: true, targetKind: 'inventory-container' };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand, flashPressed: vi.fn(), fire: vi.fn(), inventoryLines
        }));

        openMenuFor(result, item);
        expect(result.current.targetSuggestions?.map(suggestion => suggestion.value)).toContain('sword');
        act(() => result.current.handleSelectTarget('sword'));
        expect(result.current.targetMenuTitle).toBe('SELECT ARGUMENTS');
        expect(result.current.targetSuggestions?.map(suggestion => suggestion.value)).toContain('pack');
        act(() => result.current.handleSelectTarget('pack'));

        expect(executeCommand).toHaveBeenCalledWith('put sword pack');
    });
});
