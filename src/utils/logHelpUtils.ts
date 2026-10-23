/**
 * @file logHelpUtils.ts
 * @description Extracts help topics from message log click events and coordinates inspection mode.
 */

import type React from 'react';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { cleanTopicCandidate, dispatchCommandHelp } from './commandHelpUtils';

// --- Logic Section ---

/**
 * Extracts a candidate help topic from a mouse event in the message log.
 * Checks active selection, clicked inline buttons, word spans, and coordinate text nodes.
 */
export const extractTopicFromLogClick = (e: React.MouseEvent | MouseEvent): string | null => {
    // 1. Text selection takes precedence
    const rawSelection = typeof window !== 'undefined' && typeof window.getSelection === 'function'
        ? window.getSelection()?.toString().trim()
        : '';
    if (rawSelection) {
        const clean = cleanTopicCandidate(rawSelection);
        if (clean) return clean;
    }

    const target = e.target;
    if (typeof Element === 'undefined' || !(target instanceof Element)) return null;

    // 2. Clicked inline button
    const inlineBtn = target.closest('.inline-btn');
    if (inlineBtn) {
        const cmd = inlineBtn.getAttribute('data-cmd');
        const context = inlineBtn.getAttribute('data-context');
        const text = inlineBtn.textContent?.trim();
        const candidate = cleanTopicCandidate(cmd || context || text || '');
        if (candidate) return candidate;
    }

    // 3. Word token span in the log
    const wordEl = target.closest('.log-text-word, .comm-action');
    if (wordEl) {
        const candidate = cleanTopicCandidate(wordEl.textContent || '');
        if (candidate) return candidate;
    }

    // 4. Coordinates caret lookup in plain text nodes
    const nativeEv = 'nativeEvent' in e ? (e as React.MouseEvent).nativeEvent : e;
    const clientX = (nativeEv as MouseEvent).clientX ?? (nativeEv as any)?.touches?.[0]?.clientX;
    const clientY = (nativeEv as MouseEvent).clientY ?? (nativeEv as any)?.touches?.[0]?.clientY;

    if (clientX !== undefined && clientY !== undefined && typeof document !== 'undefined') {
        let range: Range | null = null;
        const doc = document as any;
        if (doc.caretRangeFromPoint) {
            range = doc.caretRangeFromPoint(clientX, clientY);
        } else if (doc.caretPositionFromPoint) {
            const pos = doc.caretPositionFromPoint(clientX, clientY);
            if (pos && pos.offsetNode) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
            }
        }

        if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) {
            const offsets = [
                { dx: -5, dy: -5 }, { dx: 5, dy: -5 },
                { dx: -5, dy: 5 }, { dx: 5, dy: 5 },
                { dx: 0, dy: -8 }, { dx: 0, dy: 8 }
            ];
            for (const offset of offsets) {
                const r = doc.caretRangeFromPoint
                    ? doc.caretRangeFromPoint(clientX + offset.dx, clientY + offset.dy)
                    : null;
                if (r && r.startContainer.nodeType === Node.TEXT_NODE) {
                    range = r;
                    break;
                }
            }
        }

        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
            const node = range.startContainer;
            const offset = range.startOffset;
            const text = node.textContent || '';
            const beforeStr = text.slice(0, offset);
            const afterStr = text.slice(offset);

            const beforeWord = beforeStr.match(/([a-zA-Z0-9_\-']+)\s*$/)?.[1] || '';
            const afterWord = afterStr.match(/^\s*([a-zA-Z0-9_\-']+)/)?.[1] || '';

            const combined = (beforeWord + afterWord).trim();
            const candidate = cleanTopicCandidate(combined);
            if (candidate) return candidate;
        }
    }

    // 5. Short text node on element
    const directText = target.textContent?.trim() || '';
    if (directText && directText.length <= 40 && !directText.includes('\n')) {
        const firstWord = directText.split(/\s+/)[0];
        const candidate = cleanTopicCandidate(firstWord);
        if (candidate) return candidate;
    }

    return null;
};

/**
 * Handles a click on the message log when help inspection mode is active.
 * Extracts the clicked topic/word, triggers help inspection, and returns true to consume the event.
 */
export const handleLogHelpClick = (
    e: React.MouseEvent,
    executeCommand: (
        command: string,
        echo?: boolean,
        showPrompt?: boolean,
        skipAlias?: boolean,
        isManual?: boolean,
        metadata?: { shouldFocus?: boolean; fromUi?: boolean }
    ) => void,
    isMobile?: boolean
): boolean => {
    if (!useCommandPanelStore.getState().isHelpMode) {
        return false;
    }

    e.preventDefault();
    e.stopPropagation();

    const topic = extractTopicFromLogClick(e);
    if (topic) {
        dispatchCommandHelp(topic, executeCommand, isMobile);
    } else {
        useCommandPanelStore.getState().setIsHelpMode(false);
    }

    try {
        window.getSelection()?.removeAllRanges();
    } catch {
        // Ignore selection clear errors
    }

    return true;
};
