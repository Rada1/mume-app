/**
 * @file usePendingObjectCommand.ts
 * @description Captures the last object command and resolves its ordinal selector against a location snapshot.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { DrawerLine } from '../../types';
import { extractMumeKeyword, extractNoun } from '../../utils/keywordUtils';
import { findObjectOccurrence, getDrawerObjectKeyword } from '../../objects/objectTargetModel';

export const usePendingObjectCommand = () => {
    const pendingCommandRef = useRef<{ command: string; sentAt: number } | null>(null);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleCommandSent = (event: Event) => {
            const command = (event as CustomEvent<{ cmd?: string }>).detail?.cmd;
            pendingCommandRef.current = command ? { command, sentAt: Date.now() } : null;
        };
        window.addEventListener('mume-command-sent', handleCommandSent);
        return () => window.removeEventListener('mume-command-sent', handleCommandSent);
    }, []);

    const getArguments = useCallback((verbs: string[]): string[] => {
        const pending = pendingCommandRef.current;
        if (!pending || Date.now() - pending.sentAt > 10000) return [];
        const commands = pending.command.split(/[;\n]+/).map(part => part.trim()).filter(Boolean).reverse();
        for (const command of commands) {
            const match = command.match(/^([a-z]+(?:\s+up)?)\s+(.+)$/i);
            if (match && verbs.includes(match[1].toLowerCase())) return match[2].trim().split(/\s+/).filter(Boolean);
        }
        return [];
    }, []);

    const clear = useCallback(() => {
        pendingCommandRef.current = null;
    }, []);

    return { getArguments, clear };
};

export const findDrawerItemOccurrence = (
    lines: DrawerLine[],
    itemText: string,
    selector: string | null
): number => {
    if (selector) {
        const selected = findObjectOccurrence(lines, selector, line =>
            line.isItem && !line.isHeader ? getDrawerObjectKeyword(line) : ''
        );
        if (selected >= 0) return selected;
    }
    const noun = extractNoun(itemText).toLowerCase();
    if (!noun) return -1;
    return lines.findIndex(line => line.isItem && !line.isHeader && (
        line.context?.toLowerCase() === noun || line.text.toLowerCase().includes(noun)
    ));
};
