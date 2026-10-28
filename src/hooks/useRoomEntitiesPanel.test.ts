/** @file useRoomEntitiesPanel.test.ts — Group commands use room target selectors. */
import { describe, expect, it } from 'vitest';
import { groupMemberCommandTarget } from './useRoomEntitiesPanel';
import type { RoomEntityMenuEntry } from '../objects/roomEntityMenuModel';

// --- Group Command Targets ---
describe('groupMemberCommandTarget', () => {
    it('uses the occupant selector instead of a descriptive group name', () => {
        const entry: RoomEntityMenuEntry = { id: 'roomchars:17', label: 'pack horse', keyword: 'horse', context: '2.horse', category: 'cat-npc', group: 'characters' };
        expect(groupMemberCommandTarget({ id: 17, name: 'pack horse', hp: 'healthy' }, [entry])).toBe('2.horse');
    });
    it('derives a keyword when the member has no matching room entry', () => {
        expect(groupMemberCommandTarget({ id: 17, name: 'pack horse', hp: 'healthy' }, [])).toBe('horse');
    });
});
