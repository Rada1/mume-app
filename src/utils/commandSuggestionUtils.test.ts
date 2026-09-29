import { describe, it, expect } from 'vitest';
import {
    replaceCommandArgumentToken,
    suggestionHotkeyForIndex,
    getWhoTargetSuggestions,
    getSocialTargetSuggestions,
    getContainerTargetSuggestions,
    getLearnedMageSpellSuggestions,
    getMagicKeyTargetSuggestions,
    getMountTargetSuggestions,
    getSelfAndRoomTargetSuggestions,
    appendNamedTargetSuggestions,
    getRoomObjectTargetsWithExit,
    getInventoryAndWornTargetSuggestions,
    getDrinkTargetSuggestions,
    getRoomCorpseTargetSuggestions
} from './commandSuggestionUtils';
import { getMumeCommandMatch } from './mumeCommandCatalog';

describe('commandSuggestionUtils', () => {
    it('offers the default Mount target and only room NPCs with the mount trait', () => {
        const suggestions = getMountTargetSuggestions([
            { id: 'horse', name: 'a pack horse', short: 'a pack horse', type: 'npc' },
            { id: 'warg', name: 'a warg', short: 'a warg', type: 'npc' },
            { id: 'guard', name: 'a town guard', type: 'npc' },
            { id: 'pony-player', name: 'Pony', type: 'ally', pc: true },
            { id: 'tagged-mount', name: 'a swift animal', type: 'npc', labels: ['mount'] }
        ]);

        expect(suggestions[0]).toMatchObject({ label: 'Mount', value: 'mount' });
        expect(suggestions.map(suggestion => suggestion.label)).toEqual([
            'Mount', 'a pack horse', 'a warg', 'a swift animal'
        ]);
    });

    describe('suggestionHotkeyForIndex', () => {
        it('maps index 0 to hotkey 1 and index 8 to hotkey 9', () => {
            expect(suggestionHotkeyForIndex(0)).toBe('1');
            expect(suggestionHotkeyForIndex(8)).toBe('9');
            expect(suggestionHotkeyForIndex(9)).toBe('0');
            expect(suggestionHotkeyForIndex(10)).toBeNull();
        });
    });

    describe('replaceCommandArgumentToken', () => {
        it('replaces target argument in command string', () => {
            expect(replaceCommandArgumentToken('kill or', 'orc')).toBe('kill orc ');
            expect(replaceCommandArgumentToken('examine ch', 'chest')).toBe('examine chest ');
        });

        it('appends target argument if none was typed yet', () => {
            expect(replaceCommandArgumentToken('kill ', 'troll')).toBe('kill troll ');
        });
    });

    describe('getMumeCommandMatch prediction', () => {
        it('predicts full command for single-letter prefixes', () => {
            const matchL = getMumeCommandMatch('l');
            expect(matchL.entry?.full).toBe('look');
            expect(matchL.isValid).toBe(true);

            const matchK = getMumeCommandMatch('k');
            expect(matchK.entry?.full).toBe('kill');
            expect(matchK.isValid).toBe(true);

            const matchSc = getMumeCommandMatch('sc');
            expect(matchSc.entry?.full).toBe('score');
            expect(matchSc.isValid).toBe(true);
        });

        it('recognizes valid execution for minimum prefixes', () => {
            const matchEx = getMumeCommandMatch('ex');
            expect(matchEx.entry?.full).toBe('exits');
            expect(matchEx.isValid).toBe(true);
        });
    });

    describe('getWhoTargetSuggestions', () => {
        it('returns formatted player target suggestions from who list', () => {
            const whoList = ['1|Sauron', '2|Elrond'];
            const suggestions = getWhoTargetSuggestions(whoList, 'Elrond');
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0]).toEqual({
                key: 'who-1-Sauron',
                label: 'Sauron',
                value: 'Sauron',
                meta: 'who'
            });
        });
    });

    describe('getSocialTargetSuggestions', () => {
        it('returns all 57 MUME social commands formatted as target suggestions', () => {
            const suggestions = getSocialTargetSuggestions();
            expect(suggestions.length).toBe(57);
            expect(suggestions[0]).toEqual({
                key: 'social-0-accuse',
                label: 'Accuse',
                value: 'accuse',
                meta: 'social'
            });
            expect(suggestions.some(s => s.value === 'whisper' || s.value === 'hug' || s.value === 'bow')).toBe(true);
        });
    });

    describe('getContainerTargetSuggestions', () => {
        it('includes only containers from the room, inventory, and worn gear', () => {
            const suggestions = getContainerTargetSuggestions(
                [
                    { id: 'room-bag', name: 'a leather bag', type: 'object' },
                    { id: 'room-stone', name: 'a round stone', type: 'object' },
                    { id: 'room-case', name: 'a sealed case', category: 'container' }
                ],
                [
                    { id: 'inventory-box', text: 'a small box', html: 'a small box', isItem: true, isContainer: true },
                    { id: 'inventory-sword', text: 'a sword', html: 'a sword', isItem: true }
                ],
                [
                    { id: 'worn-pack', text: 'a leather backpack', html: 'a leather backpack', isItem: true },
                    { id: 'worn-helm', text: 'a steel helmet', html: 'a steel helmet', isItem: true }
                ]
            );

            expect(suggestions.map(suggestion => suggestion.meta)).toEqual(['exit', 'room', 'room', 'inventory', 'worn']);
            expect(suggestions.map(suggestion => suggestion.label)).toEqual([
                'Exit', 'a leather bag', 'a sealed case', 'a small box', 'a leather backpack'
            ]);
            expect(suggestions[0].value).toBe('exit');
        });
    });

    it('limits Drink targets to worn and carried liquid containers plus room water', () => {
        const line = (id: string, text: string) => ({ id, text, html: text, isItem: true });
        const suggestions = getDrinkTargetSuggestions(
            [line('flask', 'a glass flask'), line('sword', 'a steel sword'), line('bowl', 'a wooden bowl')],
            [line('waterskin', 'a worn waterskin'), line('cloak', 'a wool cloak')]
        );

        expect(suggestions.map(suggestion => suggestion.label)).toEqual([
            'a glass flask', 'a wooden bowl', 'a worn waterskin', 'water'
        ]);
        expect(suggestions.map(suggestion => suggestion.meta)).toEqual([
            'inventory', 'inventory', 'worn', 'source'
        ]);
    });

    describe('tactical spell and skill target suggestions', () => {
        it('puts Self first, then room entities, while excluding the current character duplicate', () => {
            const suggestions = getSelfAndRoomTargetSuggestions(
                [
                    { id: 'self', name: 'Ellessar', type: 'ally' },
                    { id: 'ally', name: 'Aranur', type: 'ally' },
                    { id: 'enemy', name: 'Cave Orc', type: 'enemy' },
                    { id: 'npc', name: 'A pack horse', type: 'npc' }
                ],
                [],
                'Ellessar'
            );

            expect(suggestions.map(suggestion => suggestion.label)).toEqual(['Self', 'Aranur', 'Cave Orc', 'A pack horse']);
            expect(suggestions[0].meta).toBe('self');
            expect(suggestions.map(suggestion => suggestion.meta)).toContain('enemy');
            expect(suggestions.map(suggestion => suggestion.meta)).toContain('npc');
        });

        it('includes only learned mage spells in the Store menu', () => {
            const suggestions = getLearnedMageSpellSuggestions([
                { name: 'Magic Missile', skillClass: 'mage', proficiency: 98, sessions: '', knowledge: '', difficulty: '', advice: '' },
                { name: 'Fireball', skillClass: 'mage', proficiency: 0, sessions: '', knowledge: '', difficulty: '', advice: '' },
                { name: 'Bless', skillClass: 'cleric', proficiency: 98, sessions: '', knowledge: '', difficulty: '', advice: '' }
            ]);

            expect(suggestions.map(suggestion => suggestion.value)).toEqual(['magic missile']);
        });

        it('uses known magic key IDs as Portal and Teleport targets and skips expired keys', () => {
            const now = Date.now();
            const suggestions = getMagicKeyTargetSuggestions([
                { id: 'key-1 extra', name: 'The Shapers Board', label: 'The Shapers Board', command: '', expiresAt: now + 60_000 },
                { id: 'key-expired', name: 'Old room', command: '', expiresAt: now - 1 }
            ]);

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0]).toMatchObject({ value: 'key-1', label: 'The Shapers Board', meta: 'magic-key' });
        });

        it('adds Web and Exit after the room entities for fireball and burning hands', () => {
            const roomTargets = [{ key: 'orc', label: 'Cave Orc', value: 'orc', meta: 'enemy' }];
            const suggestions = appendNamedTargetSuggestions(roomTargets, [
                { label: 'Web', value: 'web', meta: 'object' },
                { label: 'Exit', value: 'exit', meta: 'exit' }
            ]);

            expect(suggestions.map(suggestion => suggestion.value)).toEqual(['orc', 'web', 'exit']);
        });

        it('lists room objects and Exit for Pick', () => {
            const suggestions = getRoomObjectTargetsWithExit([
                { id: 'door-1', name: 'a wooden door', type: 'object' },
                { id: 'chest-1', name: 'a small chest', type: 'object' }
            ]);

            expect(suggestions.map(suggestion => suggestion.label)).toEqual([
                'a wooden door', 'a small chest', 'Exit'
            ]);
            expect(suggestions.at(-1)).toMatchObject({ value: 'exit', meta: 'exit' });
        });

        it('lists inventory and worn objects for Enchant', () => {
            const suggestions = getInventoryAndWornTargetSuggestions(
                [{ id: 'inv-ring', text: 'a silver ring', html: 'a silver ring', isItem: true }],
                [{ id: 'worn-sword', text: 'a long sword', html: 'a long sword', isItem: true }]
            );

            expect(suggestions.map(suggestion => suggestion.label)).toEqual(['a silver ring', 'a long sword']);
            expect(suggestions.map(suggestion => suggestion.meta)).toEqual(['inventory', 'worn']);
        });

        it('lists only corpses in the room for Raise Dead', () => {
            const suggestions = getRoomCorpseTargetSuggestions([
                { id: 'corpse', name: 'the corpse of a dwarf', type: 'object' },
                { id: 'sword', name: 'a steel sword', type: 'object' },
                { id: 'flagged-corpse', name: 'a shape', flags: ['corpse'] }
            ]);

            expect(suggestions.map(suggestion => suggestion.label)).toEqual([
                'the corpse of a dwarf', 'a shape'
            ]);
        });
    });
});
