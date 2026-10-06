/**
 * @file effectTimerParser.ts
 * @description Converts outgoing commands and game text into effect timer updates.
 */

import { EFFECT_TIMER_CATALOG, findEffectTimerEntry } from '../../data/effectTimerCatalog';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { useSpectateLiveEffectTimerStore } from '../../stores/spectate/useSpectateEffectTimerStore';

const RECENT_WINDOW_MS = 15_000;
const requiresConfirmation = (entry: { kind: string }) =>
    entry.kind === 'spell' || entry.kind === 'sanctuary' || entry.kind === 'blind';

const extractQuoted = (text: string) => text.match(/['"]([^'"]+)['"]/)?.[1]?.trim();

const extractTarget = (command: string, effectName: string) => {
    const clean = command.replace(/['"][^'"]+['"]/, effectName).trim();
    const parts = clean.split(/\s+/);
    const last = parts[parts.length - 1];
    if (!last || last.toLowerCase() === effectName.toLowerCase()) return undefined;
    if (['cast', 'c', 'commune', 'pray', 'quaff', 'drink', 'eat', 'use'].includes(last.toLowerCase())) return undefined;
    return last;
};

const lastEffectCommand: Record<'player' | 'spectate', { entryId: string; target?: string; at: number } | null> = {
    player: null,
    spectate: null
};

const getEffectTimerStore = (isSpectateTarget: boolean) => (
    isSpectateTarget ? useSpectateLiveEffectTimerStore : useEffectTimerStore
);

const getCommandScope = (isSpectateTarget: boolean) => isSpectateTarget ? 'spectate' : 'player';

export const resetSpectateEffectTimerParser = () => {
    lastEffectCommand.spectate = null;
};

/** Returns the confirmed local effect that ended on this line, if any. */
export const getEndedEffectTimerEntry = (text: string) =>
    EFFECT_TIMER_CATALOG.find(entry => entry.endPatterns?.some(pattern => pattern.test(text))) ?? null;

export const recordEffectTimerCommand = (command: string, isSpectateTarget = false) => {
    const lower = command.trim().toLowerCase();
    if (!/^(?:cast|c|commune|pray|quaff|drink|eat|use)\b/.test(lower)) return;

    const spellName = extractQuoted(command);
    const searchText = spellName || command;
    const entry = findEffectTimerEntry(searchText);
    if (!entry) return;

    const target = entry.kind === 'blind' ? extractTarget(command, spellName || entry.name) : undefined;
    const store = getEffectTimerStore(isSpectateTarget).getState();
    // Spell attempts are not active effects. Wait for MUME's completion line.
    if (!requiresConfirmation(entry)) {
        store.addTimer(entry, 'command', target);
    }
    lastEffectCommand[getCommandScope(isSpectateTarget)] = { entryId: entry.id, target, at: Date.now() };
};

export const parseEffectTimerLine = (text: string, isSpectateTarget = false) => {
    const lower = text.toLowerCase();
    const store = getEffectTimerStore(isSpectateTarget).getState();
    const scope = getCommandScope(isSpectateTarget);

    const endedEntry = getEndedEffectTimerEntry(text);
    if (endedEntry) {
        store.timers
            .filter(timer => timer.catalogId === endedEntry.id)
            .forEach(timer => store.removeTimer(timer.id));
        return true;
    }

    const lastCommand = lastEffectCommand[scope];
    const recent = lastCommand && Date.now() - lastCommand.at < RECENT_WINDOW_MS
        ? EFFECT_TIMER_CATALOG.find(entry => entry.id === lastCommand.entryId)
        : null;

    if (recent && /lost your concentration|failed|nothing seems to happen|you can't|you cannot|do not know|lack/i.test(text)) {
        const timerId = `${recent.id}:${lastCommand?.target || 'self'}`;
        store.removeTimer(timerId);
        lastEffectCommand[scope] = null;
        return false;
    }

    if (recent && !requiresConfirmation(recent) && /^(?:you feel|you are|ok\.|your spell|you suddenly|you begin)/i.test(text.trim())) {
        store.addTimer(recent, 'parser', lastCommand?.target);
        lastEffectCommand[scope] = null;
        return true;
    }

    const startedEntry = EFFECT_TIMER_CATALOG.find(entry =>
        entry.startPatterns?.some(pattern => pattern.test(text))
    );
    if (startedEntry) {
        store.addTimer(startedEntry, 'parser');
        if (lastCommand?.entryId === startedEntry.id) lastEffectCommand[scope] = null;
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
