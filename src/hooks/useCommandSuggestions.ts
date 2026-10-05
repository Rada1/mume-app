/**
 * @file useCommandSuggestions.ts
 * @description Headless hook providing command, spell, and target suggestions and ghost prediction for MUME inputs.
 */

// --- Logic Section ---
import { useState, useMemo, useCallback, useEffect, useRef, RefObject, CSSProperties, KeyboardEvent } from 'react';
import { getMumeCommandMatch, replaceMumeCommandToken, MumeCommandEntry, MumeCommandMatch } from '../utils/mumeCommandCatalog';
import { getCastSpellFragment, getCastSpellSuggestions, replaceCastSpellArgument, SpellSuggestion } from '../utils/spellSuggestionUtils';
import { useRoomStore } from '../stores/useRoomStore';
import { useRoomDrinkWater } from './useRoomDrinkWater';
import { useInputStore } from '../stores/useInputStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useUIStore } from '../stores/useUIStore';
import { useVitals } from '../context/GameContext';
import { DrawerLine, GameState } from '../types/game';
import type { PracticeSkill } from '../types';
import {
    CommandTargetSuggestion,
    CommandTextParts,
    getMagicKeyTargetSuggestions,
    getRescueTargetSuggestions
} from '../utils/commandSuggestionUtils';
import { BLANK_TARGET_VALUE, getCommandTargetMenuKind } from '../utils/commandTargetUtils';
import { getMagicKeyId, parseKeyedSpellCommand } from '../utils/magicKeyUtils';
import { stripShopProductQuantity } from '../utils/shopVariantParser';
import {
    replaceActiveCommandArgumentToken,
    replaceFirstCommandArgument,
    resolveCommandTargetSuggestions,
    type ResolvedCommandTargetSuggestions,
    type SelectedCommandArgumentChip
} from '../utils/commandTargetSuggestionResolver';

export interface UseCommandSuggestionsOptions {
    input: string; setInput: (val: string) => void; gameState: GameState;
    isPasswordMode?: boolean; currentMode?: string; disabled?: boolean;
    abilities?: Record<string, number>; characterClass?: string;
    wrapRef?: RefObject<HTMLElement | null>; inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
    isMobile?: boolean; targetPickerRequestId?: number; placement?: 'top' | 'bottom';
    positionOverMap?: boolean;
    inventoryLines?: DrawerLine[]; wornLines?: DrawerLine[];
    characterName?: string; practiceSkills?: PracticeSkill[];
}

export interface UseCommandSuggestionsReturn {
    commandTextParts: CommandTextParts | null; mumeCommandMatch: MumeCommandMatch;
    showCompletionPopup: boolean; showCommandPopup: boolean; showTargetPopup: boolean; showSpellPopup: boolean;
    visibleCommandSuggestions: MumeCommandEntry[]; targetSuggestions: CommandTargetSuggestion[];
    commandArgumentChips: Array<{ key: string; label: string; value: string; start: number; end: number; suggestions: CommandTargetSuggestion[] }>;
    commandArgumentCaretKey: string | null;
    selectedTargetSuggestion: CommandTargetSuggestion | null; spellSuggestions: SpellSuggestion[];
    popupStyle: CSSProperties; placement: 'top' | 'bottom';
    isFocused: boolean; setIsFocused: (val: boolean) => void; setIsTargetPickerForced: (val: boolean) => void;
    chooseCommandSuggestion: (entry: MumeCommandEntry) => void; chooseTargetSuggestion: (val: string) => void;
    chooseCommandArgumentSuggestion: (key: string, value: string) => void;
    clearCommandArgumentCaret: () => void;
    handleCommandArgumentKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => boolean;
    chooseSpellSuggestion: (val: string) => void; toggleMagicKeyFavorite: (key: string) => void;
    clearMagicKey: (key: string) => void;
    handleSuggestionKeyDown: (e: KeyboardEvent) => boolean;
}

export const useCommandSuggestions = ({
    input,
    setInput,
    gameState,
    isPasswordMode = false,
    currentMode = 'command',
    disabled = false,
    abilities = {},
    characterClass = '',
    wrapRef,
    inputRef,
    isMobile = false,
    targetPickerRequestId: propTargetPickerRequestId,
    placement: propPlacement,
    positionOverMap = false,
    inventoryLines = [],
    wornLines = [],
    characterName = '',
    practiceSkills = []
}: UseCommandSuggestionsOptions): UseCommandSuggestionsReturn => {
    const effectivePlacement: 'top' | 'bottom' = propPlacement ?? (isMobile ? 'top' : 'bottom');
    const [isFocused, setIsFocused] = useState(false);
    const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
    const [isTargetPickerForced, setIsTargetPickerForced] = useState(false);
    const [selectedCommandArguments, setSelectedCommandArguments] = useState<SelectedCommandArgumentChip[]>([]);
    const [commandArgumentCaretKey, setCommandArgumentCaretKey] = useState<string | null>(null);
    const commandArgumentChipId = useRef(0);

    const chars = useRoomStore(s => s.chars);
    const { groupMembers } = useVitals();
    const roomItems = useRoomStore(s => s.items);
    const roomWaterAvailable = useRoomDrinkWater();
    const whoList = useRoomStore(s => s.whoList);
    const shopItems = useUIStore(s => s.shopItems);
    const teleportTargets = useSettingsStore(s => s.teleportTargets);
    const setTeleportTargets = useSettingsStore(s => s.setTeleportTargets);
    const showCommandSuggestions = useSettingsStore(s => s.showCommandSuggestions);
    const storeTargetPickerRequestId = useInputStore(s => s.targetPickerRequestId);
    const targetPickerRequestId = propTargetPickerRequestId ?? storeTargetPickerRequestId;

    const shouldSuggest = showCommandSuggestions && !disabled && gameState === 'playing' && currentMode === 'command' && !isPasswordMode;

    const mumeCommandMatch = useMemo(
        () => shouldSuggest ? getMumeCommandMatch(input, 8) : getMumeCommandMatch(''),
        [input, shouldSuggest]
    );

    const commandTextParts = useMemo<CommandTextParts | null>(() => {
        if (!shouldSuggest || !input) return null;
        const leading = input.match(/^\s*/)?.[0] ?? '';
        const withoutLeading = input.slice(leading.length);
        const tokenMatch = /^(\S+)([\s\S]*)$/.exec(withoutLeading);
        if (!tokenMatch) return null;
        return {
            leading,
            token: tokenMatch[1],
            suffix: tokenMatch[2],
            isValid: mumeCommandMatch.isValid,
            autocomplete: mumeCommandMatch.entry?.full.startsWith(tokenMatch[1].toLowerCase())
                ? mumeCommandMatch.entry.full.slice(tokenMatch[1].length)
                : ''
        };
    }, [input, mumeCommandMatch.entry, mumeCommandMatch.isValid, shouldSuggest]);

    const hasCommandArgumentSpace = !!commandTextParts?.isValid && /^\s/.test(commandTextParts.suffix);
    const keyedSpellInput = useMemo(() => parseKeyedSpellCommand(input), [input]);
    const commandToken = mumeCommandMatch.entry?.full || commandTextParts?.token.toLowerCase() || '';
    const commandTokenKey = commandToken.toLowerCase();

    const commandArgumentChips = useMemo(() => {
        if (!input || !commandTokenKey) return [];
        const leadingLength = input.match(/^\s*/)?.[0].length ?? 0;
        const rawCommandToken = /^\S+/.exec(input.slice(leadingLength))?.[0] || '';
        let searchFrom = leadingLength + rawCommandToken.length;
        return selectedCommandArguments.flatMap(chip => {
            if (chip.commandToken !== commandTokenKey) return [];
            if (chip.isVirtual) {
                if (chip.snapshot !== input) return [];
                return [{
                    key: chip.key, value: chip.value, label: chip.label,
                    start: input.length, end: input.length, suggestions: chip.suggestions
                }];
            }
            let start = chip.start;
            const matchesAtStart = input.slice(start, start + chip.value.length).toLowerCase() === chip.value.toLowerCase();
            if (!matchesAtStart || start < searchFrom) {
                start = input.toLowerCase().indexOf(chip.value.toLowerCase(), searchFrom);
            }
            if (start < searchFrom || start < 0) return [];
            const end = start + chip.value.length;
            searchFrom = end;
            return [{ key: chip.key, value: chip.value, label: chip.label, start, end, suggestions: chip.suggestions }];
        });
    }, [commandTokenKey, input, selectedCommandArguments]);

    useEffect(() => {
        const visibleKeys = new Set(commandArgumentChips.map(chip => chip.key));
        setSelectedCommandArguments(current => {
            const next = current.filter(chip => visibleKeys.has(chip.key));
            return next.length === current.length ? current : next;
        });
    }, [commandArgumentChips]);

    const targetSuggestionResolution = useMemo<ResolvedCommandTargetSuggestions>(() => {
        if (keyedSpellInput) {
            const fragment = keyedSpellInput.target.toLowerCase();
            const suggestions = getMagicKeyTargetSuggestions(teleportTargets)
                .filter(entry => !fragment || [entry.value, entry.label, entry.customLabel]
                    .some(value => value?.toLowerCase().startsWith(fragment)))
                .slice(0, 10);
            return { suggestions, fragment, argumentIndex: 0 };
        }
        if (!hasCommandArgumentSpace || !commandTextParts) return { suggestions: [], fragment: '', argumentIndex: 0 };

        const command = `${commandToken}${commandTextParts?.suffix || ''}`.trim();
        if (/^rescue(?:\s|$)/i.test(command)) {
            return {
                suggestions: getRescueTargetSuggestions(Object.values(chars || {}), characterName, groupMembers),
                fragment: commandTextParts?.suffix.trim().split(/\s+/, 1)[0] || '',
                argumentIndex: 0
            };
        }
        return resolveCommandTargetSuggestions({
            command,
            argumentText: commandTextParts?.suffix || '',
            menuKind: getCommandTargetMenuKind(command),
            roomOccupants: Object.values(chars || {}),
            roomObjects: Object.values(roomItems || {}),
            inventoryLines,
            wornLines,
            characterName,
            abilities,
            practiceSkills,
            teleportTargets,
            whoList,
            shopItems,
            roomWaterAvailable,
            groupMembers
        });
    }, [abilities, characterName, chars, commandTextParts, commandToken, groupMembers, hasCommandArgumentSpace, inventoryLines, keyedSpellInput, practiceSkills, roomItems, roomWaterAvailable, shopItems, teleportTargets, whoList, wornLines]);

    const targetSuggestions = useMemo<CommandTargetSuggestion[]>(() => {
        const isStagedCommand = /^(give|put|get)$/.test(commandTokenKey)
            || (commandTokenKey === 'look' && commandArgumentChips.some(chip => chip.value === 'in'));
        const maxSelectedArguments = isStagedCommand ? 2 : 1;
        if (commandArgumentChips.length >= maxSelectedArguments) return [];

        const fragment = targetSuggestionResolution.fragment.toLowerCase();
        return targetSuggestionResolution.suggestions
            .filter(entry => {
                if (!entry.value) return false;
                if (!fragment) return true;
                if (commandTokenKey === 'buy' && entry.meta === 'shop-item') {
                    const productName = stripShopProductQuantity(entry.label)
                        .replace(/^(?:a|an|the)\s+/i, '')
                        .toLowerCase();
                    return productName.startsWith(fragment) || entry.value.toLowerCase().startsWith(fragment);
                }
                const cleanValue = entry.value.replace(/^[*-]+|[*-]+$/g, '').toLowerCase();
                const valueLower = entry.value.toLowerCase();
                const labelLower = entry.label.toLowerCase();
                return cleanValue.startsWith(fragment) ||
                    valueLower.startsWith(fragment) ||
                    labelLower.startsWith(fragment) ||
                    labelLower.split(/\s+/).some(w => w.startsWith(fragment));
            })
            .slice(0, 8);
    }, [commandArgumentChips, commandTokenKey, targetSuggestionResolution]);

    const selectedTargetSuggestion = targetSuggestions[0] ?? null;

    useEffect(() => {
        if (targetPickerRequestId > 0) setIsTargetPickerForced(true);
    }, [targetPickerRequestId]);

    useEffect(() => {
        if (!hasCommandArgumentSpace) setIsTargetPickerForced(false);
    }, [hasCommandArgumentSpace]);

    const spellSuggestions = useMemo(() => {
        if (!shouldSuggest) return [];
        return getCastSpellSuggestions(input, abilities, characterClass);
    }, [abilities, characterClass, input, shouldSuggest]);

    const isSpellCastInput = getCastSpellFragment(input) !== null;

    const chooseSpellSuggestion = useCallback((spell: string) => {
        setInput(replaceCastSpellArgument(input, spell));
        requestAnimationFrame(() => inputRef?.current?.focus());
    }, [input, inputRef, setInput]);

    const chooseCommandSuggestion = useCallback((entry: MumeCommandEntry) => {
        setInput(replaceMumeCommandToken(input, entry));
        requestAnimationFrame(() => inputRef?.current?.focus());
    }, [input, inputRef, setInput]);

    const chooseTargetSuggestion = useCallback((value: string) => {
        const keyedSpell = parseKeyedSpellCommand(input);
        const chosenSuggestion = targetSuggestions.find(entry => entry.value === value);
        let nextInput = input;
        let chipStart = input.length;
        let isVirtualChip = false;
        if (keyedSpell) {
            nextInput = `${keyedSpell.prefix} ${value}`;
            chipStart = nextInput.length - value.length;
        } else if (value === BLANK_TARGET_VALUE) {
            const leadingWhitespace = input.match(/^\s*/)?.[0] ?? '';
            const commandToken = input.trimStart().match(/^(\S+)/)?.[1] ?? '';
            nextInput = commandToken ? `${leadingWhitespace}${commandToken} ` : input;
        } else if (value === '__room__') {
            nextInput = replaceActiveCommandArgumentToken(input, '');
            isVirtualChip = true;
        } else {
            const isFirstStagedArgument = /^(give|put|get)$/.test(commandTokenKey)
                && targetSuggestionResolution.argumentIndex === 0;
            if (isFirstStagedArgument) {
                nextInput = replaceFirstCommandArgument(input, value);
                const commandTokenMatch = /^\s*\S+/.exec(nextInput);
                chipStart = (commandTokenMatch?.[0].length ?? 0) + 1;
            } else {
                const activeToken = /\S+$/.exec(input);
                chipStart = /\s$/.test(input) || !activeToken ? input.length : activeToken.index ?? input.length;
                nextInput = replaceActiveCommandArgumentToken(input, value);
            }
        }
        setInput(nextInput);
        let nextCaretChipKey: string | null = null;
        if (chosenSuggestion && value !== BLANK_TARGET_VALUE) {
            const key = `command-argument-${commandArgumentChipId.current++}`;
            nextCaretChipKey = key;
            setSelectedCommandArguments(current => [...current, {
                key,
                label: chosenSuggestion.label,
                value,
                start: chipStart,
                end: chipStart + value.length,
                suggestions: targetSuggestionResolution.suggestions,
                commandToken: commandTokenKey,
                isVirtual: isVirtualChip,
                snapshot: isVirtualChip ? nextInput : undefined
            }]);
        }
        setCommandArgumentCaretKey(nextCaretChipKey);
        setIsTargetPickerForced(false);
        const caretPosition = value === BLANK_TARGET_VALUE || value === '__room__'
            ? nextInput.length
            : chipStart + value.length;
        requestAnimationFrame(() => {
            const inputElement = inputRef?.current;
            inputElement?.focus();
            inputElement?.setSelectionRange(caretPosition, caretPosition);
        });
    }, [commandTokenKey, input, inputRef, setInput, targetSuggestionResolution, targetSuggestions]);

    const chooseCommandArgumentSuggestion = useCallback((key: string, value: string) => {
        const chip = commandArgumentChips.find(candidate => candidate.key === key);
        const suggestion = chip?.suggestions.find(candidate => candidate.value === value);
        if (!chip || !suggestion) return;

        const nextInput = value === '__room__'
            ? `${input.slice(0, chip.start)}${input.slice(chip.end)}`
            : value === BLANK_TARGET_VALUE
                ? `${input.slice(0, chip.start)}${input.slice(chip.end)}`
                : `${input.slice(0, chip.start)}${value}${input.slice(chip.end)}`;
        setInput(nextInput);
        if (value === BLANK_TARGET_VALUE) {
            setSelectedCommandArguments(current => current.filter(argument => argument.key !== key));
            setCommandArgumentCaretKey(null);
        } else {
            setCommandArgumentCaretKey(key);
            setSelectedCommandArguments(current => current.map(argument => argument.key === key
                ? {
                    ...argument,
                    label: suggestion.label,
                    value,
                    start: chip.start,
                    end: value === '__room__' ? chip.start : chip.start + value.length,
                    isVirtual: value === '__room__',
                    snapshot: value === '__room__' ? nextInput : undefined
                }
                : argument));
        }
        const caretPosition = value === BLANK_TARGET_VALUE
            ? Math.min(chip.start, nextInput.length)
            : value === '__room__'
                ? nextInput.length
                : chip.start + value.length;
        requestAnimationFrame(() => {
            const inputElement = inputRef?.current;
            inputElement?.focus();
            inputElement?.setSelectionRange(caretPosition, caretPosition);
        });
    }, [commandArgumentChips, input, inputRef, setInput]);

    const clearCommandArgumentCaret = useCallback(() => {
        if (!commandArgumentCaretKey) return;
        setCommandArgumentCaretKey(null);
        setSelectedCommandArguments(current => current.filter(argument => argument.key !== commandArgumentCaretKey));
    }, [commandArgumentCaretKey]);

    const handleCommandArgumentKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (event.key !== 'Backspace') {
            const editsTextOrMovesCaret = event.key.length === 1
                || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Delete'].includes(event.key);
            if (editsTextOrMovesCaret) clearCommandArgumentCaret();
            return false;
        }
        const selectionStart = event.currentTarget.selectionStart;
        const selectionEnd = event.currentTarget.selectionEnd;
        if (selectionStart === null || selectionEnd === null || selectionStart !== selectionEnd) {
            clearCommandArgumentCaret();
            return false;
        }

        const chip = commandArgumentChips.find(candidate => candidate.start === candidate.end
            ? selectionStart === candidate.end
            : candidate.start < selectionStart && selectionStart <= candidate.end);
        if (!chip) {
            clearCommandArgumentCaret();
            return false;
        }

        event.preventDefault();
        let removeStart = chip.start;
        let removeEnd = chip.end;
        if (/\s/.test(input[removeEnd] || '')) {
            removeEnd += 1;
        } else if (removeStart > 0 && /\s/.test(input[removeStart - 1])) {
            removeStart -= 1;
        }
        const nextInput = `${input.slice(0, removeStart)}${input.slice(removeEnd)}`;
        setInput(nextInput);
        setCommandArgumentCaretKey(null);
        setSelectedCommandArguments(current => current.filter(argument => argument.key !== chip.key));
        requestAnimationFrame(() => {
            const inputElement = inputRef?.current;
            inputElement?.focus();
            inputElement?.setSelectionRange(removeStart, removeStart);
        });
        return true;
    }, [clearCommandArgumentCaret, commandArgumentChips, input, inputRef, setInput]);

    const toggleMagicKeyFavorite = useCallback((key: string) => {
        setTeleportTargets(current => current.map(target => getMagicKeyId(target) === key
            ? { ...target, isFavorite: !target.isFavorite }
            : target));
    }, [setTeleportTargets]);

    const clearMagicKey = useCallback((key: string) => {
        setTeleportTargets(current => current.filter(target => getMagicKeyId(target) !== key));
    }, [setTeleportTargets]);

    const showCommandPopup = shouldSuggest &&
        !hasCommandArgumentSpace &&
        isFocused &&
        mumeCommandMatch.suggestions.length > 0 &&
        input.trim().length > 0;

    const showTargetPopup = shouldSuggest &&
        (keyedSpellInput ? isFocused : hasCommandArgumentSpace && !isSpellCastInput && (isFocused || isTargetPickerForced)) &&
        targetSuggestions.length > 0;

    const showSpellPopup = shouldSuggest &&
        hasCommandArgumentSpace &&
        isSpellCastInput &&
        isFocused &&
        spellSuggestions.length > 0;

    const showCompletionPopup = showCommandPopup || showTargetPopup || showSpellPopup;

    const visibleCommandSuggestions = useMemo(() => {
        if (!mumeCommandMatch.entry) return mumeCommandMatch.suggestions;
        const otherSuggestions = mumeCommandMatch.suggestions.filter(entry => entry.full !== mumeCommandMatch.entry?.full);
        return [...otherSuggestions, mumeCommandMatch.entry];
    }, [mumeCommandMatch.entry, mumeCommandMatch.suggestions]);

    // Popup positioning
    useEffect(() => {
        if (!showCompletionPopup || !wrapRef?.current) return;

        const updatePopupPosition = () => {
            const rect = wrapRef.current?.getBoundingClientRect();
            if (!rect) return;

            const viewportPadding = 8;
            const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            const magicKeyEntries = showTargetPopup
                ? targetSuggestions.filter(entry => entry.meta === 'magic-key')
                : [];
            const magicKeyWidth = magicKeyEntries.reduce((widest, entry) => {
                const nameWidth = (entry.customLabel || entry.label).length * 7;
                const detailsWidth = `key ${entry.value} · 24h 00m`.length * 6.3;
                return Math.max(widest, Math.ceil(nameWidth + detailsWidth + 125));
            }, 360);
            const desiredWidth = Math.min(
                viewportWidth - viewportPadding * 2,
                magicKeyEntries.length > 0 ? Math.min(640, magicKeyWidth) : 320
            );
            const left = Math.max(viewportPadding, Math.min(rect.left, viewportWidth - desiredWidth - viewportPadding));

            if (positionOverMap && effectivePlacement === 'top') {
                const mapRect = document.querySelector('.map-drawer-desktop.open')?.getBoundingClientRect();
                if (mapRect) {
                    const mapLeft = Math.max(viewportPadding, mapRect.left + viewportPadding);
                    const mapRight = Math.min(mapRect.right - viewportPadding, rect.left - viewportPadding);
                    const availableWidth = mapRight - mapLeft;
                    if (availableWidth >= 140) {
                        const width = Math.min(desiredWidth, availableWidth);
                        const commandLineBottom = wrapRef.current?.closest('.message-log-docked-input')
                            ?.getBoundingClientRect().bottom ?? rect.bottom;
                        const spaceAbove = commandLineBottom - viewportPadding;
                        setPopupStyle({
                            left: Math.round(mapRight - width),
                            top: Math.max(viewportPadding, commandLineBottom),
                            width,
                            maxHeight: Math.max(80, Math.min(260, spaceAbove)),
                            transform: 'translateY(-100%)'
                        });
                        return;
                    }
                }
            }

            if (effectivePlacement === 'bottom') {
                const spaceBelow = viewportHeight - rect.bottom - viewportPadding;
                setPopupStyle({
                    left,
                    top: Math.round(rect.bottom + 4),
                    width: desiredWidth,
                    maxHeight: Math.max(100, Math.min(260, spaceBelow)),
                    transform: 'none'
                });
            } else {
                const spaceAbove = rect.top - viewportPadding - 6;
                setPopupStyle({
                    left,
                    top: Math.max(viewportPadding, rect.top - 6),
                    width: desiredWidth,
                    maxHeight: Math.max(80, Math.min(260, spaceAbove)),
                    transform: 'translateY(-100%)'
                });
            }
        };

        updatePopupPosition();
        window.addEventListener('resize', updatePopupPosition);
        window.addEventListener('scroll', updatePopupPosition, true);
        window.visualViewport?.addEventListener('resize', updatePopupPosition);

        return () => {
            window.removeEventListener('resize', updatePopupPosition);
            window.removeEventListener('scroll', updatePopupPosition, true);
            window.visualViewport?.removeEventListener('resize', updatePopupPosition);
        };
    }, [effectivePlacement, positionOverMap, showCompletionPopup, showTargetPopup, targetSuggestions, wrapRef]);

    const handleSuggestionKeyDown = useCallback((e: KeyboardEvent): boolean => {
        if (disabled) return false;

        if (e.key === 'Tab' && !isMobile) {
            e.preventDefault();
            if (showSpellPopup && spellSuggestions[0]) {
                chooseSpellSuggestion(spellSuggestions[0].value);
                return true;
            } else if (showTargetPopup && selectedTargetSuggestion) {
                chooseTargetSuggestion(selectedTargetSuggestion.value);
                return true;
            } else if (mumeCommandMatch.entry) {
                chooseCommandSuggestion(mumeCommandMatch.entry);
                return true;
            }
        }

        return false;
    }, [chooseCommandSuggestion, chooseSpellSuggestion, chooseTargetSuggestion, disabled, isMobile, mumeCommandMatch.entry, selectedTargetSuggestion, showSpellPopup, showTargetPopup]);

    return {
        commandTextParts,
        mumeCommandMatch,
        showCompletionPopup,
        showCommandPopup,
        showTargetPopup,
        showSpellPopup,
        visibleCommandSuggestions,
        targetSuggestions,
        commandArgumentChips,
        commandArgumentCaretKey,
        selectedTargetSuggestion,
        spellSuggestions,
        popupStyle,
        placement: effectivePlacement,
        isFocused, setIsFocused, setIsTargetPickerForced,
        chooseCommandSuggestion, chooseTargetSuggestion, chooseSpellSuggestion,
        chooseCommandArgumentSuggestion,
        clearCommandArgumentCaret,
        handleCommandArgumentKeyDown,
        toggleMagicKeyFavorite, clearMagicKey,
        handleSuggestionKeyDown
    };
};
