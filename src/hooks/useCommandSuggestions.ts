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
import { useCommandActionSuggestions } from './useCommandActionSuggestions';
import { getCommandTextColor } from '../utils/swipeCommandColors';
import { useInputStore } from '../stores/useInputStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useUIStore } from '../stores/useUIStore';
import { useCommandAliasStore } from '../stores/useCommandAliasStore';
import { resolveAliasSuggestionCommand } from './aliasSuggestionCommand';
import { useVitals } from '../context/GameContext';
import { DrawerLine, GameState } from '../types/game';
import type { PracticeSkill } from '../types';
import {
    CommandTargetSuggestion,
    CommandTextParts,
    getMagicKeyTargetSuggestions,
    getRescueTargetSuggestions,
    isTargetSuggestionMatch,
    makeCommandTargetSuggestion,
    prioritizeTargetSuggestion
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
    openCommunicationComposer?: (command: string) => boolean;
    inventoryLines?: DrawerLine[]; wornLines?: DrawerLine[];
    characterName?: string; practiceSkills?: PracticeSkill[]; preferredTarget?: string | null;
}

export interface UseCommandSuggestionsReturn {
    commandTextColor?: string;
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

const getCommandArgumentLabel = (suggestion: CommandTargetSuggestion): string => {
    if (suggestion.meta === 'magic-key' || suggestion.meta === 'shop-item'
        || suggestion.value === '__room__' || suggestion.value === BLANK_TARGET_VALUE) {
        return suggestion.customLabel || suggestion.label;
    }
    return suggestion.keyword || suggestion.value;
};

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
    practiceSkills = [],
    preferredTarget = null,
    openCommunicationComposer
}: UseCommandSuggestionsOptions): UseCommandSuggestionsReturn => {
    const effectivePlacement: 'top' | 'bottom' = propPlacement ?? (isMobile ? 'top' : 'bottom');
    const reverseCommandTargets = useCommandActionSuggestions(abilities, inventoryLines, wornLines, characterName);
    const [isFocused, setIsFocused] = useState(false);
    const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
    const updatePopupStyle = useCallback((next: CSSProperties) => {
        setPopupStyle(current => current.left === next.left && current.top === next.top
            && current.width === next.width && current.maxHeight === next.maxHeight
            && current.transform === next.transform ? current : next);
    }, []);
    const [isTargetPickerForced, setIsTargetPickerForced] = useState(false);
    const [selectedCommandArguments, setSelectedCommandArguments] = useState<SelectedCommandArgumentChip[]>([]);
    const [commandArgumentCaretKey, setCommandArgumentCaretKey] = useState<string | null>(null);
    const commandArgumentChipId = useRef(0);

    const chars = useRoomStore(s => s.chars);
    const rawExits = useRoomStore(s => s.rawExits);
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
    const aliases = useCommandAliasStore(state => state.aliases);

    const mumeCommandMatch = useMemo(
        () => shouldSuggest ? getMumeCommandMatch(input, 8, aliases) : getMumeCommandMatch(''),
        [aliases, input, shouldSuggest]
    );
    const isAliasInput = Boolean(mumeCommandMatch.entry?.aliasExpansion);

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
    const hasExplicitCommandArgument = Boolean(commandTextParts?.suffix.trim());
    const aliasCommand = useMemo(() => resolveAliasSuggestionCommand(
        mumeCommandMatch.entry?.aliasExpansion, commandTextParts?.suffix || ''
    ), [mumeCommandMatch.entry, commandTextParts?.suffix]);
    const suggestionInput = aliasCommand?.command || input;
    const keyedSpellInput = useMemo(() => parseKeyedSpellCommand(suggestionInput), [suggestionInput]);
    const commandToken = aliasCommand?.token || mumeCommandMatch.entry?.full || commandTextParts?.token.toLowerCase() || '';
    const commandTokenKey = commandToken.toLowerCase();
    const commandTextColor = getCommandTextColor(aliasCommand?.command || `${commandToken}${commandTextParts?.suffix || ''}`);
    const targetMenuKind = getCommandTargetMenuKind(aliasCommand?.command || `${commandToken}${commandTextParts?.suffix || ''}`);

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

    // Mobile keyboards can update text without a printable keydown event.
    useEffect(() => {
        if (!commandArgumentCaretKey) return;
        const chip = commandArgumentChips.find(candidate => candidate.key === commandArgumentCaretKey);
        if (!chip || /\S/.test(input.slice(chip.end))) {
            setCommandArgumentCaretKey(null);
        }
    }, [commandArgumentCaretKey, commandArgumentChips, input]);

    const targetSuggestionResolution = useMemo<ResolvedCommandTargetSuggestions>(() => {
        const suggestionCommand = aliasCommand?.command || `${commandToken}${commandTextParts?.suffix || ''}`;
        const isRoomInspectionCommand = /^(?:look|examine|consider)(?:\s|$)/i.test(suggestionCommand.trim());
        if (!keyedSpellInput && !isRoomInspectionCommand && commandTextParts && (!isAliasInput || aliasCommand)) {
            const reversed = reverseCommandTargets((aliasCommand?.command || `${commandToken}${commandTextParts.suffix}`).trim());
            if (reversed) return reversed;
        }
        if (isAliasInput && (!aliasCommand || !getCommandTargetMenuKind(aliasCommand.command))) {
            return { suggestions: [], fragment: '', argumentIndex: 0 };
        }
        if (keyedSpellInput) {
            const fragment = keyedSpellInput.target.toLowerCase();
            const suggestions = getMagicKeyTargetSuggestions(teleportTargets)
                .filter(entry => !fragment || [entry.value, entry.label, entry.customLabel]
                    .some(value => value?.toLowerCase().startsWith(fragment)))
                .slice(0, 10);
            return { suggestions, fragment, argumentIndex: 0 };
        }
        if (!hasCommandArgumentSpace || !commandTextParts) return { suggestions: [], fragment: '', argumentIndex: 0 };

        const command = (aliasCommand?.command || `${commandToken}${commandTextParts?.suffix || ''}`).trim();
        if (/^rescue(?:\s|$)/i.test(command)) {
            return {
                suggestions: getRescueTargetSuggestions(Object.values(chars || {}), characterName, groupMembers),
                fragment: commandTextParts?.suffix.trim().split(/\s+/, 1)[0] || '',
                argumentIndex: 0
            };
        }
        return resolveCommandTargetSuggestions({
            rawExits,
            command,
            argumentText: aliasCommand?.argumentText || commandTextParts?.suffix || '',
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
    }, [abilities, aliasCommand, characterName, chars, rawExits, commandTextParts, commandToken, groupMembers, hasCommandArgumentSpace, inventoryLines, isAliasInput, keyedSpellInput, practiceSkills, reverseCommandTargets, roomItems, roomWaterAvailable, shopItems, teleportTargets, whoList, wornLines]);

    const canSuggestLockedTarget = Boolean(preferredTarget?.trim()) && !keyedSpellInput
        && !/^(?:assist|ass)(?:\s|$)/i.test(suggestionInput.trim()) && (
        Boolean(targetSuggestionResolution.isActionDerived)
        || (hasCommandArgumentSpace && ['room', 'bash', 'room-spell', 'room-spell-with-extras'].includes(targetMenuKind || ''))
    );

    const targetSuggestions = useMemo<CommandTargetSuggestion[]>(() => {
        const isStagedCommand = /^(give|put|get)$/.test(commandTokenKey)
            || (commandTokenKey === 'look' && commandArgumentChips.some(chip => chip.value === 'in'));
        const maxSelectedArguments = isStagedCommand ? 2 : 1;
        if (commandArgumentChips.length >= maxSelectedArguments) return [];

        const fragment = targetSuggestionResolution.fragment.toLowerCase();
        const matchingSuggestions = targetSuggestionResolution.suggestions.filter(entry => {
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
        });
        const targetToPrioritize = canSuggestLockedTarget ? preferredTarget : null;
        const lockedTargetSuggestion = targetToPrioritize
            ? targetSuggestionResolution.suggestions.find(entry => isTargetSuggestionMatch(entry, targetToPrioritize))
                || makeCommandTargetSuggestion(targetToPrioritize.trim(), targetToPrioritize.trim(), 'selected-target')
            : null;
        if (lockedTargetSuggestion) {
            const otherSuggestions = matchingSuggestions.filter(entry => !isTargetSuggestionMatch(entry, targetToPrioritize));
            return [{ ...lockedTargetSuggestion, isCurrentTarget: true }, ...otherSuggestions].slice(0, 8);
        }

        const prioritizedSuggestions = prioritizeTargetSuggestion(matchingSuggestions, targetToPrioritize);
        return prioritizedSuggestions.slice(0, 8)
            .map((entry, index) => index === 0 && isTargetSuggestionMatch(entry, targetToPrioritize)
                ? { ...entry, isCurrentTarget: true } : entry);
    }, [canSuggestLockedTarget, commandArgumentChips, commandTokenKey, preferredTarget, targetSuggestionResolution]);

    const selectedTargetSuggestion = targetSuggestions[0] ?? null;

    useEffect(() => {
        if (targetPickerRequestId > 0) setIsTargetPickerForced(true);
    }, [targetPickerRequestId]);

    useEffect(() => {
        if (!hasCommandArgumentSpace) setIsTargetPickerForced(false);
    }, [hasCommandArgumentSpace]);

    const spellSuggestions = useMemo(() => {
        if (!shouldSuggest || (isAliasInput && !aliasCommand)) return [];
        return getCastSpellSuggestions(suggestionInput, abilities, characterClass);
    }, [abilities, aliasCommand, characterClass, isAliasInput, shouldSuggest, suggestionInput]);

    const isSpellCastInput = (!isAliasInput || Boolean(aliasCommand)) && getCastSpellFragment(suggestionInput) !== null;

    const chooseSpellSuggestion = useCallback((spell: string) => {
        const completed = replaceCastSpellArgument(suggestionInput, spell);
        setInput(aliasCommand
            ? `${input.match(/^\s*\S+/)?.[0] || ''} ${completed.slice(aliasCommand.prefix.length).trimStart()}`
            : completed);
        requestAnimationFrame(() => inputRef?.current?.focus());
    }, [aliasCommand, input, inputRef, setInput, suggestionInput]);

    const chooseCommandSuggestion = useCallback((entry: MumeCommandEntry) => {
        const nextInput = replaceMumeCommandToken(input, entry);
        if (entry.aliasExpansion || !openCommunicationComposer?.(nextInput)) setInput(nextInput);
        requestAnimationFrame(() => inputRef?.current?.focus());
    }, [input, inputRef, setInput, openCommunicationComposer]);

    const chooseTargetSuggestion = useCallback((value: string) => {
        const keyedSpell = parseKeyedSpellCommand(input);
        const quotedSpell = input.match(/^(\s*(?:cast|c|commune)\s+(['"])[^'"]+\2)\s*(.*)$/i);
        const chosenSuggestion = targetSuggestions.find(entry => entry.value === value);
        let nextInput = input;
        let chipStart = input.length;
        let isVirtualChip = false;
        if (keyedSpell) {
            nextInput = `${keyedSpell.prefix} ${value}`;
            chipStart = nextInput.length - value.length;
        } else if (quotedSpell && value !== BLANK_TARGET_VALUE && value !== '__room__') {
            nextInput = `${quotedSpell[1]} ${value}`;
            chipStart = quotedSpell[1].length + 1;
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
            } else if (!hasExplicitCommandArgument) {
                const leadingWhitespace = input.match(/^\s*/)?.[0] ?? '';
                const commandToken = input.slice(leadingWhitespace.length).match(/^\S+/)?.[0] ?? '';
                nextInput = commandToken ? `${leadingWhitespace}${commandToken} ${value}` : `${input}${value}`;
                chipStart = commandToken ? leadingWhitespace.length + commandToken.length + 1 : input.length;
            } else {
                const activeToken = /\S+$/.exec(input);
                chipStart = /\s$/.test(input) || !activeToken ? input.length : activeToken.index ?? input.length;
                nextInput = replaceActiveCommandArgumentToken(input, value);
            }
        }
        if (!aliasCommand && openCommunicationComposer?.(nextInput)) {
            setSelectedCommandArguments([]);
            setCommandArgumentCaretKey(null);
            setIsTargetPickerForced(false);
            requestAnimationFrame(() => {
                const element = inputRef?.current;
                element?.focus();
                element?.setSelectionRange(element.value.length, element.value.length);
            });
            return;
        }
        setInput(nextInput);
        let nextCaretChipKey: string | null = null;
        if (chosenSuggestion && value !== BLANK_TARGET_VALUE) {
            const key = `command-argument-${commandArgumentChipId.current++}`;
            nextCaretChipKey = key;
            setSelectedCommandArguments(current => [...current, {
                key,
                label: getCommandArgumentLabel(chosenSuggestion),
                value,
                start: chipStart,
                end: chipStart + value.length,
                suggestions: [chosenSuggestion, ...targetSuggestionResolution.suggestions.filter(entry => entry.value !== chosenSuggestion.value)],
                commandToken: commandTokenKey,
                isVirtual: isVirtualChip,
                snapshot: isVirtualChip ? nextInput : undefined
            }]);
        }
        const chipEnd = chipStart + value.length;
        const hasFollowingText = /\S/.test(nextInput.slice(chipEnd));
        setCommandArgumentCaretKey(hasFollowingText ? null : nextCaretChipKey);
        setIsTargetPickerForced(false);
        const caretPosition = value === BLANK_TARGET_VALUE || value === '__room__' || hasFollowingText
            ? nextInput.length
            : chipEnd;
        requestAnimationFrame(() => {
            const inputElement = inputRef?.current;
            inputElement?.focus();
            inputElement?.setSelectionRange(caretPosition, caretPosition);
        });
    }, [aliasCommand, commandTextParts, commandTokenKey, input, inputRef, setInput, targetSuggestionResolution, targetSuggestions, openCommunicationComposer]);

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
        const chipEnd = value === '__room__' || value === BLANK_TARGET_VALUE ? chip.start : chip.start + value.length;
        const hasFollowingText = /\S/.test(nextInput.slice(chipEnd));
        if (value === BLANK_TARGET_VALUE) {
            setSelectedCommandArguments(current => current.filter(argument => argument.key !== key));
            setCommandArgumentCaretKey(null);
        } else {
            setCommandArgumentCaretKey(hasFollowingText ? null : key);
            setSelectedCommandArguments(current => current.map(argument => argument.key === key
                ? {
                    ...argument,
                    label: getCommandArgumentLabel(suggestion),
                    value,
                    start: chip.start,
                    end: value === '__room__' ? chip.start : chip.start + value.length,
                    isVirtual: value === '__room__',
                    snapshot: value === '__room__' ? nextInput : undefined
                }
                : argument));
        }
        const caretPosition = hasFollowingText
            ? nextInput.length
            : value === BLANK_TARGET_VALUE
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

    const suggestionInputActive = isFocused || isMobile;

    const showCommandPopup = shouldSuggest &&
        !hasCommandArgumentSpace &&
        suggestionInputActive &&
        mumeCommandMatch.suggestions.length > 0 &&
        input.trim().length > 0;

    const showTargetPopup = Boolean(shouldSuggest &&
        (keyedSpellInput
            ? suggestionInputActive
            : (hasCommandArgumentSpace && !isSpellCastInput && (suggestionInputActive || isTargetPickerForced))
                || (Boolean(targetSuggestionResolution.isActionDerived) && suggestionInputActive)) &&
        targetSuggestions.length > 0);

    const showSpellPopup = shouldSuggest &&
        hasCommandArgumentSpace &&
        isSpellCastInput &&
        suggestionInputActive &&
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
                        const commandLineRect = wrapRef.current?.closest('.command-dock-input-main, .message-log-docked-input')
                            ?.getBoundingClientRect();
                        const popupBottom = commandLineRect && commandLineRect.height > 0
                            ? commandLineRect.top - 4 : rect.bottom;
                        const spaceAbove = popupBottom - viewportPadding;
                        updatePopupStyle({
                            left: Math.round(mapRight - width),
                            top: Math.max(viewportPadding, popupBottom),
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
                updatePopupStyle({
                    left,
                    top: Math.round(rect.bottom + 4),
                    width: desiredWidth,
                    maxHeight: Math.max(100, Math.min(260, spaceBelow)),
                    transform: 'none'
                });
            } else {
                const spaceAbove = rect.top - viewportPadding - 6;
                updatePopupStyle({
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
    }, [effectivePlacement, positionOverMap, showCompletionPopup, showTargetPopup, targetSuggestions, wrapRef, updatePopupStyle]);

    const handleSuggestionKeyDown = useCallback((e: KeyboardEvent): boolean => {
        if (disabled) return false;

        if (e.key === 'Tab' && !isMobile) {
            e.preventDefault();
            if (showSpellPopup && spellSuggestions[0]) {
                chooseSpellSuggestion(spellSuggestions[0].value);
                return true;
            } else if (showTargetPopup && selectedTargetSuggestion && (hasCommandArgumentSpace || isTargetPickerForced)) {
                chooseTargetSuggestion(selectedTargetSuggestion.value);
                return true;
            } else if (mumeCommandMatch.entry) {
                chooseCommandSuggestion(mumeCommandMatch.entry);
                return true;
            }
        }

        return false;
    }, [chooseCommandSuggestion, chooseSpellSuggestion, chooseTargetSuggestion, disabled, hasCommandArgumentSpace, isMobile, isTargetPickerForced, mumeCommandMatch.entry, selectedTargetSuggestion, showSpellPopup, showTargetPopup]);

    return {
        commandTextColor,
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
