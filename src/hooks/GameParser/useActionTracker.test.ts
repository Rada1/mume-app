// @vitest-environment jsdom
/**
 * @file useActionTracker.test.ts
 * @description Unit tests for action tracking callbacks including onGet and onDrop.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActionTracker, ActionTrackerDeps } from './useActionTracker';

describe('useActionTracker - onGet and onDrop', () => {
    const createDeps = (overrides: Partial<ActionTrackerDeps> = {}): ActionTrackerDeps => ({
        capture: { hasSession: () => false } as any,
        setInventoryLines: vi.fn(),
        setEqLines: vi.fn(),
        setCharacterInfo: vi.fn(),
        extractNoun: (text: string) => text.split(' ').pop() || '',
        ansiConvert: { toHtml: (s: string) => s },
        onWear: vi.fn(),
        onRemove: vi.fn(),
        onGet: vi.fn(),
        onDrop: vi.fn(),
        ...overrides,
    });

    it('triggers onGet when receiving a "You get ..." line', () => {
        const onGet = vi.fn();
        const deps = createDeps({ onGet });
        const { result } = renderHook(() => useActionTracker(deps));

        result.current.trackAction('You get a steel broadsword.', 'You get a steel broadsword.', 'you get a steel broadsword.');
        expect(onGet).toHaveBeenCalledTimes(1);
    });

    it('triggers onGet when receiving a "You take ..." line', () => {
        const onGet = vi.fn();
        const deps = createDeps({ onGet });
        const { result } = renderHook(() => useActionTracker(deps));

        result.current.trackAction('You take an iron key from a pouch.', 'You take an iron key from a pouch.', 'you take an iron key from a pouch.');
        expect(onGet).toHaveBeenCalledTimes(1);
    });

    it('triggers onGet when receiving a "You pick ..." line', () => {
        const onGet = vi.fn();
        const deps = createDeps({ onGet });
        const { result } = renderHook(() => useActionTracker(deps));

        result.current.trackAction('You pick a mushroom.', 'You pick a mushroom.', 'you pick a mushroom.');
        expect(onGet).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onGet when failing to get an item (e.g. "You can\'t find any knife.")', () => {
        const onGet = vi.fn();
        const deps = createDeps({ onGet });
        const { result } = renderHook(() => useActionTracker(deps));

        result.current.trackAction("You can't find any knife.", "You can't find any knife.", "you can't find any knife.");
        expect(onGet).not.toHaveBeenCalled();

        result.current.trackAction('You cannot take that.', 'You cannot take that.', 'you cannot take that.');
        expect(onGet).not.toHaveBeenCalled();

        result.current.trackAction('It is too heavy for you.', 'It is too heavy for you.', 'it is too heavy for you.');
        expect(onGet).not.toHaveBeenCalled();
    });

    it('triggers onDrop when receiving a "You drop ..." line', () => {
        const onDrop = vi.fn();
        const deps = createDeps({ onDrop });
        const { result } = renderHook(() => useActionTracker(deps));

        result.current.trackAction('You drop a heavy broadsword.', 'You drop a heavy broadsword.', 'you drop a heavy broadsword.');
        expect(onDrop).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onDrop when giving an item', () => {
        const onDrop = vi.fn();
        const deps = createDeps({ onDrop });
        const { result } = renderHook(() => useActionTracker(deps));

        result.current.trackAction('You give a broadsword to an elf.', 'You give a broadsword to an elf.', 'you give a broadsword to an elf.');
        expect(onDrop).not.toHaveBeenCalled();
    });
});
