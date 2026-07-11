import { useCallback, useEffect, useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { EntityCapability } from '../../types';
import { getButtonCommand } from '../../utils/buttonUtils';
import { formatMumeTarget, formatNpcKeywordTarget, sanitizeGameTarget } from '../../utils/gameUtils';
import { getEffectiveKeyword } from '../../utils/keywordUtils';
import { getInlineCategoryAxes, normalizeInlineCategoryId } from '../../utils/inlineCategoryAxes';
import { useUIStore } from '../../stores/useUIStore';
import { audioManager } from '../../services/audio/AudioManager';

const isLogBlankTapTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.closest('.inline-btn')) return false;
    return !!target.closest('.message-log, .log-card-drawer') && (
        target.classList.contains('message-log') ||
        target.classList.contains('log-card-drawer') ||
        target.classList.contains('log-bottom-spacer') ||
        target.classList.contains('message-content') ||
        target.classList.contains('content-row') ||
        target.classList.contains('message') ||
        target.hasAttribute('data-index')
    );
};

const stripAnsiCodes = (text: string): string => text.replace(/[\u001b\x1b\u2190]\[[0-9;]*[a-zA-Z]/g, '').trim();

export const useLogClicks = (deps: InteractionDeps, lookModFiredRef: React.MutableRefObject<boolean>, longPressJustFiredRef?: React.MutableRefObject<boolean>, heldBtnFiredRef?: React.MutableRefObject<boolean>) => {
    const {
        executeCommand, setInput, setTarget, triggerHaptic, btn, joystick, target,
        setPopoverState, popoverState, viewport, ui, heldButton, heldButtonRef, setHeldButton,
        isTrackpadModifierActive, keywordOverrides, lastCommandContextRef,
        entities, selectedObjectIds, toggleObjectSelection, clearObjectSelection,
        playClickSound, playEffect, isSoundEnabled, initAudio, setAccountState, accountStageRef
    } = deps;

    const lastLogClickRef = useRef<number>(0);
    const lastBtnClickRef = useRef<number>(0);

    const isTrackpadModifierActiveRef = useRef(isTrackpadModifierActive);
    const isJoystickTargetActiveRef = useRef(joystick.isTargetModifierActive);
    const keywordOverridesRef = useRef(keywordOverrides);

    useEffect(() => { isTrackpadModifierActiveRef.current = isTrackpadModifierActive; }, [isTrackpadModifierActive]);
    useEffect(() => { isJoystickTargetActiveRef.current = joystick.isTargetModifierActive; }, [joystick.isTargetModifierActive]);
    useEffect(() => { keywordOverridesRef.current = keywordOverrides; }, [keywordOverrides]);

    const handleLogDoubleClick = useCallback((e: React.MouseEvent) => {
        let selection = window.getSelection()?.toString().trim();

        if (!selection) {
            const targetEl = (e.target instanceof HTMLElement) ? e.target.closest('.inline-btn') as HTMLElement : (e.target as any)?.parentElement?.closest('.inline-btn') as HTMLElement;
            if (targetEl) {
                selection = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
            } else {
                const ev = e.nativeEvent as any;
                const isMob = window.innerWidth <= 768; // Use direct check as fallback
                const x = ev.clientX || (ev.touches?.[0]?.clientX);
                const y = ev.clientY || (ev.touches?.[0]?.clientY);

                if (x !== undefined && y !== undefined) {
                    let range: Range | null = null;
                    if ((document as any).caretRangeFromPoint) {
                        range = (document as any).caretRangeFromPoint(x, y);
                    }

                    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
                        const offsets = [
                            { dx: -5, dy: -5 }, { dx: 5, dy: -5 },
                            { dx: -5, dy: 5 }, { dx: 5, dy: 5 },
                            { dx: 0, dy: -10 }, { dx: 0, dy: 10 }
                        ];
                        for (const offset of offsets) {
                            const r = (document as any).caretRangeFromPoint(x + offset.dx, y + offset.dy);
                            if (r && r.startContainer.nodeType === Node.TEXT_NODE) {
                                range = r;
                                break;
                            }
                        }
                    }

                    if (range) {
                        const node = range.startContainer;
                        const offset = range.startOffset;
                        if (node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent || "";
                            const beforeStr = text.slice(0, offset);
                            const afterStr = text.slice(offset);

                            const beforeWord = beforeStr.match(/(\w+)$/)?.[1] || "";
                            const afterWord = afterStr.match(/^(\w+)/)?.[1] || "";

                            selection = (beforeWord + afterWord).trim();
                        }
                    }
                }
            }
        }

        if (selection) {
            const cleanSelection = sanitizeGameTarget(selection) || selection;
            setTarget(cleanSelection);
            audioManager.playEffect('target', { skipJitter: true });
            triggerHaptic(30);

            try {
                window.getSelection()?.removeAllRanges();
            } catch (err) {
                // Ignore failures to clear
            }
        }
    }, [setTarget, triggerHaptic]);

    const handleLogClick = useCallback((e: React.MouseEvent) => {
        initAudio(); // Sound fix
        // Allow clicks in mobile portrait even if map is open in gutter
        if (ui.mapExpanded && viewport.isMobile && viewport.isLandscape) return;

        const targetEl = (e.target instanceof HTMLElement) ? e.target.closest('.inline-btn') as HTMLElement : (e.target as any)?.parentElement?.closest('.inline-btn') as HTMLElement;

        // Close shop panel if open when tapping log background (not on an inline button)
        if (useUIStore.getState().isShopOpen && !targetEl) {
            useUIStore.getState().setIsShopOpen(false);
        }

        const now = Date.now();

        const doubleTapThreshold = viewport.isMobile ? 400 : 300;

        if (targetEl) {
            if (now - lastBtnClickRef.current < doubleTapThreshold) {
                lastBtnClickRef.current = 0;
            }
            if (isSoundEnabled) {
                const isTargetableInline = targetEl.getAttribute('data-targetable') !== 'false';
                const action = targetEl.getAttribute('data-action');
                if (!(isTargetableInline && action === 'menu')) {
                    playClickSound();
                }
            }
            lastBtnClickRef.current = now;
        } else {
            if (isLogBlankTapTarget(e.target)) {
                clearObjectSelection();
                setTarget(null);
                setPopoverState(null);
                lastLogClickRef.current = now;
                return;
            }
            if (now - lastLogClickRef.current < doubleTapThreshold) {
                lastLogClickRef.current = 0;
                handleLogDoubleClick(e);
                return;
            }
            lastLogClickRef.current = now;
            return;
        }
        
        const isLong = isJoystickTargetActiveRef.current;
        const isMod = isTrackpadModifierActiveRef.current;

        e.stopPropagation();
        e.preventDefault();

        // Account mode: tapping an account menu command selects it in the gutter
        if (targetEl.classList.contains('account-menu-cmd') && setAccountState) {
            const cmd = targetEl.getAttribute('data-context');
            if (cmd) {
                if (cmd === 'time') {
                    setAccountState(prev => ({ ...prev, selectedMenuCommand: 'time', charCapture: { type: 'time' }, timeLines: [] }));
                    executeCommand(cmd);
                } else if (cmd === 'link') {
                    setAccountState(prev => ({ ...prev, selectedMenuCommand: 'link', charCapture: { type: 'link' }, linkLines: [] }));
                    executeCommand(cmd);
                } else if (cmd === 'lag') {
                    setAccountState(prev => ({ ...prev, selectedMenuCommand: 'lag', charCapture: { type: 'lag' }, lagLines: [] }));
                    executeCommand(cmd);
                } else if (cmd === 'list') {
                    setAccountState(prev => ({ ...prev, selectedMenuCommand: null, characters: [], selectedCharacter: null, charSelectTab: null }));
                    executeCommand(cmd);
                } else if (cmd === 'play') {
                    setAccountState(prev => ({ ...prev, selectedMenuCommand: 'play', characters: [], selectedCharacter: null, charSelectTab: null, isGathering: true }));
                    executeCommand('list', true);
                } else {
                    setAccountState(prev => ({ ...prev, selectedMenuCommand: cmd }));
                }
                triggerHaptic(30);
                return;
            }
        }

        // Account mode: tapping a character name inline button selects that character in the gutter
        if (targetEl.classList.contains('account-char-name') && setAccountState) {
            const name = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
            if (name) {
                setAccountState(prev => {
                    const char = prev.characters.find(c => c.name === name);
                    return char
                        ? { ...prev, selectedCharacter: char, charSelectTab: null, charInfoLines: [], charPracticeLines: [] }
                        : prev;
                });
                triggerHaptic(30);
                return;
            }
        }

        const cmd = targetEl.getAttribute('data-cmd');
        const context = targetEl.getAttribute('data-context');
        const action = targetEl.getAttribute('data-action');
        const fromDrawerStr = targetEl.getAttribute('data-from-drawer');
        const fromDrawer = fromDrawerStr === 'true';
        const category = targetEl.getAttribute('data-category');
        const parentNoun = targetEl.getAttribute('data-parent-noun') || undefined;
        const categoryAxes = getInlineCategoryAxes(category || cmd);
        const menuDisplay = targetEl.getAttribute('data-menu-display') as 'dial' | 'list' || undefined;
        const rawContextStr = context || targetEl.innerText.trim();
        const effectiveContextStr = rawContextStr && keywordOverridesRef.current[rawContextStr] ? keywordOverridesRef.current[rawContextStr] : rawContextStr;
        const contextStr = formatMumeTarget(effectiveContextStr) || effectiveContextStr;
        const displayName = stripAnsiCodes(targetEl.innerText.trim() || rawContextStr);

        const entityId = targetEl.getAttribute('data-id') || '';

        const resolvedKeyword = getEffectiveKeyword(
            displayName,
            targetEl.innerHTML,
            entityId ? entities[entityId] : undefined,
            keywordOverridesRef.current
        );

        const activeHeldButton = heldButtonRef?.current || heldButton;
        const isTargetableInline = targetEl.getAttribute('data-targetable') !== 'false';
        // Remote allies aren't in the room — "look"/"con" always fail or hang for
        // them, so identify via "whois" instead.
        const isRemoteCharacter = categoryAxes.isCharacter && categoryAxes.location === 'none';
        const getInspectState = () => {
            const shouldLook = isTargetableInline && action === 'menu' && categoryAxes.isTargetable && (categoryAxes.isObject || categoryAxes.isCharacter) && !isRemoteCharacter;
            // Consider on both characters (threat assessment) and objects (weapon
            // stats / weight), so the object popover surfaces "con" output too.
            const shouldConsider = shouldLook;
            const shouldWhois = isTargetableInline && action === 'menu' && categoryAxes.isTargetable && isRemoteCharacter;
            return {
                isCapturingExamine: shouldLook,
                isCapturingConsider: shouldConsider,
                capturedExamineLines: undefined,
                capturedConsiderLines: undefined,
                isCapturingWhois: shouldWhois,
                capturedWhoisLines: undefined,
            };
        };
        const runInspectCommands = () => {
            const inspect = getInspectState();
            if (inspect.isCapturingExamine && contextStr) {
                executeCommand(`look ${contextStr}`, true, true, false, false, { shouldFocus: false, fromUi: true });
            }
            if (inspect.isCapturingConsider && contextStr) {
                setTimeout(() => {
                    executeCommand(`con ${contextStr}`, true, true, false, false, { shouldFocus: false, fromUi: true });
                }, 850);
            }
            if (inspect.isCapturingWhois && contextStr) {
                executeCommand(`whois ${contextStr}`, true, true, false, false, { shouldFocus: false, fromUi: true });
            }
        };

        const sourceButton = activeHeldButton
            ? btn.buttons.find(b => b.id === activeHeldButton.id)
            : null;

        if (isTargetableInline && activeHeldButton && sourceButton?.actionType !== 'modifier' && !activeHeldButton.didFire && !activeHeldButton.id.startsWith('log-inline-')) {
            const flashTargetEl = () => {
                targetEl.classList.add('pressed');
                setTimeout(() => targetEl.classList.remove('pressed'), 350);
            };

            if (sourceButton) {
                const resolved = getButtonCommand(sourceButton, activeHeldButton.dx || 0, activeHeldButton.dy || 0, contextStr, undefined, activeHeldButton.modifiers || [], joystick, target, isLong, activeHeldButton.commandPrefixes || []);
                if (resolved?.cmd) {
                    lastCommandContextRef.current = { context: rawContextStr, displayText: targetEl.innerText.trim() };
                    flashTargetEl();
                    executeCommand(resolved.cmd);
                    setHeldButton((prev: any) => prev ? { ...prev, lastTargetFireAt: Date.now() } : null);
                    if (heldBtnFiredRef) heldBtnFiredRef.current = true;
                    triggerHaptic(60);
                    return;
                }
            }

            let finalCmd = isLong ? (activeHeldButton.longCommand || activeHeldButton.baseCommand) : activeHeldButton.baseCommand;

            if (finalCmd) {
                if (contextStr) {
                    if (finalCmd.includes('%n')) finalCmd = finalCmd.replace(/%n/g, contextStr);
                    else finalCmd = `${finalCmd} ${contextStr}`;
                }
                finalCmd = [...(activeHeldButton.commandPrefixes || []), finalCmd].filter(Boolean).join(' ');

                lastCommandContextRef.current = { context: rawContextStr, displayText: targetEl.innerText.trim() };
                flashTargetEl();
                executeCommand(finalCmd);
                setHeldButton((prev: any) => prev ? { ...prev, lastTargetFireAt: Date.now() } : null);
                if (heldBtnFiredRef) heldBtnFiredRef.current = true;
                triggerHaptic(60);
                return;
            }
        } else if (isTargetableInline && (isLong || isTrackpadModifierActiveRef.current)) {
            if (lookModFiredRef.current) {
                lookModFiredRef.current = false;
                return;
            }
            if (contextStr) {
                executeCommand(`look ${contextStr}`);
                joystick.setIsJoystickConsumed(true);
                triggerHaptic(60);
                return;
            }
        }

        if (heldBtnFiredRef?.current) {
            heldBtnFiredRef.current = false;
            return;
        }

        // --- First tap: select a targetable entity ---
        const tapAxes = getInlineCategoryAxes(category);
        const isTargetHighlight = targetEl.classList.contains('target-highlighter') || targetEl.classList.contains('is-target');
        const isEntityTap =
            isTargetableInline &&
            entityId &&
            action === 'menu' &&
            tapAxes.isTargetable &&
            !isLong &&
            !isMod;
        if (isEntityTap) {
            const shopStore = useUIStore.getState();
            if (shopStore.isShopOpen && shopStore.heldShopAction === 'compare' && shopStore.compareFirstTarget !== null) {
                triggerHaptic(30);
                executeCommand(`compare ${shopStore.compareFirstTarget} ${contextStr}`);
                shopStore.setHeldShopAction(null);
                shopStore.setCompareFirstTarget(null);
                return;
            }

            const glowColor = targetEl.style.getPropertyValue('--glow-color').trim();
            const accentColor = glowColor || targetEl.style.color || undefined;
            const isAlreadySelected = shopStore.selectedTarget?.id === entityId;
            const shouldOpenImmediately = tapAxes.isCharacter;
            if (isTargetHighlight || isAlreadySelected || shouldOpenImmediately) {
                if (shouldOpenImmediately && !isTargetHighlight && !isAlreadySelected) {
                    toggleObjectSelection({
                        id: entityId,
                        setId: cmd || undefined,
                        category: category || undefined,
                        context: contextStr || undefined,
                        displayName,
                        keyword: resolvedKeyword || undefined,
                        accentColor,
                        menuDisplay,
                        parentNoun,
                    });
                    setTarget(contextStr || null);
                }
                const rect = targetEl.getBoundingClientRect();
                const sourceRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
                setPopoverState({
                    x: rect.left + rect.width / 2,
                    y: rect.bottom,
                    sourceHeight: rect.height,
                    sourceRect,
                    setId: cmd || category || 'selection',
                    category: category || undefined,
                    context: contextStr || undefined,
                    displayName,
                    keyword: resolvedKeyword || undefined,
                    entityId,
                    menuDisplay,
                    accentColor,
                    preferSide: 'top',
                    parentNoun,
                    ...getInspectState()
                });
                playEffect('actionmenu');
                targetEl.classList.add('menu-active');
                runInspectCommands();
                triggerHaptic(20);
                return;
            }
            toggleObjectSelection({
                id: entityId,
                setId: cmd || undefined,
                category: category || undefined,
                context: contextStr || undefined,
                displayName,
                keyword: resolvedKeyword || undefined,
                accentColor,
                menuDisplay,
                parentNoun,
            });
            setTarget(contextStr || null);
            if (isSoundEnabled) {
                audioManager.playEffect('target', { skipJitter: true });
            }
            if (popoverState && popoverState.entityId !== entityId) {
                setPopoverState(null);
            }
            triggerHaptic(40);
            return;
        }

        if (action === 'menu') {
            const glowColor = targetEl.style.getPropertyValue('--glow-color').trim();
            const accentColor = glowColor || targetEl.style.color || undefined;

            // Toggle logic: If clicking the same non-highlight button, close the popover
            if (!isTargetHighlight && popoverState && popoverState.entityId === entityId && popoverState.setId === (cmd || 'selection')) {
                setPopoverState(null);
                triggerHaptic(10);
                return;
            }

            // Coordinate acquisition with safety fallbacks
            const rect = targetEl.getBoundingClientRect();
            const sourceRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
            setPopoverState({
                x: rect.left + rect.width / 2,
                y: rect.bottom,
                sourceHeight: rect.height,
                sourceRect,
                setId: cmd || 'selection',
                category: category || undefined,
                context: context || undefined,
                displayName,
                keyword: resolvedKeyword || undefined,
                entityId: entityId || undefined,
                menuDisplay,
                accentColor,
                preferSide: 'top',
                parentNoun,
                ...getInspectState()
            });
            playEffect('actionmenu');
            targetEl.classList.add('menu-active');
            runInspectCommands();
            triggerHaptic(20);

        } else if ((action === 'command' || action === 'preload') && cmd) {
            let finalCmd = cmd;
            if (contextStr) {
                if (finalCmd.includes('%n') || finalCmd.includes('$1')) {
                    finalCmd = finalCmd.replace(/%n/g, contextStr).replace(/\$1/g, contextStr);
                } else {
                    finalCmd = `${finalCmd} ${contextStr}`;
                }
            }

            if (action === 'preload' || finalCmd.startsWith('input:')) {
                const isInputPrefix = finalCmd.startsWith('input:');
                const prefill = isInputPrefix ? finalCmd.slice(6) : (finalCmd + (finalCmd.endsWith(' ') ? '' : ' '));
                setInput(prefill);

                const shouldFocus = !viewport.isMobile || isInputPrefix;
                if (shouldFocus) {
                    setTimeout(() => {
                        const inputEl = document.querySelector('input') as HTMLInputElement;
                        if (inputEl) {
                            const wasReadOnly = inputEl.readOnly;
                            if (isInputPrefix && viewport.isMobile) inputEl.readOnly = false;
                            inputEl.focus();
                            if (isInputPrefix && viewport.isMobile) {
                                setTimeout(() => { if (inputEl) inputEl.readOnly = wasReadOnly; }, 100);
                            }
                            const len = inputEl.value.length;
                            inputEl.setSelectionRange(len, len);
                        }
                    }, 10);
                }
            } else {
                const isSilent = targetEl.getAttribute('data-silent') === 'true';
                if (context) lastCommandContextRef.current = { context, displayText: targetEl.innerText.trim() };
                executeCommand(finalCmd, isSilent, false, false, fromDrawer, { shouldFocus: false });
            }
            triggerHaptic(40);
        }

        const accountStage = targetEl.getAttribute('data-account-stage');
        if (accountStage && setAccountState) {
            const stage = accountStage as any;
            accountStageRef.current = stage;
            setAccountState(prev => ({ ...prev, stage }));
        }
    }, [handleLogDoubleClick, viewport.isMobile, heldButton, executeCommand, setHeldButton, triggerHaptic, setPopoverState, setInput, setTarget, ui.mapExpanded, entities, btn, joystick, target, lastCommandContextRef, selectedObjectIds, toggleObjectSelection, clearObjectSelection, isSoundEnabled, playClickSound, playEffect, lookModFiredRef, initAudio, setAccountState, accountStageRef]);

    return { handleLogClick, handleLogDoubleClick };
};
