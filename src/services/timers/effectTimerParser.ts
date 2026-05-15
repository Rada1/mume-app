/**
 * @file effectTimerParser.ts
 * @description Converts outgoing commands and game text into effect timer updates.
 */

import { EFFECT_TIMER_CATALOG, findEffectTimerEntry } from '../../data/effectTimerCatalog';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';

const RECENT_WINDOW_MS = 15_000;

const extractQuoted = (text: string) => text.match(/['"]([^'"]+)['"]/)?.[1]?.trim();

const extractTarget = (command: string, effectName: string) => {
    const clean = command.replace(/['"][^'"]+['"]/, effectName).trim();
    const parts = clean.split(/\s+/);
    const last = parts[parts.length - 1];
    if (!last || last.toLowerCase() === effectName.toLowerCase()) return undefined;
    if (['cast', 'c', 'quaff', 'drink', 'eat', 'use'].includes(last.toLowerCase())) return undefined;
    return last;
};

let lastEffectCommand: { entryId: string; target?: string; at: number } | null = null;

export const recordEffectTimerCommand = (command: string) => {
    const lower = command.trim().toLowerCase();
    if (!/^(?:cast|c|quaff|drink|eat|use)\b/.test(lower)) return;

    const spellName = extractQuoted(command);
    const searchText = spellName || command;
    const entry = findEffectTimerEntry(searchText);
    if (!entry) return;

    const target = entry.kind === 'blind' ? extractTarget(command, spellName || entry.name) : undefined;
    useEffectTimerStore.getState().addTimer(entry, 'command', target);
    lastEffectCommand = { entryId: entry.id, target, at: Date.now() };
};

export const parseEffectTimerLine = (text: string) => {
    const lower = text.toLowerCase();
    const store = useEffectTimerStore.getState();

    for (const entry of EFFECT_TIMER_CATALOG) {
        if (entry.endPatterns?.some(pattern => pattern.test(text))) {
            store.timers
                .filter(timer => timer.catalogId === entry.id)
                .forEach(timer => store.removeTimer(timer.id));
            return true;
        }
    }

    const recent = lastEffectCommand && Date.now() - lastEffectCommand.at < RECENT_WINDOW_MS
        ? EFFECT_TIMER_CATALOG.find(entry => entry.id === lastEffectCommand?.entryId)
        : null;

    if (recent && /lost your concentration|failed|nothing seems to happen|you can't|you cannot|do not know|lack/i.test(text)) {
        const timerId = `${recent.id}:${lastEffectCommand?.target || 'self'}`;
        store.removeTimer(timerId);
        lastEffectCommand = null;
        return false;
    }

    if (recent && /^(?:you feel|you are|ok\.|your spell|you suddenly|you begin)/i.test(text.trim())) {
        store.addTimer(recent, 'parser', lastEffectCommand?.target);
        lastEffectCommand = null;
        return true;
    }

    const startedEntry = EFFECT_TIMER_CATALOG.find(entry =>
        entry.startPatterns?.some(pattern => pattern.test(text))
    );
    if (startedEntry) {
        store.addTimer(startedEntry, 'parser');
        return true;
    }

    if (/\b(wears off|fades|feel less|no longer)\b/i.test(lower)) {
        const matched = findEffectTimerEntry(lower);
        if (matched) {
            store.timers
                .filter(timer => timer.catalogId === matched.id)
                .forEach(timer => store.removeTimer(timer.id));
            return true;
        }
    }

    return false;
};
