// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';

vi.mock('../context/GameContext', async importOriginal => {
    const actual = await importOriginal<typeof import('../context/GameContext')>();
    const groupMembers: never[] = [];
    return { ...actual, useVitals: () => ({ groupMembers }) };
});
vi.mock('./useRoomDrinkWater', () => ({ useRoomDrinkWater: () => false }));
import { useCommandSuggestions } from './useCommandSuggestions';
import { useRoomStore } from '../stores/useRoomStore';

const stableEmptyDependencies = { abilities: {}, inventoryLines: [], wornLines: [], practiceSkills: [] };

describe('useCommandSuggestions', () => {
    beforeEach(() => {
        useRoomStore.setState({
            rawExits: {}, items: [],
            chars: {
                1: { id: 1, name: 'Cave Orc', type: 'enemy', short: 'a snarling cave orc', pc: 0 } as any,
                2: { id: 2, name: 'Forest Troll', type: 'enemy', short: 'a hulking forest troll', pc: 0 } as any
            }
        });
    });

    it('keeps a locked target available ahead of valid Bash action targets', () => {
        useRoomStore.setState({
            chars: { 1: { id: 1, name: 'a town guard', type: 'npc' } },
            items: [{ id: 2, name: 'a stone', type: 'object' }],
            rawExits: { n: { name: 'gate', flags: ['closed'] }, s: 42 }
        });
        const { result } = renderHook(() => useCommandSuggestions({
            ...stableEmptyDependencies, input: 'bash', setInput: () => {}, gameState: 'playing',
            abilities: { bash: 80 }, preferredTarget: 'stone'
        }));
        act(() => result.current.setIsFocused(true));
        expect(result.current.showTargetPopup).toBe(true);
        expect(result.current.targetSuggestions.map(entry => entry.value)).toEqual(['stone', 'guard', 'exit n']);
        expect(result.current.targetSuggestions[0]).toMatchObject({ value: 'stone', isCurrentTarget: true, meta: 'selected-target' });
    });

    it('computes commandTextParts autocomplete suffix when typing command prefix', () => {
        let input = 'l';
        const setInput = (val: string) => { input = val; };

        const { result } = renderHook(() =>
            useCommandSuggestions({
                input,
                setInput,
                gameState: 'playing',
                isPasswordMode: false,
                currentMode: 'command'
            })
        );

        expect(result.current.commandTextParts).not.toBeNull();
        expect(result.current.commandTextParts?.token).toBe('l');
        expect(result.current.commandTextParts?.autocomplete).toBe('ook');
        expect(result.current.commandTextParts?.isValid).toBe(true);
    });

    it('computes autocomplete for score prefix "sc"', () => {
        let input = 'sc';
        const setInput = (val: string) => { input = val; };

        const { result } = renderHook(() =>
            useCommandSuggestions({
                input,
                setInput,
                gameState: 'playing',
                isPasswordMode: false,
                currentMode: 'command'
            })
        );

        expect(result.current.commandTextParts?.token).toBe('sc');
        expect(result.current.commandTextParts?.autocomplete).toBe('ore');
        expect(result.current.commandTextParts?.isValid).toBe(true);
    });

    it.each([
        ['bas', 'var(--ansi-bright-red, #f87171)'],
        ["cast 'fireball'", 'var(--ansi-bright-red, #f87171)'],
        ["cast 'cure serious'", 'var(--ansi-bright-cyan, #38bdf8)']
    ])('shares action colors with the typed command overlay for %s', (input, expected) => {
        const { result } = renderHook(() => useCommandSuggestions({
            ...stableEmptyDependencies, input, setInput: () => {}, gameState: 'playing'
        }));
        expect(result.current.commandTextColor).toBe(expected);
    });

    it('disables suggestion during password mode or account mode', () => {
        let input = 'l';
        const setInput = (val: string) => { input = val; };

        const { result } = renderHook(() =>
            useCommandSuggestions({
                input,
                setInput,
                gameState: 'account',
                isPasswordMode: false,
                currentMode: 'command'
            })
        );

        expect(result.current.commandTextParts).toBeNull();
    });

    it('suggests targets when typing command with space', () => {
        let input = 'kill o';
        const setInput = (val: string) => { input = val; };

        const { result } = renderHook(() =>
            useCommandSuggestions({
                input,
                setInput,
                gameState: 'playing',
                isPasswordMode: false,
                currentMode: 'command'
            })
        );

        expect(result.current.targetSuggestions.length).toBeGreaterThan(0);
        expect(result.current.targetSuggestions[0].value).toBe('*Cave*');
        expect(result.current.targetSuggestions[0].label.toLowerCase()).toContain('orc');
    });

    it.each(['look ', 'examine ', 'consider '])('%s orders room targets by enemy, NPC, ally, and object', input => {
        useRoomStore.setState({
            chars: {
                1: { id: 1, name: 'a town guard', keyword: 'guard', type: 'npc', pc: false },
                2: { id: 2, name: '*a cave troll*', keyword: '*troll*', type: 'enemy', pc: false },
                3: { id: 3, name: 'Elrond', keyword: 'elrond', type: 'ally', pc: true }
            },
            items: [{ id: 4, name: 'a stone statue', keyword: 'statue', type: 'object' }]
        });
        const { result } = renderHook(() => useCommandSuggestions({
            ...stableEmptyDependencies, input, setInput: () => {}, gameState: 'playing'
        }));
        const roomEntities = result.current.targetSuggestions.filter(entry =>
            ['enemy', 'npc', 'ally', 'object'].includes(entry.meta));

        expect(roomEntities.map(entry => entry.meta)).toEqual(['enemy', 'npc', 'ally', 'object']);
        expect(roomEntities.map(entry => entry.value)).toEqual(['*troll*', 'guard', 'elrond', 'statue']);
    });

    it('keeps the global target out of suggestions for an unrecognized bare command', () => {
        let insertedInput = '';
        const { result } = renderHook(() => useCommandSuggestions({
            input: 'bdl',
            setInput: value => { insertedInput = value; },
            gameState: 'playing',
            currentMode: 'command',
            preferredTarget: '*man*'
        }));

        act(() => result.current.setIsFocused(true));

        expect(result.current.showTargetPopup).toBe(false);
        expect(result.current.targetSuggestions).toEqual([]);
        act(() => {
            const prevented = result.current.handleSuggestionKeyDown({
                key: 'Tab', preventDefault: () => {}, location: 0, code: 'Tab'
            } as any);
            expect(prevented).toBe(false);
        });
        expect(insertedInput).toBe('');
    });

    it('does not append a target when Tab is pressed on a bare action command', () => {
        let insertedInput = '';
        const { result } = renderHook(() => useCommandSuggestions({
            input: 'bash',
            setInput: value => { insertedInput = value; },
            gameState: 'playing',
            currentMode: 'command',
            abilities: { bash: 80 },
            preferredTarget: '*Cave*'
        }));

        act(() => result.current.setIsFocused(true));

        expect(result.current.showTargetPopup).toBe(true);
        expect(result.current.targetSuggestions[0]).toMatchObject({ value: '*Cave*', isCurrentTarget: true });
        act(() => {
            result.current.handleSuggestionKeyDown({
                key: 'Tab', preventDefault: () => {}, location: 0, code: 'Tab'
            } as any);
        });
        expect(insertedInput).not.toContain('*Cave*');
    });

    it('retains the chosen NPC classification when accepting a prioritized argument suggestion', () => {
        useRoomStore.setState({ chars: { 1: { id: 1, name: 'a town guard', type: 'npc' } } });
        const { result } = renderHook(() => {
            const [input, setInput] = useState('bash ');
            return useCommandSuggestions({ ...stableEmptyDependencies, input, setInput,
                gameState: 'playing', preferredTarget: 'guard' });
        });
        act(() => result.current.chooseTargetSuggestion('guard'));
        const chip = result.current.commandArgumentChips[0];
        expect(chip.value).toBe('guard');
        expect(chip.suggestions.find(entry => entry.value === chip.value)).toMatchObject({ category: 'cat-npc' });
    });

    it('keeps the global target out of suggestions for a recognized bare command', () => {
        const { result } = renderHook(() => useCommandSuggestions({
            input: 'look',
            setInput: () => {},
            gameState: 'playing',
            currentMode: 'command',
            preferredTarget: '*man*'
        }));

        act(() => result.current.setIsFocused(true));

        expect(result.current.showTargetPopup).toBe(false);
        expect(result.current.targetSuggestions).toEqual([]);
    });

    it('keeps the locked target available when it is absent from the room suggestions', () => {
        useRoomStore.setState({ chars: {}, items: [], rawExits: {} });
        const { result } = renderHook(() => useCommandSuggestions({
            input: 'look ',
            setInput: () => {},
            gameState: 'playing',
            currentMode: 'command',
            preferredTarget: '*faraway*'
        }));

        act(() => result.current.setIsFocused(true));

        expect(result.current.showTargetPopup).toBe(true);
        expect(result.current.targetSuggestions[0]).toMatchObject({
            value: '*faraway*', isCurrentTarget: true, meta: 'selected-target'
        });
    });

    it('moves a matching selected target ahead of the other target suggestions', () => {
        const { result } = renderHook(() => useCommandSuggestions({
            input: 'kill ',
            setInput: () => {},
            gameState: 'playing',
            currentMode: 'command',
            preferredTarget: '*Forest*'
        }));

        act(() => result.current.setIsFocused(true));

        expect(result.current.targetSuggestions.map(suggestion => suggestion.value)).toEqual(['*Forest*', '*Cave*']);
        expect(result.current.selectedTargetSuggestion?.value).toBe('*Forest*');
    });
    it('does not offer the selected-target fallback when a command argument is already typed', () => {
        const { result } = renderHook(() => useCommandSuggestions({
            input: 'bdl man',
            setInput: () => {},
            gameState: 'playing',
            currentMode: 'command',
            preferredTarget: '*man*'
        }));

        act(() => result.current.setIsFocused(true));

        expect(result.current.showTargetPopup).toBe(false);
        expect(result.current.targetSuggestions).toEqual([]);
    });
    it('uses carried items for wear and worn items for remove', () => {
        const inventoryLines = [{ id: 'inv-1', text: 'a sable pouch', html: '', isItem: true, context: 'pouch' }];
        const wornLines = [{ id: 'eq-1', text: 'a dark cloak', html: '', isItem: true, context: 'cloak' }];
        const options = { setInput: () => {}, gameState: 'playing' as const, inventoryLines, wornLines };

        const wear = renderHook(({ input }) => useCommandSuggestions({ ...options, input }), {
            initialProps: { input: 'wea ' }
        });
        expect(wear.result.current.targetSuggestions).toEqual([
            expect.objectContaining({ value: 'pouch', meta: 'inventory' })
        ]);

        const remove = renderHook(({ input }) => useCommandSuggestions({ ...options, input }), {
            initialProps: { input: 'rem ' }
        });
        expect(remove.result.current.targetSuggestions).toEqual([
            expect.objectContaining({ value: 'cloak', meta: 'worn' })
        ]);
        remove.rerender({ input: 'remove ' });
        expect(remove.result.current.targetSuggestions[0]).toMatchObject({ value: 'cloak', meta: 'worn' });
    });

    it('completes predicted command when Tab is pressed', () => {
        let input = 'l';
        let latestInput = input;
        const setInput = (val: string) => { latestInput = val; };

        const { result } = renderHook(() =>
            useCommandSuggestions({
                input,
                setInput,
                gameState: 'playing',
                isPasswordMode: false,
                currentMode: 'command'
            })
        );

        act(() => {
            const prevented = result.current.handleSuggestionKeyDown({
                key: 'Tab',
                preventDefault: () => {},
                location: 0,
                code: 'Tab'
            } as any);
            expect(prevented).toBe(true);
        });

        expect(latestInput).toBe('look ');
    });

    it('defaults placement to "top" on mobile and "bottom" on desktop', () => {
        let input = 'l';
        const setInput = (val: string) => { input = val; };

        const desktop = renderHook(() =>
            useCommandSuggestions({
                input,
                setInput,
                gameState: 'playing',
                isMobile: false
            })
        );
        expect(desktop.result.current.placement).toBe('bottom');

        const mobile = renderHook(() =>
            useCommandSuggestions({
                input,
                setInput,
                gameState: 'playing',
                isMobile: true
            })
        );
        expect(mobile.result.current.placement).toBe('top');

        const explicit = renderHook(() =>
            useCommandSuggestions({
                input,
                setInput,
                gameState: 'playing',
                isMobile: true,
                placement: 'bottom'
            })
        );
        expect(explicit.result.current.placement).toBe('bottom');
    });

    it('calculates popup positioning without error when focused with wrapRef', () => {
        const dummyElement = document.createElement('div');
        dummyElement.getBoundingClientRect = () => ({
            top: 200,
            bottom: 240,
            left: 50,
            right: 250,
            width: 200,
            height: 40,
            x: 50,
            y: 200,
            toJSON: () => {}
        });
        const wrapRef = { current: dummyElement };

        const { result } = renderHook(() =>
            useCommandSuggestions({
                ...stableEmptyDependencies,
                input: 'l',
                setInput: () => {},
                gameState: 'playing',
                wrapRef,
                isMobile: true
            })
        );

        act(() => {
            result.current.setIsFocused(true);
        });

        expect(result.current.showCompletionPopup).toBe(true);
        expect(result.current.popupStyle.transform).toBe('translateY(-100%)');
        expect(result.current.popupStyle.top).toBeDefined();
    });

    it.each(['legacy', 'strip'])('places suggestions beside the visible %s command bar', layout => {
        const map = document.createElement('div');
        map.className = 'map-drawer-desktop open';
        map.getBoundingClientRect = () => ({
            top: 0, bottom: 600, left: 80, right: 580, width: 500, height: 600,
            x: 80, y: 0, toJSON: () => {}
        });
        document.body.appendChild(map);
        const input = document.createElement('div');
        input.getBoundingClientRect = () => ({
            top: 540, bottom: 570, left: 600, right: 800, width: 200, height: 30,
            x: 600, y: 540, toJSON: () => {}
        });
        const commandBar = document.createElement('div');
        commandBar.className = layout === 'strip' ? 'command-dock-input-main' : 'message-log-docked-input';
        commandBar.getBoundingClientRect = () => ({
            top: 530, bottom: 585, left: 590, right: 900, width: 310, height: 55,
            x: 590, y: 530, toJSON: () => {}
        });
        commandBar.appendChild(input);
        if (layout === 'strip') {
            const shell = document.createElement('div');
            shell.className = 'message-log-docked-input command-dock-row';
            shell.style.display = 'contents';
            shell.appendChild(commandBar);
        }
        const wrapRef = { current: input };

        const { result, unmount } = renderHook(() => useCommandSuggestions({
            ...stableEmptyDependencies,
            input: 'look', setInput: () => {}, gameState: 'playing',
            wrapRef, placement: 'top', positionOverMap: true
        }));
        act(() => result.current.setIsFocused(true));

        expect(result.current.popupStyle.left).toBe(252);
        expect(result.current.popupStyle.width).toBe(320);
        expect(result.current.popupStyle.top).toBe(585);
        expect(result.current.popupStyle.transform).toBe('translateY(-100%)');
        unmount();
        map.remove();
    });
});
