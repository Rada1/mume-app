import { afterEach, describe, expect, it } from 'vitest';
import {
    clearCommandTargetMemory,
    getRememberedCommandTarget,
    rememberCommandTarget,
    setGlobalCommandTarget,
} from './commandTargetMemory';
import { useVitalsStore } from '../stores/useVitalsStore';

describe('command target memory', () => {
    afterEach(() => {
        clearCommandTargetMemory();
        useVitalsStore.getState().setTarget(null);
    });

    it('keeps targets separate for different commands', () => {
        rememberCommandTarget('hit', 'Pony');
        rememberCommandTarget("cast 'fireball'", 'Wolf');

        expect(getRememberedCommandTarget('hit Pony')).toBe('Pony');
        expect(getRememberedCommandTarget("cast 'fireball' Wolf")).toBe('Wolf');
    });

    it('applies a global target to all compatible commands', () => {
        rememberCommandTarget('hit', 'Pony');
        rememberCommandTarget("cast 'fireball'", 'Wolf');
        setGlobalCommandTarget('Orc');

        expect(getRememberedCommandTarget('hit')).toBe('Orc');
        expect(getRememberedCommandTarget("cast 'fireball'")).toBe('Orc');
        expect(getRememberedCommandTarget("cast 'armour'")).toBeNull();
        expect(getRememberedCommandTarget('ride')).toBeNull();
    });

    it('lets a command menu override the global target until it changes again', () => {
        setGlobalCommandTarget('Orc');
        rememberCommandTarget('hit', 'Pony');

        expect(getRememberedCommandTarget('hit')).toBe('Pony');
        expect(getRememberedCommandTarget('kick')).toBe('Orc');

        setGlobalCommandTarget('Wolf');
        expect(getRememberedCommandTarget('hit')).toBe('Wolf');
        expect(getRememberedCommandTarget('kick')).toBe('Wolf');
    });

    it('routes an NPC global target to room-target commands but not self-only commands', () => {
        useVitalsStore.getState().setTarget('Orc');

        expect(getRememberedCommandTarget('hit')).toBe('Orc');
        expect(getRememberedCommandTarget("cast 'fireball'")).toBe('Orc');
        expect(getRememberedCommandTarget("cast 'armour'")).toBeNull();
    });
});
