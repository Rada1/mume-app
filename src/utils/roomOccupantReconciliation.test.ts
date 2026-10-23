/** @file roomOccupantReconciliation.test.ts — Checks text arrivals cannot duplicate real room occupants. */
import { describe, expect, it } from 'vitest';
import { reconcileSyntheticRoomOccupants } from './roomOccupantReconciliation';

// --- Identity Regression Checks ---
describe('room occupant reconciliation', () => {
    const arrival = { id: 'syn:a pack horse', name: 'A pack horse', type: 'npc' };
    const realHorse = { id: '17', name: 'pack horse', type: 'npc', _roomOrder: 1 };

    it('replaces the text arrival with the game identity despite the article difference', () => {
        const chars = { 99: arrival, 17: realHorse };
        expect(reconcileSyntheticRoomOccupants(chars)).toEqual({ 17: realHorse });
        expect(chars[99]).toBe(arrival);
    });

    it('retains two real horses with identical names and removes only the synthetic copy', () => {
        const secondHorse = { ...realHorse, id: '18' };
        expect(reconcileSyntheticRoomOccupants({ 99: arrival, 17: realHorse, 18: secondHorse }))
            .toEqual({ 17: realHorse, 18: secondHorse });
    });

    it('retains text arrivals when no matching authoritative occupant exists', () => {
        const chars = { 99: arrival, 18: { id: '18', name: 'war horse', type: 'npc' } };
        expect(reconcileSyntheticRoomOccupants(chars)).toBe(chars);
    });
});
