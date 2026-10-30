/** @file roamingGuildmasters.test.ts — Roaming guildmaster detection follows the room roster. */
import { describe, expect, it } from 'vitest';
import { hasRoamingGuildmaster } from './roamingGuildmasters';

// --- Logic Section ---
describe('roaming guildmasters', () => {
    it.each(['gaunt man', 'grey-cloaked man', 'cowled sorcerer', 'dark-robed man'])('detects %s', name => {
        expect(hasRoamingGuildmaster([{name: `The ${name}`}], 'Black Numenorean')).toBe(true);
        expect(hasRoamingGuildmaster([{shortdesc: name.toUpperCase()}], 'Black Númenórean')).toBe(true);
        expect(hasRoamingGuildmaster([{name}], 'Dunadan')).toBe(false);
        expect(hasRoamingGuildmaster([{name}], '')).toBe(false);
    });
    it('does not retain a guildmaster after departure or match unrelated names', () => {
        expect(hasRoamingGuildmaster([], 'Black Numenorean')).toBe(false);
        expect(hasRoamingGuildmaster([{name: 'gaunt man corpse'}, {name: 'a cloaked man'}], 'Black Numenorean')).toBe(false);
    });
});
