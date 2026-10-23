/**
 * @file CommandSuggestionPopup.tsx
 * @description Portal popup component displaying selectable command, spell, and target suggestions.
 */

// --- Logic Section ---
import React, { FC, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Crosshair, Star, X } from 'lucide-react';
import { MumeCommandEntry } from '../../utils/mumeCommandCatalog';
import { SpellSuggestion } from '../../utils/spellSuggestionUtils';
import { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';
import { formatMagicKeyRemaining } from '../../utils/magicKeyUtils';
import { getTargetItemTierClassName } from '../../utils/itemTier';
import { stripShopProductQuantity } from '../../utils/shopVariantParser';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useCommandSuggestionAppearance } from '../../hooks/useCommandSuggestionAppearance';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import './CommandSuggestionPopup.css';
import './AliasSuggestions.css';

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
    const targetAppearance = useCommandSuggestionAppearance();
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
                    return (
                        <button
                            key={entry.key}
                            type="button"
                            className={`command-suggestion-option target-suggestion-option is-command-row${index === 0 ? ' is-selected' : ''}`}
                            style={{ '--suggestion-command-color': getCommandTextColor(`cast '${entry.value}'`) } as React.CSSProperties}
                            onPointerDown={event => {
                                event.preventDefault();
                                onChooseSpell(entry.value);
                            }}
                        >
                            <span className="command-suggestion-name">{entry.label}</span>
                            <span className="command-suggestion-full">spell</span>
                        </button>
                    );
                })
                : showTargetPopup
                ? targetSuggestions.map(entry => {
                    const isSelected = selectedTargetKey === entry.key;
                    const isMagicKey = entry.meta === 'magic-key';
                    const isShopItem = entry.meta === 'shop-item';
                    const appearance = targetAppearance(entry);
                    const option = (
                        <button
                            type="button"
                            className={`command-suggestion-option target-suggestion-option is-target-row${isSelected ? ' is-selected' : ''}${entry.isCurrentTarget ? ' is-current-target' : ''}`}
                            role="option"
                            aria-selected={isSelected}
                            aria-label={`${entry.label} ${entry.value}${entry.isCurrentTarget ? ' Current target' : isSelected ? ' Tab' : ''}`}
                            data-target-kind={appearance.kind}
                            style={{ '--suggestion-target-color': appearance.color } as React.CSSProperties}
                            onPointerDown={event => {
                                event.preventDefault();
                                onChooseTarget(entry.value);
                            }}
                        >
                            <span className={`command-suggestion-name ${getTargetItemTierClassName(entry.label)}`.trim()} title={isMagicKey ? entry.label : undefined}>
                                {isMagicKey ? entry.customLabel || entry.label : isShopItem ? stripShopProductQuantity(entry.label) : entry.label}
                            </span>
                            {entry.isCurrentTarget && <span className="command-suggestion-current-target"><Crosshair size={12} strokeWidth={1.75} aria-hidden="true" /></span>}
                            {!isMagicKey && !isShopItem && <span className="command-suggestion-keyword">&lt;{entry.value}&gt;</span>}
                            <span className="command-suggestion-full">
                                {isMagicKey
                                    ? `key ${entry.value} · ${formatMagicKeyRemaining(entry.expiresAt, now)}`
                                    : isShopItem ? `#${entry.value}`
                                    : entry.isCurrentTarget ? null : isSelected ? 'Tab' : entry.meta}
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
                : commandSuggestions.map(entry => {
                    const isSelected = selectedCommandFull === entry.full;
                    return (
                        <button
                            key={entry.display}
                            type="button"
                            className={`command-suggestion-option is-command-row${isSelected ? ' is-selected' : ''}${entry.aliasExpansion ? ' is-alias' : ''}`}
                            style={{ '--suggestion-command-color': getCommandTextColor(entry.aliasExpansion || entry.full) } as React.CSSProperties}
                            onPointerDown={event => {
                                event.preventDefault();
                                onChooseCommand(entry);
                            }}
                        >
                            <span className="command-suggestion-name">{entry.display}</span>
                            <span className="command-suggestion-full" title={entry.aliasExpansion}>
                                {entry.aliasExpansion ? `→ ${entry.aliasExpansion}` : isSelected ? 'selected' : entry.full}
                            </span>
                        </button>
                    );
                })}
        </div>,
        document.body
    );
};

export default CommandSuggestionPopup;
