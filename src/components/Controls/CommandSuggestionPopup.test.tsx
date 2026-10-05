/**
 * @file CommandSuggestionPopup.test.tsx
 * @description Verifies that mobile command suggestions escape the app's stacking context.
 */
// @vitest-environment jsdom

// --- Logic Section ---
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CommandSuggestionPopup } from './CommandSuggestionPopup';
import { useSettingsStore } from '../../stores/useSettingsStore';

afterEach(() => {
    cleanup();
    document.querySelector('.app-container')?.remove();
});

it('renders mobile keyboard suggestions in the document layer', () => {
    useSettingsStore.setState({ isClassicMode: false });
    const app = document.createElement('div');
    app.className = 'app-container is-mobile kb-open';
    document.body.appendChild(app);

    render(<CommandSuggestionPopup
        show
        style={{ left: 8, top: 200, width: 320 }}
        placement="top"
        showSpellPopup={false}
        showTargetPopup={false}
        spellSuggestions={[]}
        targetSuggestions={[]}
        commandSuggestions={[{ display: 'l(ook)', minimum: 'l', full: 'look' }]}
        onChooseSpell={() => {}}
        onChooseTarget={() => {}}
        onToggleMagicKeyFavorite={() => {}}
        onClearMagicKey={() => {}}
        onChooseCommand={() => {}}
    />);

    const popup = screen.getByRole('listbox', { name: 'MUME command suggestions' });
    expect(popup.parentElement).toBe(document.body);
    expect(screen.getByRole('button', { name: /look/i })).toBeTruthy();
});
