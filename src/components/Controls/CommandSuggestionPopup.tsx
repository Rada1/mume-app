/**
 * @file CommandSuggestionPopup.tsx
 * @description Portal popup component displaying command, spell, and target suggestions with number hotkeys.
 */

// --- Logic Section ---
import React, { FC, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Star, X } from 'lucide-react';
import { MumeCommandEntry } from '../../utils/mumeCommandCatalog';
import { SpellSuggestion } from '../../utils/spellSuggestionUtils';
import { CommandTargetSuggestion, suggestionHotkeyForIndex } from '../../utils/commandSuggestionUtils';
import { formatMagicKeyRemaining } from '../../utils/magicKeyUtils';
import { getTargetItemTierClassName } from '../../utils/itemTier';
import { useSettingsStore } from '../../stores/useSettingsStore';
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
    onToggleMagicKeyFavorite: (key: string) => void;
    onClearMagicKey: (key: string) => void;
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
    onToggleMagicKeyFavorite,
    onClearMagicKey,
    onChooseCommand
}) => {
    const isImmersionMode = useSettingsStore(state => state.isImmersionMode);
    const isClassicMode = useSettingsStore(state => state.isClassicMode);
    const [now, setNow] = useState(Date.now());
    const hasExpiringPortkeys = show && targetSuggestions.some(entry => entry.meta === 'magic-key' && entry.expiresAt !== undefined);

    useEffect(() => {
        if (!hasExpiringPortkeys) return;
        const interval = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(interval);
    }, [hasExpiringPortkeys]);

    if (!show || isClassicMode) return null;

    return ReactDOM.createPortal(
        <div
            className={`command-suggestion-popup placement-${placement}${isImmersionMode ? ' immersion-glass' : ''}`}
            role="listbox"
            aria-label={showTargetPopup
                ? targetSuggestions.some(entry => entry.meta === 'magic-key') ? 'MUME portkey suggestions' : 'MUME target suggestions'
                : showSpellPopup ? 'MUME spell suggestions' : 'MUME command suggestions'}
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
                    const isMagicKey = entry.meta === 'magic-key';
                    const option = (
                        <button
                            type="button"
                            className={`command-suggestion-option target-suggestion-option${isSelected ? ' is-selected' : ''}`}
                            onPointerDown={event => {
                                event.preventDefault();
                                onChooseTarget(entry.value);
                            }}
                        >
                            {hotkey && <span className="command-suggestion-key">{hotkey}</span>}
                            <span className={`command-suggestion-name ${getTargetItemTierClassName(entry.label)}`.trim()} title={isMagicKey ? entry.label : undefined}>
                                {isMagicKey ? entry.customLabel || entry.label : entry.value}
                            </span>
                            <span className="command-suggestion-full">
                                {isMagicKey
                                    ? `key ${entry.value} · ${formatMagicKeyRemaining(entry.expiresAt, now)}`
                                    : isSelected ? 'selected' : entry.meta}
                            </span>
                        </button>
                    );

                    return isMagicKey ? (
                        <div className="command-suggestion-portkey-row" key={entry.key}>
                            {option}
                            <button
                                type="button"
                                className={`command-suggestion-portkey-favorite${entry.isFavorite ? ' is-favorite' : ''}`}
                                aria-label={`${entry.isFavorite ? 'Remove' : 'Add'} ${entry.customLabel || entry.label} ${entry.isFavorite ? 'from' : 'to'} favorites`}
                                aria-pressed={Boolean(entry.isFavorite)}
                                title={entry.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                onPointerDown={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onToggleMagicKeyFavorite(entry.value);
                                }}
                                onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (event.detail === 0) onToggleMagicKeyFavorite(entry.value);
                                }}
                            ><Star size={12} fill={entry.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>
                            <button
                                type="button"
                                className="command-suggestion-portkey-clear"
                                aria-label={`Delete portkey ${entry.customLabel || entry.label}`}
                                title="Delete saved portkey"
                                onPointerDown={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onClearMagicKey(entry.value);
                                }}
                                onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (event.detail === 0) onClearMagicKey(entry.value);
                                }}
                            ><X size={13} aria-hidden="true" /></button>
                        </div>
                    ) : React.cloneElement(option, { key: entry.key });
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
