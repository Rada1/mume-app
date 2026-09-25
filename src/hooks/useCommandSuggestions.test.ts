// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandSuggestions } from './useCommandSuggestions';
import { useRoomStore } from '../stores/useRoomStore';

describe('useCommandSuggestions', () => {
    beforeEach(() => {
        useRoomStore.setState({
            chars: {
                1: { id: 1, name: 'Cave Orc', type: 'enemy', short: 'a snarling cave orc', pc: 0 } as any,
                2: { id: 2, name: 'Forest Troll', type: 'enemy', short: 'a hulking forest troll', pc: 0 } as any
            }
        });
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
});
