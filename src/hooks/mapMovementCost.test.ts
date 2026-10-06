/** @file Checks MUME terrain movement estimates and route preferences. */
// --- Logic Section ---
import { describe, expect, it } from 'vitest';
import { movementPointCost, routePreferencePenalty } from './mapMovementCost';

describe('map movement costs', () => {
    it('uses one, two, or three movement points for the terrain guide categories', () => {
        expect(movementPointCost('road')).toBe(1);
        expect(movementPointCost('field')).toBe(2);
        expect(movementPointCost('mountains')).toBe(2);
        expect(movementPointCost('water')).toBe(3);
        expect(movementPointCost(11)).toBe(1);
        expect(movementPointCost(8)).toBe(3);
    });

    it('applies the terrain guide race adjustments', () => {
        expect(movementPointCost('forest', 'Elf')).toBe(1);
        expect(movementPointCost('mountains', 'Elf')).toBe(3);
        expect(movementPointCost('mountains', 'Dwarf')).toBe(1);
        expect(movementPointCost('brush', 'Hobbit')).toBe(3);
        expect(movementPointCost('hills', 'Orc')).toBe(1);
        expect(movementPointCost('shallow', 'Troll')).toBe(3);
    });

    it('treats revealed and riding restrictions as bounded preferences', () => {
        const exploredVnums = new Set(['20']);
        expect(routePreferencePenalty('m_30', false, { exploredVnums })).toBe(2);
        expect(routePreferencePenalty('m_30', false, { exploredVnums, revealAll: true })).toBe(0);
        expect(routePreferencePenalty('m_20', true, { exploredVnums, riding: true })).toBe(6);
    });
});
