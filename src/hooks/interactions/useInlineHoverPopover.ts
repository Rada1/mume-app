/**
 * @file useInlineHoverPopover.ts
 * @description Opens inline entity popovers on desktop hover and starts lightweight inspection captures.
 */

import React from 'react';
import { PopoverState } from '../../types';
import { formatNpcKeywordTarget, sanitizeGameTarget } from '../../utils/gameUtils';
import { getInlineCategoryAxes } from '../../utils/inlineCategoryAxes';

// --- Types Section ---

interface InlineHoverPopoverDeps {
    containerRef: React.RefObject<HTMLElement>;
    enabled: boolean;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    keywordOverrides?: Record<string, string>;
    popoverState: PopoverState | null;
    setPopoverState: (state: PopoverState | null) => void;
}

interface HoverTarget {
    element: HTMLElement;
    entityId: string;
    setId: string;
    category?: string;
    context: string;
    displayName: string;
    keyword: string;
    parentNoun?: string;
    menuDisplay?: 'list' | 'dial';
    accentColor?: string;
    shouldLook: boolean;
    shouldConsider: boolean;
    shouldWhois: boolean;
}

// --- Logic Section ---

const OPEN_DELAY_MS = 0;
const CONSIDER_DELAY_MS = 850;
const CLOSE_GRACE_MS = 180;

const stripAnsiCodes = (text: string): string => text.replace(/[\u001b\x1b\u2190]\[[0-9;]*[a-zA-Z]/g, '').trim();

const resolveHoverTarget = (element: HTMLElement, keywordOverrides: Record<string, string>): HoverTarget | null => {
    if (element.getAttribute('data-action') !== 'menu') return null;
    if (element.getAttribute('data-menu-display') === 'dial') return null;

    const rawContext = element.getAttribute('data-context') || element.innerText.trim();
    if (!rawContext) return null;

    const category = element.getAttribute('data-category') || undefined;
    const cmd = element.getAttribute('data-cmd') || category || 'selection';
    const axes = getInlineCategoryAxes(category || cmd);
    if (!axes.isInlineAction && !axes.isTargetable) return null;

    const effectiveContext = keywordOverrides[rawContext] || rawContext;
    const context = axes.isCharacter || cmd.startsWith('npc')
        ? formatNpcKeywordTarget(effectiveContext) || effectiveContext
        : sanitizeGameTarget(effectiveContext) || effectiveContext;
    const displayName = stripAnsiCodes(element.innerText.trim() || rawContext);
    const entityId = element.getAttribute('data-id') || `${cmd}:${context}`;
    const glowColor = element.style.getPropertyValue('--glow-color').trim();

    // Remote allies aren't in the room — "look"/"con" always fail or hang for
    // them, so identify via "whois" instead.
    const isRemoteCharacter = axes.isCharacter && axes.location === 'none';

    return {
        element,
        entityId,
        setId: cmd,
        category,
        context,
        displayName,
        keyword: context,
        parentNoun: element.getAttribute('data-parent-noun') || undefined,
        menuDisplay: 'list',
        accentColor: glowColor || element.style.color || undefined,
        shouldLook: axes.isTargetable && (axes.isObject || axes.isCharacter) && !isRemoteCharacter,
        // Consider objects too (weapon stats / weight), not just characters.
        shouldConsider: axes.isTargetable && (axes.isObject || axes.isCharacter) && !isRemoteCharacter,
        shouldWhois: axes.isTargetable && isRemoteCharacter
    };
};

export const useInlineHoverPopover = ({
    containerRef,
    enabled,
    executeCommand,
    keywordOverrides = {},
    popoverState,
    setPopoverState
}: InlineHoverPopoverDeps) => {
    const activeTargetRef = React.useRef<HoverTarget | null>(null);
    const popoverStateRef = React.useRef<PopoverState | null>(popoverState);
    const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const considerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        popoverStateRef.current = popoverState;
    }, [popoverState]);

    React.useEffect(() => {
        if (!enabled) return undefined;
        const container = containerRef.current;
        if (!container) return undefined;

        const clearOpenTimer = () => {
            if (openTimerRef.current) clearTimeout(openTimerRef.current);
            openTimerRef.current = null;
        };

        const clearCloseTimer = () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        };

        const clearConsiderTimer = () => {
            if (considerTimerRef.current) clearTimeout(considerTimerRef.current);
            considerTimerRef.current = null;
        };

        const closeHoverPopover = () => {
            activeTargetRef.current?.element.classList.remove('menu-active');
            activeTargetRef.current = null;
            clearOpenTimer();
            clearCloseTimer();
            clearConsiderTimer();
            if (popoverStateRef.current?.openedByHover) {
                setPopoverState(null);
            }
        };

        const scheduleClose = () => {
            clearCloseTimer();
            closeTimerRef.current = setTimeout(closeHoverPopover, CLOSE_GRACE_MS);
        };

        const isInsideHoverSurface = (target: EventTarget | null) => {
            if (!(target instanceof HTMLElement)) return false;
            const activeElement = activeTargetRef.current?.element;
            if (activeElement?.contains(target)) return true;
            if (target.closest('.popover-menu')) return true;
            const nextInline = target.closest('.inline-btn') as HTMLElement | null;
            return !!nextInline && container.contains(nextInline);
        };

        const openTarget = (target: HoverTarget) => {
            const rect = target.element.getBoundingClientRect();
            const sourceRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
            activeTargetRef.current?.element.classList.remove('menu-active');
            activeTargetRef.current = target;
            target.element.classList.add('menu-active');

            setPopoverState({
                x: rect.left + rect.width / 2,
                y: rect.bottom,
                sourceHeight: rect.height,
                sourceRect,
                type: 'menu',
                setId: target.setId,
                category: target.category,
                context: target.context,
                displayName: target.displayName,
                keyword: target.keyword,
                entityId: target.entityId,
                menuDisplay: target.menuDisplay,
                accentColor: target.accentColor,
                preferSide: 'top',
                parentNoun: target.parentNoun,
                isCapturingExamine: target.shouldLook,
                isCapturingConsider: target.shouldConsider,
                capturedExamineLines: undefined,
                capturedConsiderLines: undefined,
                isCapturingWhois: target.shouldWhois,
                capturedWhoisLines: undefined,
                openedByHover: true
            });

            if (target.shouldLook) {
                executeCommand(`look ${target.context}`, true, true, false, false, { shouldFocus: false, fromUi: true });
            }

            if (target.shouldConsider) {
                clearConsiderTimer();
                considerTimerRef.current = setTimeout(() => {
                    executeCommand(`con ${target.context}`, true, true, false, false, { shouldFocus: false, fromUi: true });
                }, CONSIDER_DELAY_MS);
            }

            if (target.shouldWhois) {
                executeCommand(`whois ${target.context}`, true, true, false, false, { shouldFocus: false, fromUi: true });
            }
        };

        const handlePointerOver = (event: PointerEvent) => {
            if (event.pointerType && event.pointerType !== 'mouse') return;
            if (event.buttons !== 0) return;
            const targetElement = event.target instanceof HTMLElement
                ? event.target.closest('.inline-btn') as HTMLElement | null
                : null;
            if (!targetElement || !container.contains(targetElement)) return;

            const hoverTarget = resolveHoverTarget(targetElement, keywordOverrides);
            if (!hoverTarget) return;

            clearCloseTimer();
            if (activeTargetRef.current?.element === targetElement) return;
            clearOpenTimer();
            clearConsiderTimer();
            openTimerRef.current = setTimeout(() => openTarget(hoverTarget), OPEN_DELAY_MS);
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!activeTargetRef.current) return;
            const target = event.target;
            if (isInsideHoverSurface(target)) {
                clearCloseTimer();
                return;
            }

            scheduleClose();
        };

        const handlePointerOut = (event: PointerEvent) => {
            if (!activeTargetRef.current) return;
            const nextTarget = event.relatedTarget;
            if (isInsideHoverSurface(nextTarget)) return;
            scheduleClose();
        };

        const handlePointerDown = (event: PointerEvent) => {
            if (!popoverStateRef.current?.openedByHover) return;
            const target = event.target;
            if (target instanceof HTMLElement && target.closest('.popover-menu')) return;
            closeHoverPopover();
        };

        container.addEventListener('pointerover', handlePointerOver);
        container.addEventListener('pointerout', handlePointerOut);
        window.addEventListener('pointerdown', handlePointerDown, { capture: true });
        window.addEventListener('pointermove', handlePointerMove, { capture: true });

        return () => {
            container.removeEventListener('pointerover', handlePointerOver);
            container.removeEventListener('pointerout', handlePointerOut);
            window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
            window.removeEventListener('pointermove', handlePointerMove, { capture: true });
            clearOpenTimer();
            clearCloseTimer();
            clearConsiderTimer();
        };
    }, [containerRef, enabled, executeCommand, keywordOverrides, setPopoverState]);
};
