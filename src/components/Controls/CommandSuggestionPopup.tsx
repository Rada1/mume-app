/**
 * @file CommandSuggestionPopup.tsx
 * @description Portal popup component displaying command, spell, and target suggestions with number hotkeys.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import ReactDOM from 'react-dom';
import { MumeCommandEntry } from '../../utils/mumeCommandCatalog';
import { SpellSuggestion } from '../../utils/spellSuggestionUtils';
import { CommandTargetSuggestion, suggestionHotkeyForIndex } from '../../utils/commandSuggestionUtils';
import './CommandSuggestionPopup.css';

export interface CommandSuggestionPopupProps {
    show: boolean;
    style: React.CSSProperties;
    showSpellPopup: boolean;
    showTargetPopup: boolean;
    spellSuggestions: SpellSuggestion[];
    targetSuggestions: CommandTargetSuggestion[];
    selectedTargetKey?: string | null;
    commandSuggestions: MumeCommandEntry[];
    selectedCommandFull?: string | null;
    placement?: 'top' | 'bottom';
    onChooseSpell: (spell: string) => void;
    onChooseTarget: (target: string) => void;
    onChooseCommand: (entry: MumeCommandEntry) => void;
}

export const CommandSuggestionPopup: FC<CommandSuggestionPopupProps> = ({
    show,
    style,
    placement = 'bottom',
    showSpellPopup,
    showTargetPopup,
    spellSuggestions,
    targetSuggestions,
    selectedTargetKey,
    commandSuggestions,
    selectedCommandFull,
    onChooseSpell,
    onChooseTarget,
    onChooseCommand
}) => {
    if (!show) return null;

    return ReactDOM.createPortal(
        <div
            className={`command-suggestion-popup placement-${placement}`}
            role="listbox"
            aria-label={showTargetPopup ? 'MUME target suggestions' : showSpellPopup ? 'MUME spell suggestions' : 'MUME command suggestions'}
            style={style}
        >
            {showSpellPopup
                ? spellSuggestions.map((entry, index) => {
                    const hotkey = suggestionHotkeyForIndex(index);
                    return (
                        <button
                            key={entry.key}
                            type="button"
                            className={`command-suggestion-option target-suggestion-option${index === 0 ? ' is-selected' : ''}`}
                            onPointerDown={event => {
                                event.preventDefault();
                                onChooseSpell(entry.value);
                            }}
                        >
                            {hotkey && <span className="command-suggestion-key">{hotkey}</span>}
                            <span className="command-suggestion-name">{entry.label}</span>
                            <span className="command-suggestion-full">spell</span>
                        </button>
                    );
                })
                : showTargetPopup
                ? targetSuggestions.map((entry, index) => {
                    const hotkey = suggestionHotkeyForIndex(index);
                    const isSelected = selectedTargetKey === entry.key;
                    return (
                        <button
                            key={entry.key}
                            type="button"
                            className={`command-suggestion-option target-suggestion-option${isSelected ? ' is-selected' : ''}`}
                            onPointerDown={event => {
                                event.preventDefault();
                                onChooseTarget(entry.value);
                            }}
                        >
                            {hotkey && <span className="command-suggestion-key">{hotkey}</span>}
                            <span className="command-suggestion-name">{entry.value}</span>
                            <span className="command-suggestion-full">
                                {isSelected ? 'selected' : entry.meta}
                            </span>
                        </button>
                    );
                })
                : commandSuggestions.map((entry, index) => {
                    const hotkey = suggestionHotkeyForIndex(index);
                    const isSelected = selectedCommandFull === entry.full;
                    return (
                        <button
                            key={entry.display}
                            type="button"
                            className={`command-suggestion-option${isSelected ? ' is-selected' : ''}`}
                            onPointerDown={event => {
                                event.preventDefault();
                                onChooseCommand(entry);
                            }}
                        >
                            {hotkey && <span className="command-suggestion-key">{hotkey}</span>}
                            <span className="command-suggestion-name">{entry.display}</span>
                            <span className="command-suggestion-full">
                                {isSelected ? 'selected' : entry.full}
                            </span>
                        </button>
                    );
                })}
        </div>,
        document.body
    );
};

export default CommandSuggestionPopup;
