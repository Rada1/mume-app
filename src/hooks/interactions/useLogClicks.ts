import { useCallback, useEffect, useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { EntityCapability } from '../../types';
import { getButtonCommand } from '../../utils/buttonUtils';
import { sanitizeGameTarget } from '../../utils/gameUtils';

export const useLogClicks = (deps: InteractionDeps, lookModFiredRef: React.MutableRefObject<boolean>, longPressJustFiredRef?: React.MutableRefObject<boolean>) => {
    const {
        executeCommand, setInput, setTarget, triggerHaptic, btn, joystick, target,
        setPopoverState, popoverState, viewport, ui, heldButton, heldButtonRef, setHeldButton,
        isTrackpadModifierActive, keywordOverrides, lastCommandContextRef,
        entities, selectedObjectIds, toggleObjectSelection, clearObjectSelection,
        playClickSound, isSoundEnabled, initAudio, setAccountState, accountStageRef
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

        const now = Date.now();
        const targetEl = (e.target instanceof HTMLElement) ? e.target.closest('.inline-btn') as HTMLElement : (e.target as any)?.parentElement?.closest('.inline-btn') as HTMLElement;

        const doubleTapThreshold = viewport.isMobile ? 400 : 300;

        if (targetEl) {
            if (now - lastBtnClickRef.current < doubleTapThreshold) {
                lastBtnClickRef.current = 0;
                const context = targetEl.getAttribute('data-context') || targetEl.innerText.trim();
                if (context) {
                    setTarget(context);
                    triggerHaptic(30);
                    e.stopPropagation();
                }
                return;
            }
            if (isSoundEnabled) playClickSound();
            lastBtnClickRef.current = now;
        } else {
            if (selectedObjectIds.size > 0) {
                clearObjectSelection();
                triggerHaptic(20);
                e.stopPropagation();
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
 
        if (selectedObjectIds.size > 0 && targetEl && !isLong && !isMod) {
            // Absorb the click that always fires after a long-press selection to
            // prevent it from immediately un-toggling the item that was just added.
            if (longPressJustFiredRef?.current) {
                longPressJustFiredRef.current = false;
                e.stopPropagation();
                return;
            }
            const id = targetEl.getAttribute('data-id') || '';
            const setId = targetEl.getAttribute('data-cmd') || '';
            const context = targetEl.getAttribute('data-context') || '';
            if (id) {
                toggleObjectSelection(id, setId, context);
                triggerHaptic(40);
            }
            e.stopPropagation();
            return;
        }

        e.stopPropagation();
        e.preventDefault();

        const cmd = targetEl.getAttribute('data-cmd');
        const kind = targetEl.getAttribute('data-kind');
        const location = targetEl.getAttribute('data-location');
        const context = targetEl.getAttribute('data-context');
        const action = targetEl.getAttribute('data-action');
        const fromDrawerStr = targetEl.getAttribute('data-from-drawer');
        const fromDrawer = fromDrawerStr === 'true';
        const category = targetEl.getAttribute('data-category');
        const menuDisplay = targetEl.getAttribute('data-menu-display') as 'dial' | 'list' || undefined;
        const rawContextStr = context || targetEl.innerText.trim();
        const effectiveContextStr = rawContextStr && keywordOverridesRef.current[rawContextStr] ? keywordOverridesRef.current[rawContextStr] : rawContextStr;
        const contextStr = sanitizeGameTarget(effectiveContextStr) || effectiveContextStr;

        const entityId = targetEl.getAttribute('data-id') || '';

        const activeHeldButton = heldButtonRef?.current || heldButton;

        if (activeHeldButton && !activeHeldButton.didFire && !activeHeldButton.id.startsWith('log-inline-')) {
            const sourceButton = btn.buttons.find(b => b.id === activeHeldButton.id);
            if (sourceButton) {
                const resolved = getButtonCommand(sourceButton, activeHeldButton.dx || 0, activeHeldButton.dy || 0, contextStr, undefined, activeHeldButton.modifiers || [], joystick, target, isLong);
                if (resolved?.cmd) {
                    lastCommandContextRef.current = { context: rawContextStr, displayText: targetEl.innerText.trim() };
                    executeCommand(resolved.cmd);
                    setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
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

                lastCommandContextRef.current = { context: rawContextStr, displayText: targetEl.innerText.trim() };
                executeCommand(finalCmd);
                setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                triggerHaptic(60);
                return;
            }
        } else if (isLong || isTrackpadModifierActiveRef.current) {
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

        if (action === 'menu') {
            const glowColor = targetEl.style.getPropertyValue('--glow-color').trim();
            const accentColor = glowColor || targetEl.style.color || undefined;

            // Toggle logic: If clicking the same button, close the popover
            if (popoverState && popoverState.entityId === entityId && popoverState.setId === (cmd || 'selection')) {
                setPopoverState(null);
                triggerHaptic(10);
                return;
            }

            // Coordinate acquisition with safety fallbacks
            let x = e.clientX;
            let y = e.clientY;

            // If coordinates are 0 (can happen on some mobile interactions), 
            // fallback to the element's position or the native event.
            if (!x && !y) {
                const native = e.nativeEvent as MouseEvent;
                x = native.clientX;
                y = native.clientY;
            }

            // Absolute fallback: button center
            if (!x && !y) {
                const rect = targetEl.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
            }

            setPopoverState({
                x,
                y,
                setId: cmd || 'selection',
                kind: kind || undefined,
                location: location || undefined,
                category: category || undefined,
                context: context || undefined,
                entityId: entityId || undefined,
                menuDisplay,
                accentColor
            });
            targetEl.classList.add('menu-active');
            triggerHaptic(20);

        } else if ((action === 'command' || action === 'preload') && cmd) {
            let finalCmd = cmd;
            if (context) {
                if (finalCmd.includes('%n') || finalCmd.includes('$1')) {
                    finalCmd = finalCmd.replace(/%n/g, context).replace(/\$1/g, context);
                } else {
                    finalCmd = `${finalCmd} ${context}`;
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
        } else if (cmd === 'target' && context) {
            setTarget(context);
            triggerHaptic(30);
        }

        const accountStage = targetEl.getAttribute('data-account-stage');
        if (accountStage && setAccountState) {
            const stage = accountStage as any;
            accountStageRef.current = stage;
            setAccountState(prev => ({ ...prev, stage }));
        }
    }, [handleLogDoubleClick, viewport.isMobile, heldButton, executeCommand, setHeldButton, triggerHaptic, setPopoverState, setInput, setTarget, ui.mapExpanded, entities, btn, joystick, target, lastCommandContextRef, selectedObjectIds, toggleObjectSelection, clearObjectSelection, isSoundEnabled, playClickSound, lookModFiredRef, initAudio, setAccountState, accountStageRef]);

    return { handleLogClick, handleLogDoubleClick };
};
