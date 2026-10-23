// @vitest-environment jsdom
/** @file useAliasTargetSuggestions.test.tsx — Alias-aware argument completion preserves server commands. */

import { act, cleanup, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommandSuggestions } from './useCommandSuggestions';
import { useCommandAliasStore } from '../stores/useCommandAliasStore';
import { useRoomStore } from '../stores/useRoomStore';
import { resolveAliasSuggestionCommand } from './aliasSuggestionCommand';

vi.mock('../context/GameContext', () => ({ useVitals: () => ({ groupMembers: [] }) }));
vi.mock('./useRoomDrinkWater', () => ({ useRoomDrinkWater: () => false }));

// --- Fixtures ---
const stableOptions = { abilities: { 'magic missile': 80 }, inventoryLines: [], wornLines: [], practiceSkills: [] };
const setInput = vi.fn();
beforeEach(() => {
    setInput.mockReset();
    useRoomStore.setState({
        chars: {
            1: { id: 1, name: 'Morgundul orc-guard', short: 'a Morgundul orc-guard', keyword: 'guard', type: 'npc', pc: 0 }
        }, items: []
    });
    useCommandAliasStore.setState({ aliases: [
        { name: 'b', expansion: 'bash' },
        { name: 'bb', expansion: 'bash &' },
        { name: 'mm', expansion: "cast 'magic missile'" },
        { name: 'ca', expansion: 'cast' },
        { name: 'c', expansion: 'close exit' },
        { name: '0', expansion: 'say open' },
        { name: 'combo', expansion: 'bash &;kill &' }
    ] });
});
afterEach(() => {
    cleanup();
    useCommandAliasStore.getState().reset();
    useRoomStore.setState({ chars: {}, items: [] });
});
const useSuggestions = (input: string) => useCommandSuggestions({
    ...stableOptions, input, setInput, gameState: 'playing', isMobile: true
});

// --- Target Completion ---
describe('alias argument suggestions', () => {
    it.each(['b ', 'bb '])('offers bash targets and exits for %s', input => {
        const { result } = renderHook(() => useSuggestions(input));
        expect(result.current.showTargetPopup).toBe(true);
        expect(result.current.showCommandPopup).toBe(false);
        expect(result.current.targetSuggestions.map(target => target.value)).toEqual(expect.arrayContaining(['guard', 'exit']));
        act(() => result.current.chooseTargetSuggestion('guard'));
        expect(setInput).toHaveBeenLastCalledWith(`${input}guard`);
    });

    it('filters typed alias targets and retains the alias after selection', () => {
        const { result } = renderHook(() => {
            const [input, updateInput] = useState('b gu');
            return useCommandSuggestions({
                ...stableOptions, input, gameState: 'playing', isMobile: true,
                setInput: value => { setInput(value); updateInput(value); }
            });
        });
        expect(result.current.targetSuggestions.map(target => target.value)).toEqual(['guard']);
        act(() => result.current.chooseTargetSuggestion('guard'));
        const nextInput = setInput.mock.lastCall?.[0] as string;
        expect(nextInput.trim()).toBe('b guard');
        expect(result.current.commandArgumentChips[0]?.value).toBe('guard');
        expect(result.current.mumeCommandMatch.entry?.aliasExpansion).toBe('bash');
    });

    it('uses the full bash target list when an alias ends with a space', () => {
        const alias = renderHook(() => useSuggestions('b '));
        const native = renderHook(() => useSuggestions('bash '));
        expect(alias.result.current.targetSuggestions).toEqual(native.result.current.targetSuggestions);
    });

    it('offers targets after an alias that supplies a complete spell name', () => {
        const { result } = renderHook(() => useSuggestions('mm '));
        expect(result.current.showTargetPopup).toBe(true);
        expect(result.current.showSpellPopup).toBe(false);
        expect(result.current.targetSuggestions.some(target => target.value === 'guard')).toBe(true);
        act(() => result.current.chooseTargetSuggestion('guard'));
        expect(setInput).toHaveBeenLastCalledWith('mm guard');
    });

    it('offers spells for a cast alias and keeps that alias when completing one', () => {
        const { result } = renderHook(() => useSuggestions('ca '));
        expect(result.current.showSpellPopup).toBe(true);
        expect(result.current.spellSuggestions.some(spell => spell.value.toLowerCase() === 'magic missile')).toBe(true);
        act(() => result.current.chooseSpellSuggestion('magic missile'));
        expect(setInput).toHaveBeenLastCalledWith("ca 'magic missile'");
    });

    it.each(['c ', '0 ', 'combo '])('does not offer unrelated targets for %s', input => {
        const { result } = renderHook(() => useSuggestions(input));
        expect(result.current.showTargetPopup).toBe(false);
        expect(result.current.showSpellPopup).toBe(false);
        expect(result.current.targetSuggestions).toEqual([]);
    });

    it('resolves built-in abbreviations inside alias expansions', () => {
        expect(resolveAliasSuggestionCommand('bas', ' gu')).toMatchObject({ command: 'bash gu', token: 'bash' });
        expect(resolveAliasSuggestionCommand("c 'magic missile'", ' gu')).toMatchObject({
            command: "cast 'magic missile' gu", argumentText: ' gu'
        });
    });
});
