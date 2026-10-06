/**
 * @file useSpectateAutomator.ts
 * @description Manages the automated spectate/snoop queue and rotation logic.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExecuteCommand } from '../types';
import { useModeStore } from '../stores/useModeStore';


interface SpectateAutomatorDeps {
    spectateQueue: string[];
    setSpectateQueue: (val: string[] | ((prev: string[]) => string[])) => void;
    lastSnoopStartTime: number | null;
    setLastSnoopStartTime: (val: number | null) => void;
    spectateCharacterName: string | null;
    executeCommand: ExecuteCommand;
    addSystemMessage: (text: string) => void;
    setSpectateCharacterName?: (name: string | null) => void;
    isSpectateMode: boolean;
    // Called whenever we rotate to a new snoop target. Responsible for wiping any
    // lingering per-target state (room occupants, spectate room name/desc, mapper's
    // current-room cursor) so GMCP for the new target starts from a clean slate.
    resetSpectateContext?: () => void;
}

const SNOOP_ROTATION_MS = 5 * 60 * 1000; // 5 minutes

const cleanSpectateName = (name: string | null | undefined) => (name || '')
    .replace(/\x1b?\[[0-9;]*m/g, '')
    .replace(/&(?:amp;)?[A-Za-z]/gi, '')
    .trim();

const namesMatch = (a: string | null | undefined, b: string | null | undefined) => {
    const cleanA = cleanSpectateName(a);
    const cleanB = cleanSpectateName(b);
    return !!cleanA && !!cleanB && cleanA.toLowerCase() === cleanB.toLowerCase();
};

const appendUniqueName = (names: string[], name: string | null | undefined) => {
    const cleanName = cleanSpectateName(name);
    if (!cleanName || cleanName === 'None') return names.map(cleanSpectateName).filter(Boolean);
    const cleanNames = names.map(cleanSpectateName).filter(Boolean);
    return cleanNames.some(entry => namesMatch(entry, cleanName)) ? cleanNames : [...cleanNames, cleanName];
};

const getNextQueuedSpectatee = (queue: string[], current: string | null) => {
    if (queue.length === 0) return null;
    if (!current) return queue[0] || null;

    const currentIndex = queue.findIndex(name => namesMatch(name, current));
    if (currentIndex === -1) return queue[0] || null;

    for (let offset = 1; offset <= queue.length; offset++) {
        const candidate = queue[(currentIndex + offset) % queue.length];
        if (!namesMatch(candidate, current)) return candidate;
    }
    return null;
};

export function useSpectateAutomator(deps: SpectateAutomatorDeps) {
    const {
        spectateQueue,
        setSpectateQueue,
        lastSnoopStartTime,
        setLastSnoopStartTime,
        spectateCharacterName,
        executeCommand,
        addSystemMessage,
        isSpectateMode
    } = deps;
    
    const [_, setTick] = useState(0);
    useEffect(() => {
        if (!isSpectateMode) return;
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, [isSpectateMode]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const snoopPlayer = useCallback((name: string) => {
        const cleanName = cleanSpectateName(name);
        if (!cleanName) return;
        // Wipe lingering state from the previous target BEFORE issuing /snoop so the first
        // GMCP packets for the new target don't get merged with the old target's occupants,
        // room name, or mapper cursor. Without this the tracker struggles to identify NPCs
        // and the map stops updating cleanly after a rotation.
        if (deps.resetSpectateContext) {
            deps.resetSpectateContext();
        }
        executeCommand(`/snoop -prompt -gmcp ${cleanName}`, true, true);
        setLastSnoopStartTime(Date.now());
        
        // Use useModeStore's startSpectate to ensure all state is synced
        useModeStore.getState().startSpectate(cleanName);
        setSpectateQueue(prev => appendUniqueName(prev, cleanName));
        
        // Set name immediately so HUD updates before GMCP arrives
        if (deps.setSpectateCharacterName) {
            deps.setSpectateCharacterName(cleanName);
        }
        addSystemMessage(`Automator: Switching snoop to ${cleanName}.`);
    }, [executeCommand, setLastSnoopStartTime, setSpectateQueue, addSystemMessage, deps.setSpectateCharacterName, deps.resetSpectateContext]);

    const pendingSnoopStartRef = useRef<string | null>(null);
    const scheduleSnoopStart = useCallback((name: string) => {
        if (pendingSnoopStartRef.current) return;
        pendingSnoopStartRef.current = name;
        setTimeout(() => {
            if (!namesMatch(pendingSnoopStartRef.current, name)) return;
            pendingSnoopStartRef.current = null;
            const mode = useModeStore.getState();
            if (mode.isSpectating && mode.spectateTarget === name) return;
            snoopPlayer(name);
        }, 0);
    }, [snoopPlayer]);

    const rotateQueue = useCallback((cycle = false) => {
        const currentPlayer = spectateCharacterName;
        
        executeCommand(`/snoop`, true, true);
        setLastSnoopStartTime(null);
        
        setSpectateQueue(prev => {
            const roster = appendUniqueName(prev, currentPlayer);
            const nextPlayer = getNextQueuedSpectatee(roster, currentPlayer);
            if (nextPlayer) {
                // We use a small timeout to avoid triggering state updates during a render/effect loop
                setTimeout(() => snoopPlayer(nextPlayer), 0);
                return roster;
            }
            
            // If nobody else is queued, stop the current snoop but keep the roster.
            const mode = useModeStore.getState();
            mode.setIsSpectating(false);
            mode.setSpectateTarget(null);
            mode.setLastSnoopStartTime(null);
            mode.setActiveView('self');
            if (deps.setSpectateCharacterName) deps.setSpectateCharacterName(null);
            if (deps.resetSpectateContext) deps.resetSpectateContext();
            return roster;
        });
    }, [executeCommand, setLastSnoopStartTime, snoopPlayer, setSpectateQueue, spectateCharacterName, deps.setSpectateCharacterName, deps.resetSpectateContext]);

    const stopSnoop = useCallback((manuallyTriggered = false) => {
        if (manuallyTriggered) {
            addSystemMessage('Automator: Snoop stopped by request.');
        }
        rotateQueue(false);
    }, [rotateQueue, addSystemMessage]);

    const addToQueue = useCallback((name: string) => {
        const cleanName = cleanSpectateName(name);
        if (!cleanName) return;

        const mode = useModeStore.getState();
        const rawActiveTarget = mode.isSpectating ? mode.spectateTarget : null;
        const activeTarget = cleanSpectateName(rawActiveTarget) || null;
        if (!mode.isSpectating) mode.setIsSpectating(true);

        const queue = activeTarget
            ? [activeTarget, ...mode.spectateQueue.map(cleanSpectateName).filter(entry => entry && !namesMatch(entry, activeTarget))]
            : mode.spectateQueue.map(cleanSpectateName).filter(Boolean);
        const alreadyQueued = queue.some(entry => namesMatch(entry, cleanName));

        // A stopped queue may retain names. Resume it rather than treating the
        // request as a duplicate and leaving the snoop command unsent.
        if (!activeTarget) {
            const updated = appendUniqueName(queue, cleanName);
            if (!alreadyQueued) addSystemMessage(`Automator: ${cleanName} added to spectate queue.`);
            setSpectateQueue(updated);
            scheduleSnoopStart(updated[0] || cleanName);
            return;
        }

        setSpectateQueue(appendUniqueName(queue, activeTarget));
        if (rawActiveTarget !== activeTarget) {
            scheduleSnoopStart(activeTarget);
            return;
        }
        if (namesMatch(activeTarget, cleanName) || alreadyQueued) return;

        addSystemMessage(`Automator: ${cleanName} added to spectate queue.`);
        const position = queue.length + 1;
        const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
        const lastStart = mode.lastSnoopStartTime ?? lastSnoopStartTime;
        const elapsed = lastStart ? Date.now() - lastStart : 0;
        const currentRemaining = Math.max(0, SNOOP_ROTATION_MS - elapsed);
        const queueWait = Math.max(0, queue.length - 1) * SNOOP_ROTATION_MS;
        const totalWaitMins = Math.ceil((currentRemaining + queueWait) / 60000);
        executeCommand(`tell ${cleanName} You are ${position}${suffix} in the stream queue, and will be up in ~${totalWaitMins}m.`, true, true);

        const updated = [...queue, cleanName];
        setSpectateQueue(updated);
        if (queue.length === 1 && lastStart && elapsed >= SNOOP_ROTATION_MS) {
            setTimeout(() => rotateQueue(true), 0);
        }
    }, [addSystemMessage, scheduleSnoopStart, setSpectateQueue, lastSnoopStartTime, executeCommand, rotateQueue]);

    // Rotation Timer
    useEffect(() => {
        if (!isSpectateMode || !lastSnoopStartTime || !spectateCharacterName) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const elapsed = Date.now() - lastSnoopStartTime;
        const remaining = Math.max(0, SNOOP_ROTATION_MS - elapsed);

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            if (getNextQueuedSpectatee(spectateQueue, spectateCharacterName)) {
                addSystemMessage(`Automator: 5 minutes elapsed. Rotating to next player.`);
                rotateQueue(true);
            } else {
                // If queue empty, keep snooping but DO NOT reset timer.
                // This allows the HUD to show 0:00 and triggers an instant rotation
                // when a new player is added to the queue later.
            }
        }, remaining);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isSpectateMode, lastSnoopStartTime, spectateCharacterName, spectateQueue, snoopPlayer, setLastSnoopStartTime, addSystemMessage, setSpectateQueue]);

    const removeFromQueue = useCallback((name: string) => {
        const cleanName = cleanSpectateName(name);
        setSpectateQueue(prev => prev.filter(entry => !namesMatch(entry, cleanName)));
        addSystemMessage(`Automator: ${cleanName} removed from spectate queue.`);
    }, [setSpectateQueue, addSystemMessage]);

    const stopSpectatingName = useCallback((name: string) => {
        const cleanName = cleanSpectateName(name);
        const isCurrent = namesMatch(spectateCharacterName, cleanName);
        if (namesMatch(pendingSnoopStartRef.current, cleanName)) {
            pendingSnoopStartRef.current = null;
        }

        setSpectateQueue(prev => {
            const roster = prev.filter(entry => !namesMatch(entry, cleanName));
            addSystemMessage(`Automator: ${cleanName} requested spectate stop.`);

            if (!isCurrent) {
                return roster;
            }

            executeCommand(`/snoop`, true, true);
            setLastSnoopStartTime(null);
            const nextPlayer = getNextQueuedSpectatee(roster, name);

            if (nextPlayer) {
                setTimeout(() => snoopPlayer(nextPlayer), 0);
            } else {
                const mode = useModeStore.getState();
                mode.setIsSpectating(false);
                mode.setSpectateTarget(null);
                mode.setLastSnoopStartTime(null);
                mode.setActiveView('self');
                if (deps.setSpectateCharacterName) deps.setSpectateCharacterName(null);
                if (deps.resetSpectateContext) deps.resetSpectateContext();
            }

            return roster;
        });
    }, [spectateCharacterName, setSpectateQueue, addSystemMessage, executeCommand, setLastSnoopStartTime, snoopPlayer, deps.setSpectateCharacterName, deps.resetSpectateContext]);

    return { addToQueue, stopSnoop, rotateQueue, removeFromQueue, stopSpectatingName };
}
