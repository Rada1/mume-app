/** @file CommandSuggestionPopup.test.tsx — Current target status is distinct from keyboard selection. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommandSuggestionPopup } from './CommandSuggestionPopup';

// --- Target Presentation Checks ---
afterEach(cleanup);
it('shows the entity name, keyword and current target even when another option is selected', () => {
    render(<CommandSuggestionPopup show style={{}} showSpellPopup={false} showTargetPopup
        spellSuggestions={[]} commandSuggestions={[]} selectedTargetKey="other"
        targetSuggestions={[
            { key: 'guard', label: 'a Morgundul orc-guard', value: 'guard', meta: 'npc', category: 'cat-npc', isCurrentTarget: true },
            { key: 'other', label: 'a second guard', value: '2.guard', meta: 'npc' }
        ]}
        onChooseSpell={vi.fn()} onChooseTarget={vi.fn()} onToggleMagicKeyFavorite={vi.fn()}
        onClearMagicKey={vi.fn()} onChooseCommand={vi.fn()} />);
    const currentTarget = screen.getByRole('option', { name: /a Morgundul orc-guard guard Current target/ });
    expect(currentTarget.getAttribute('aria-selected')).toBe('false');
    expect(currentTarget.getAttribute('data-target-kind')).toBe('enemy');
    expect(screen.getByRole('option', { name: /a second guard 2.guard Tab/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByText('Current target')).toBeNull();
    expect(currentTarget.querySelector('.command-suggestion-current-target svg')).not.toBeNull();
    const currentTargetIcon = currentTarget.querySelector('.command-suggestion-current-target')!;
    const currentTargetKeyword = currentTarget.querySelector('.command-suggestion-keyword')!;
    expect(currentTargetIcon.compareDocumentPosition(currentTargetKeyword) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(currentTargetKeyword.textContent).toBe('<guard>');
});

it('applies offensive command colors to both commands and aliases', () => {
    render(<CommandSuggestionPopup show style={{}} showSpellPopup={false} showTargetPopup={false}
        spellSuggestions={[]} targetSuggestions={[]} selectedCommandFull="bash"
        commandSuggestions={[
            { full: 'bash', display: 'bash', minimum: 'bas' },
            { full: 'slam', display: 'slam', minimum: 'slam', aliasExpansion: 'bash %n' }
        ]}
        onChooseSpell={vi.fn()} onChooseTarget={vi.fn()} onToggleMagicKeyFavorite={vi.fn()}
        onClearMagicKey={vi.fn()} onChooseCommand={vi.fn()} />);
    for (const name of ['bash', 'slam']) {
        const row = screen.getByText(name).closest('button')!;
        expect(row.style.getPropertyValue('--suggestion-command-color')).toBe('var(--ansi-bright-red, #f87171)');
    }
});

it('uses offensive and healing colors for spell suggestions', () => {
    render(<CommandSuggestionPopup show style={{}} showSpellPopup showTargetPopup={false}
        commandSuggestions={[]} targetSuggestions={[]}
        spellSuggestions={[
            { key: 'fireball', label: 'Fireball', value: 'fireball', meta: 'spell' },
            { key: 'cure', label: 'Cure serious', value: 'cure serious', meta: 'spell' }
        ]}
        onChooseSpell={vi.fn()} onChooseTarget={vi.fn()} onToggleMagicKeyFavorite={vi.fn()}
        onClearMagicKey={vi.fn()} onChooseCommand={vi.fn()} />);
    expect(screen.getByText('Fireball').closest('button')!.style.getPropertyValue('--suggestion-command-color'))
        .toBe('var(--ansi-bright-red, #f87171)');
    expect(screen.getByText('Cure serious').closest('button')!.style.getPropertyValue('--suggestion-command-color'))
        .toBe('var(--ansi-bright-cyan, #38bdf8)');
});
