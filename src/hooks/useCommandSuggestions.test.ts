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
});

