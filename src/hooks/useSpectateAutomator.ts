/**
 * @file useSpectateAutomator.ts
 * @description Manages the automated spectate/snoop queue and rotation logic.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExecuteCommand } from '../types';

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
    setIsSpectateMode?: (val: boolean) => void;
    // Called whenever we rotate to a new snoop target. Responsible for wiping any
    // lingering per-target state (room occupants, spectate room name/desc, mapper's
    // current-room cursor) so GMCP for the new target starts from a clean slate.
    resetSpectateContext?: () => void;
}

const SNOOP_ROTATION_MS = 10 * 60 * 1000; // 10 minutes

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
        executeCommand(`tell ${name} You are now being spectated`, true, true);
        setLastSnoopStartTime(Date.now());
        // Set name immediately so HUD updates before GMCP arrives
        if (deps.setSpectateCharacterName) {
            deps.setSpectateCharacterName(name);
        }
        addSystemMessage(`Automator: Switching snoop to ${name}.`);
    }, [executeCommand, setLastSnoopStartTime, addSystemMessage, deps.setSpectateCharacterName, deps.resetSpectateContext]);

    const rotateQueue = useCallback((cycle = false) => {
        const currentPlayer = spectateCharacterName;
        
        if (currentPlayer) {
            executeCommand(`tell ${currentPlayer} You are no longer being spectated`, true, true);
        }
        executeCommand(`/snoop`, true, true);
        setLastSnoopStartTime(null);
        
        // Rotate if queue is not empty
        setSpectateQueue(prev => {
            if (prev.length > 0) {
                const nextPlayer = prev[0];
                let newQueue = prev.slice(1);
                
                if (cycle && currentPlayer) {
                    newQueue = [...newQueue, currentPlayer];
                }
                
                // We use a small timeout to avoid triggering state updates during a render/effect loop
                setTimeout(() => snoopPlayer(nextPlayer), 0);
                return newQueue;
            }
            
            // If we are stopping and queue is empty, also clear current name + state
            if (deps.setSpectateCharacterName) deps.setSpectateCharacterName(null);
            if (deps.resetSpectateContext) deps.resetSpectateContext();
            return prev;
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
        
        // Don't add if already being snooped
        if (spectateCharacterName?.toLowerCase() === lowerName) {
            return;
        }

        addSystemMessage(`Automator: ${name} added to spectate queue.`);

        // Auto-enable spectate mode if it's currently OFF
        if (!isSpectateMode && deps.setIsSpectateMode) {
            deps.setIsSpectateMode(true);
        }

        setSpectateQueue(prev => {
            if (prev.some(p => p.toLowerCase() === lowerName)) {
                return prev;
            }

            // If not currently snooping anything, start immediately
            if (!spectateCharacterName && prev.length === 0) {
                setTimeout(() => snoopPlayer(name), 0);
                return prev;
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
    }, [spectateCharacterName, addSystemMessage, snoopPlayer, setSpectateQueue, isSpectateMode, deps.setIsSpectateMode, lastSnoopStartTime, executeCommand]);

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
            if (spectateQueue.length > 0) {
                addSystemMessage(`Automator: 10 minutes elapsed. Rotating to next player.`);
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

    return { addToQueue, stopSnoop, rotateQueue, removeFromQueue };
}
