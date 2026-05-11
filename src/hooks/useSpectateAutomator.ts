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

const namesMatch = (a: string | null | undefined, b: string | null | undefined) =>
    !!a && !!b && a.toLowerCase() === b.toLowerCase();

const appendUniqueName = (names: string[], name: string | null | undefined) => {
    if (!name || name === 'None') return names;
    return names.some(entry => namesMatch(entry, name)) ? names : [...names, name];
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
        // Wipe lingering state from the previous target BEFORE issuing /snoop so the first
        // GMCP packets for the new target don't get merged with the old target's occupants,
        // room name, or mapper cursor. Without this the tracker struggles to identify NPCs
        // and the map stops updating cleanly after a rotation.
        if (deps.resetSpectateContext) {
            deps.resetSpectateContext();
        }
        executeCommand(`/snoop -prompt -gmcp ${name}`, true, true);
        setLastSnoopStartTime(Date.now());
        
        // Use useModeStore's startSpectate to ensure all state is synced
        useModeStore.getState().startSpectate(name);
        setSpectateQueue(prev => appendUniqueName(prev, name));
        
        // Set name immediately so HUD updates before GMCP arrives
        if (deps.setSpectateCharacterName) {
            deps.setSpectateCharacterName(name);
        }
        addSystemMessage(`Automator: Switching snoop to ${name}.`);
    }, [executeCommand, setLastSnoopStartTime, setSpectateQueue, addSystemMessage, deps.setSpectateCharacterName, deps.resetSpectateContext]);

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
        const lowerName = name.toLowerCase();
        
        // Auto-enable spectate mode if it's currently OFF
        if (!isSpectateMode) {
            useModeStore.getState().setIsSpectating(true);
        }

        setSpectateQueue(prev => {
            if (prev.some(p => p.toLowerCase() === lowerName)) {
                return prev;
            }

            addSystemMessage(`Automator: ${name} added to spectate queue.`);

            // If not currently snooping anything, start immediately
            if (!spectateCharacterName && prev.length === 0) {
                setTimeout(() => snoopPlayer(name), 0);
                return [name];
            } else {
                // Calculate wait time based on the latest 'prev' list
                const elapsed = lastSnoopStartTime ? (Date.now() - lastSnoopStartTime) : 0;
                const currentRemaining = Math.max(0, SNOOP_ROTATION_MS - elapsed);
                const queueWait = prev.length * SNOOP_ROTATION_MS;
                const totalWaitMins = Math.ceil((currentRemaining + queueWait) / 60000);
                
                const position = prev.length + 1;
                const suffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
                
                executeCommand(`tell ${name} You are ${position}${suffix} in the stream queue, and will be up in ~${totalWaitMins}m.`, true, true);
                
                const updated = [...prev, name];
                // If the current person's timer is already expired, rotate immediately to the person we just added
                if (prev.length === 0 && lastSnoopStartTime) {
                    const elapsed = Date.now() - lastSnoopStartTime;
                    if (elapsed >= SNOOP_ROTATION_MS) {
                        setTimeout(() => rotateQueue(true), 0);
                    }
                }
                return updated;
            }
        });
    }, [spectateCharacterName, addSystemMessage, snoopPlayer, setSpectateQueue, isSpectateMode, lastSnoopStartTime, executeCommand, rotateQueue]);

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
        const lowerName = name.toLowerCase();
        setSpectateQueue(prev => prev.filter(p => p.toLowerCase() !== lowerName));
        addSystemMessage(`Automator: ${name} removed from spectate queue.`);
    }, [setSpectateQueue, addSystemMessage]);

    const stopSpectatingName = useCallback((name: string) => {
        const lowerName = name.toLowerCase();
        const isCurrent = namesMatch(spectateCharacterName, name);

        setSpectateQueue(prev => {
            const roster = prev.filter(p => p.toLowerCase() !== lowerName);
            addSystemMessage(`Automator: ${name} requested spectate stop.`);

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
