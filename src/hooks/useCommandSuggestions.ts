/**
 * @file useCommandSuggestions.ts
 * @description Headless hook providing command, spell, and target suggestions and ghost prediction for MUME inputs.
 */

// --- Logic Section ---
import { useState, useMemo, useCallback, useEffect, RefObject, CSSProperties, KeyboardEvent } from 'react';
import { getMumeCommandMatch, replaceMumeCommandToken, MumeCommandEntry, MumeCommandMatch } from '../utils/mumeCommandCatalog';
import { getCastSpellFragment, getCastSpellSuggestions, replaceCastSpellArgument, SpellSuggestion } from '../utils/spellSuggestionUtils';
import { useRoomStore } from '../stores/useRoomStore';
import { useInputStore } from '../stores/useInputStore';
import { DrawerLine, GameState } from '../types/game';
import {
    CommandTargetSuggestion,
    CommandTextParts,
    getGearTargetSuggestions,
    getRoomTargetSuggestions,
    replaceCommandArgumentToken
} from '../utils/commandSuggestionUtils';

export interface UseCommandSuggestionsOptions {
    input: string; setInput: (val: string) => void; gameState: GameState;
    isPasswordMode?: boolean; currentMode?: string;
    abilities?: Record<string, number>; characterClass?: string;
    wrapRef?: RefObject<HTMLElement | null>; inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
    isMobile?: boolean; targetPickerRequestId?: number; placement?: 'top' | 'bottom';
    inventoryLines?: DrawerLine[]; wornLines?: DrawerLine[];
}

export interface UseCommandSuggestionsReturn {
    commandTextParts: CommandTextParts | null; mumeCommandMatch: MumeCommandMatch;
    showCompletionPopup: boolean; showCommandPopup: boolean; showTargetPopup: boolean; showSpellPopup: boolean;
    visibleCommandSuggestions: MumeCommandEntry[]; targetSuggestions: CommandTargetSuggestion[];
    selectedTargetSuggestion: CommandTargetSuggestion | null; spellSuggestions: SpellSuggestion[];
    popupStyle: CSSProperties; placement: 'top' | 'bottom';
    isFocused: boolean; setIsFocused: (val: boolean) => void; setIsTargetPickerForced: (val: boolean) => void;
    chooseCommandSuggestion: (entry: MumeCommandEntry) => void; chooseTargetSuggestion: (val: string) => void;
    chooseSpellSuggestion: (val: string) => void; handleSuggestionKeyDown: (e: KeyboardEvent) => boolean;
}

export const useCommandSuggestions = ({
    input,
    setInput,
    gameState,
    isPasswordMode = false,
    currentMode = 'command',
    abilities = {},
    characterClass = '',
    wrapRef,
    inputRef,
    isMobile = false,
    targetPickerRequestId: propTargetPickerRequestId,
    placement: propPlacement,
    inventoryLines = [],
    wornLines = []
}: UseCommandSuggestionsOptions): UseCommandSuggestionsReturn => {
    const effectivePlacement: 'top' | 'bottom' = propPlacement ?? (isMobile ? 'top' : 'bottom');
    const [isFocused, setIsFocused] = useState(false);
    const [popupStyle, setPopupStyle] = useState<CSSProperties>({});
    const [isTargetPickerForced, setIsTargetPickerForced] = useState(false);

    const chars = useRoomStore(s => s.chars);
    const roomItems = useRoomStore(s => s.items);
    const storeTargetPickerRequestId = useInputStore(s => s.targetPickerRequestId);
    const targetPickerRequestId = propTargetPickerRequestId ?? storeTargetPickerRequestId;

    const shouldSuggest = gameState === 'playing' && currentMode === 'command' && !isPasswordMode;

    const mumeCommandMatch = useMemo(
        () => shouldSuggest ? getMumeCommandMatch(input) : getMumeCommandMatch(''),
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

    const targetFragment = useMemo(() => {
        if (!hasCommandArgumentSpace || !commandTextParts) return '';
        return (commandTextParts.suffix.match(/^\s*(\S*)/)?.[1] ?? '').toLowerCase();
    }, [commandTextParts, hasCommandArgumentSpace]);

    const targetSuggestions = useMemo<CommandTargetSuggestion[]>(() => {
        if (!hasCommandArgumentSpace) return [];

        const command = mumeCommandMatch.entry?.full || commandTextParts?.token.toLowerCase() || '';
        const gearKind = command === 'wear' ? 'inventory' : command === 'remove' ? 'worn' : null;
        const kind = /^(get|take|pick)$/.test(command) ? 'objects'
            : /^(assist|rescue|follow)$/.test(command) ? 'allies' : 'characters';
        const suggestions = gearKind
            ? getGearTargetSuggestions(gearKind === 'inventory' ? inventoryLines : wornLines, gearKind)
            : getRoomTargetSuggestions(Object.values(chars || {}), roomItems, kind);
        return suggestions
            .filter(entry => {
                if (!entry.value) return false;
                if (!targetFragment) return true;
                const cleanValue = entry.value.replace(/^[*-]+|[*-]+$/g, '').toLowerCase();
                const valueLower = entry.value.toLowerCase();
                const labelLower = entry.label.toLowerCase();
                return cleanValue.startsWith(targetFragment) ||
                    valueLower.startsWith(targetFragment) ||
                    labelLower.startsWith(targetFragment) ||
                    labelLower.split(/\s+/).some(w => w.startsWith(targetFragment));
            })
            .slice(0, 8);
    }, [chars, roomItems, inventoryLines, wornLines, commandTextParts?.token, mumeCommandMatch.entry, hasCommandArgumentSpace, targetFragment]);

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
        setInput(replaceCommandArgumentToken(input, value));
        setIsTargetPickerForced(false);
        requestAnimationFrame(() => inputRef?.current?.focus());
    }, [input, inputRef, setInput]);

    const showCommandPopup = shouldSuggest &&
        !hasCommandArgumentSpace &&
        isFocused &&
        mumeCommandMatch.suggestions.length > 0 &&
        input.trim().length > 0;

    const showTargetPopup = shouldSuggest &&
        hasCommandArgumentSpace &&
        !isSpellCastInput &&
        (isFocused || isTargetPickerForced) &&
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
            const desiredWidth = Math.min(320, viewportWidth - viewportPadding * 2);
            const left = Math.max(viewportPadding, Math.min(rect.left, viewportWidth - desiredWidth - viewportPadding));

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
    }, [effectivePlacement, showCompletionPopup, wrapRef]);

    const handleSuggestionKeyDown = useCallback((e: KeyboardEvent): boolean => {
        const isNumpad = e.location === 3 || e.code.startsWith('Numpad');

        if (showCompletionPopup && !isNumpad && /^[0-9]$/.test(e.key)) {
            const optionIndex = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
            if (showSpellPopup) {
                const option = spellSuggestions[optionIndex];
                if (option) {
                    e.preventDefault();
                    chooseSpellSuggestion(option.value);
                    return true;
                }
            } else if (showTargetPopup) {
                const option = targetSuggestions[optionIndex];
                if (option) {
                    e.preventDefault();
                    chooseTargetSuggestion(option.value);
                    return true;
                }
            } else if (showCommandPopup) {
                const option = visibleCommandSuggestions[optionIndex];
                if (option) {
                    e.preventDefault();
                    chooseCommandSuggestion(option);
                    return true;
                }
            }
        }

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
    }, [chooseCommandSuggestion, chooseSpellSuggestion, chooseTargetSuggestion, isMobile, mumeCommandMatch.entry, selectedTargetSuggestion, showCommandPopup, showCompletionPopup, showSpellPopup, showTargetPopup, spellSuggestions, targetSuggestions, visibleCommandSuggestions]);

    return {
        commandTextParts,
        mumeCommandMatch,
        showCompletionPopup,
        showCommandPopup,
        showTargetPopup,
        showSpellPopup,
        visibleCommandSuggestions,
        targetSuggestions,
        selectedTargetSuggestion,
        spellSuggestions,
        popupStyle,
        placement: effectivePlacement,
        isFocused, setIsFocused, setIsTargetPickerForced,
        chooseCommandSuggestion, chooseTargetSuggestion, chooseSpellSuggestion,
        handleSuggestionKeyDown
    };
};
