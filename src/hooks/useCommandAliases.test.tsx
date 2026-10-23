// @vitest-environment jsdom
/** @file useCommandAliases.test.tsx — Alias sync, abbreviation precedence, and sent-log regression checks. */

import React from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAliasParser } from './GameParser/useAliasParser';
import { useCommandSuggestions } from './useCommandSuggestions';
import { useCommandAliasStore } from '../stores/useCommandAliasStore';
import { usePanelDataStore } from '../stores/usePanelDataStore';
import { getMumeCommandMatch, replaceMumeCommandToken } from '../utils/mumeCommandCatalog';
import { getCommandAliasDisplay } from '../utils/commandAliasDisplay';
import { SentCommandText } from '../components/Messages/SentCommandText';
import { AliasSyncControl } from '../components/Controls/AliasSyncControl';
import { CommandSuggestionPopup } from '../components/Controls/CommandSuggestionPopup';

vi.mock('../context/GameContext', () => ({
    useVitals: () => ({ groupMembers: [] }),
    useGame: () => ({ gameState: 'playing', isSpectateMode: false, executeCommand: send })
}));
vi.mock('./useRoomDrinkWater', () => ({ useRoomDrinkWater: () => false }));
vi.mock('../components/Messages/TokenRenderer', () => ({
    TokenRenderer: ({ fallbackHtml }: { fallbackHtml?: string }) => <>{fallbackHtml}</>
}));

// --- Fixtures and Lifecycle ---
const send = vi.fn();
const sample = [
    'alias',
    '%target    ==> orc',
    '0          ==> say open',
    '10         ==> /i z 282 superzone r',
    'b          ==> bash',
    'c          ==> close exit',
    'compile    ==> /mud compile("test.mud")',
    'targ       ==> alias %target &',
    'You have 7 aliases defined.'
];
const stableOptions = { abilities: {}, inventoryLines: [], wornLines: [], practiceSkills: [] };

beforeEach(() => {
    vi.useFakeTimers();
    send.mockReset();
    usePanelDataStore.getState().setSession(null);
    usePanelDataStore.getState().setSession('ellessar');
});
afterEach(() => {
    cleanup();
    usePanelDataStore.getState().setSession(null);
    vi.useRealTimers();
});
const importSample = () => {
    useCommandAliasStore.getState().begin();
    for (const line of sample) useCommandAliasStore.getState().receive(line);
};

// --- Sync and Isolation ---
describe('explicit alias sync', () => {
    it('sends alias on button click and imports the complete server response', () => {
        const { getByRole, getByText } = render(<AliasSyncControl />);
        const parser = renderHook(() => useAliasParser());
        expect(send).not.toHaveBeenCalled();
        act(() => getByRole('button', { name: 'Sync aliases' }).click());
        expect(send).toHaveBeenCalledWith('alias', true, true, false, true, { shouldFocus: false });
        expect(getByRole('button', { name: 'Syncing aliases…' }).hasAttribute('disabled')).toBe(true);
        act(() => sample.forEach(line => parser.result.current(line, false, false)));
        expect(useCommandAliasStore.getState().aliases).toHaveLength(7);
        expect(usePanelDataStore.getState().status.aliases).toBe('ready');
        expect(getByText('7 aliases synced for command suggestions.')).toBeTruthy();
    });

    it('serializes aliases behind other captures and ignores unsolicited output', () => {
        const parser = renderHook(() => useAliasParser());
        const store = usePanelDataStore.getState();
        store.request('skills', send);
        store.request('aliases', send);
        sample.forEach(line => parser.result.current(line, false, false));
        expect(useCommandAliasStore.getState().aliases).toEqual([]);
        expect(send.mock.calls).toEqual([['practice']]);
        store.complete('skills');
        vi.advanceTimersByTime(0);
        expect(send.mock.calls).toEqual([['practice'], ['alias']]);
        sample.forEach(line => parser.result.current(line, false, false));
        expect(useCommandAliasStore.getState().aliases).toHaveLength(7);
    });

    it('ignores snooped and spectated alias lists', () => {
        const parser = renderHook(() => useAliasParser());
        usePanelDataStore.getState().request('aliases', send);
        sample.forEach(line => parser.result.current(line, true, false));
        sample.forEach(line => parser.result.current(line, false, true));
        expect(useCommandAliasStore.getState().pending).toEqual([]);
        expect(usePanelDataStore.getState().status.aliases).toBe('loading');
    });

    it('keeps the old list on timeout or incomplete response and allows retry', () => {
        importSample();
        const parser = renderHook(() => useAliasParser());
        usePanelDataStore.getState().request('aliases', send, true);
        parser.result.current('b ==> backstab', false, false);
        parser.result.current('You have 2 aliases defined.', false, false);
        expect(useCommandAliasStore.getState().aliases.find(alias => alias.name === 'b')?.expansion).toBe('bash');
        expect(usePanelDataStore.getState().status.aliases).toBe('idle');
        usePanelDataStore.getState().request('aliases', send, true);
        vi.advanceTimersByTime(15000);
        expect(useCommandAliasStore.getState().pending).toBeNull();
        expect(useCommandAliasStore.getState().aliases).toHaveLength(7);
    });

    it('replaces deleted aliases and clears imports on character changes', () => {
        importSample();
        const parser = renderHook(() => useAliasParser());
        usePanelDataStore.getState().request('aliases', send, true);
        parser.result.current('You have no aliases defined.', false, false);
        expect(useCommandAliasStore.getState().aliases).toEqual([]);
        importSample();
        usePanelDataStore.getState().setSession('another-character');
        expect(useCommandAliasStore.getState().aliases).toEqual([]);
    });

    it('handles ANSI, encoded arrows, and paginated lists', async () => {
        const parser = renderHook(() => useAliasParser());
        usePanelDataStore.getState().request('aliases', send);
        parser.result.current('\x1b[32mb  ==&gt; bash\x1b[0m', false, false);
        parser.result.current('*** Return: continue, b: back (50%) ***', false, false, send);
        await vi.runAllTicks();
        expect(send).toHaveBeenCalledWith('');
        parser.result.current('You have 1 alias defined.', false, false);
        expect(useCommandAliasStore.getState().aliases).toEqual([{ name: 'b', expansion: 'bash' }]);
    });
});

// --- Suggestions and Log Labels ---
describe('alias command meanings', () => {
    it('prioritizes exact aliases over built-in abbreviations without expanding the wire command', () => {
        importSample();
        const aliases = useCommandAliasStore.getState().aliases;
        expect(getMumeCommandMatch('b').entry?.full).toBe('backstab');
        const match = getMumeCommandMatch('b orc', 8, aliases);
        expect(match.entry?.aliasExpansion).toBe('bash');
        expect(replaceMumeCommandToken('b orc', match.entry!)).toBe('b orc');
        expect(getMumeCommandMatch('0', 8, aliases).entry?.aliasExpansion).toBe('say open');
        expect(getMumeCommandMatch('targ', 8, aliases).entry?.aliasExpansion).toBe('alias %target &');
        expect(getMumeCommandMatch('co', 8, aliases).entry?.aliasExpansion).toBeUndefined();
    });

    it('shows the expansion in the command-bar popup, including numeric aliases', () => {
        importSample();
        const { result } = renderHook(() => useCommandSuggestions({
            ...stableOptions, input: '0', setInput: send, gameState: 'playing', isMobile: true
        }));
        expect(result.current.showCommandPopup).toBe(true);
        const { getByText } = render(<CommandSuggestionPopup
            show style={{}} showSpellPopup={false} showTargetPopup={false}
            spellSuggestions={[]} targetSuggestions={[]}
            commandSuggestions={result.current.visibleCommandSuggestions}
            selectedCommandFull={result.current.mumeCommandMatch.entry?.full}
            onChooseSpell={send} onChooseTarget={send} onToggleMagicKeyFavorite={send}
            onClearMagicKey={send} onChooseCommand={result.current.chooseCommandSuggestion}
        />);
        expect(getByText('→ say open')).toBeTruthy();
    });

    it('does not apply cast suggestions to an overridden c alias', () => {
        importSample();
        const { result } = renderHook(() => useCommandSuggestions({
            ...stableOptions, input: 'c ', setInput: send, gameState: 'playing', isMobile: true
        }));
        expect(result.current.mumeCommandMatch.entry?.aliasExpansion).toBe('close exit');
        expect(result.current.spellSuggestions).toEqual([]);
        expect(result.current.targetSuggestions).toEqual([]);
    });

    it('renders bash instead of backstab and keeps the label after a later sync', () => {
        importSample();
        const message = {
            textRaw: 'b orc',
            aliasCommandDisplay: getCommandAliasDisplay('b orc', useCommandAliasStore.getState().aliases)
        };
        const { container, rerender } = render(<SentCommandText message={message} />);
        expect(container.textContent).toBe('bash orc');
        useCommandAliasStore.getState().reset();
        rerender(<SentCommandText message={message} />);
        expect(container.textContent).toBe('bash orc');
    });

    it('preserves default abbreviation labels for commands without aliases', () => {
        const { container } = render(<SentCommandText message={{ textRaw: 'b orc', aliasCommandDisplay: null }} />);
        expect(container.textContent).toBe('b(ackstab) orc');
    });

    it('formats argument placeholders, multi-command aliases, and escaped literals', () => {
        expect(getCommandAliasDisplay('targ troll', [{ name: 'targ', expansion: 'alias %target &' }]))
            .toBe('alias %target troll');
        expect(getCommandAliasDisplay('combo orc', [{ name: 'combo', expansion: 'bash &;kill &' }]))
            .toBe('bash orc;kill orc');
        expect(getCommandAliasDisplay('combo orc', [{ name: 'combo', expansion: 'look;score' }]))
            .toBe('look;score');
        expect(getCommandAliasDisplay('sayit yes', [{ name: 'sayit', expansion: 'say \\& \\;' }]))
            .toBe('say & ; yes');
    });
});
