/**
 * @file accountCharacterListParser.test.ts
 * @description Checks account character rows with changing Logon values.
 */

import { describe, expect, it } from 'vitest';
import { parseAccountCharacterRow } from './accountCharacterListParser';

// --- Logic Section: Character List Parsing ---

describe('parseAccountCharacterRow', () => {
    it('keeps characters when Logon is now or an unfamiliar status', () => {
        const now = parseAccountCharacterRow('Ellessar Ainu Rider 104 now Valinor free');
        const unfamiliar = parseAccountCharacterRow('Falathor Elf Scout 25 Recently Bree free');

        expect(now).toMatchObject({ name: 'Ellessar', level: 104, logon: 'now', area: 'Valinor', rent: 'free' });
        expect(unfamiliar).toMatchObject({ name: 'Falathor', level: 25, logon: 'Recently', area: 'Bree', rent: 'free' });
    });

    it('keeps a multiword Logon value intact', () => {
        expect(parseAccountCharacterRow('Falathor Elf Scout 25 10 minutes ago Bree free'))
            .toMatchObject({ logon: '10 minutes ago', area: 'Bree', rent: 'free' });
    });

    it('accepts blank Sub columns and letter-prefixed wizard levels', () => {
        expect(parseAccountCharacterRow('Elletestdwarf dwa     33 4 mths Valinor unknown'))
            .toMatchObject({ name: 'Elletestdwarf', race: 'dwa', sublevel: '', level: 33, logon: '4 mths' });
        expect(parseAccountCharacterRow('Defiance man     W27 5 yrs NAnduin forever'))
            .toMatchObject({ name: 'Defiance', race: 'man', sublevel: '', level: 'W27', logon: '5 yrs' });
        expect(parseAccountCharacterRow('Ellessar ain nol W104 now Valinor free'))
            .toMatchObject({ name: 'Ellessar', sublevel: 'nol', level: 'W104', logon: 'now' });
    });

    it('ignores account menu commands and column headings', () => {
        expect(parseAccountCharacterRow('Name Rce Sub Lvl Logon Area Rent')).toBeNull();
        expect(parseAccountCharacterRow('Play Elf Scout 25 now Bree free')).toBeNull();
    });
});
