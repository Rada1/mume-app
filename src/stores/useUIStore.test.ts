/**
 * @file useUIStore.test.ts
 * @description Verifies popover state updates used by inline inspection captures.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { useUIStore } from './useUIStore';

// --- Tests Section ---

afterEach(() => useUIStore.getState().setPopoverState(null));

describe('setPopoverState', () => {
    it('applies functional updates to the current popover', () => {
        const store = useUIStore.getState();
        store.setPopoverState({ x: 10, y: 20, setId: 'inline-ally', context: 'Ryon' });

        store.setPopoverState(current => current ? {
            ...current,
            isCapturingWhois: true,
            whoisTarget: current.context
        } : null);

        expect(useUIStore.getState().popoverState).toMatchObject({
            context: 'Ryon',
            isCapturingWhois: true,
            whoisTarget: 'Ryon'
        });

        store.setPopoverState(current => current ? {
            ...current,
            isCapturingWhois: false,
            capturedWhoisLines: ['Ryon is a Man Adventurer.']
        } : null);

        expect(useUIStore.getState().popoverState).toMatchObject({
            isCapturingWhois: false,
            capturedWhoisLines: ['Ryon is a Man Adventurer.']
        });
    });
});
