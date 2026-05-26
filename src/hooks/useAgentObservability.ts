import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { LogEntry, LogEntryType } from './useSessionRecorder';
import { GameContextType, VitalsContextType, SessionContextType } from '../context/GameContext/types';

const BUFFER_SIZE = 100;

export interface InvariantResult {
    id: string;
    message: string;
    passed: boolean;
    data?: any;
}

export const useAgentObservability = (vitals: VitalsContextType, game: any, gameState: string) => {
    const eventsBuffer = useRef<LogEntry[]>([]);
    const [invariants, setInvariants] = useState<InvariantResult[]>([]);
    const lastError = useRef<Error | null>(null);

    // Safety check for undefined game/vitals during initial renders or transitions
    const isReady = !!(vitals && game);
    if (!isReady && (window as any).__AGENT_OBSERVABILITY_DEBUG__) {
        console.warn('[AGENT_OBSERVABILITY] Hook called with missing dependencies:', { hasVitals: !!vitals, hasGame: !!game, gameState });
    }

    const recordEvent = useCallback((type: LogEntryType, data: any) => {
        const entry: LogEntry = {
            t: Date.now(),
            typ: type,
            d: data
        };
        eventsBuffer.current.push(entry);
        if (eventsBuffer.current.length > BUFFER_SIZE) {
            eventsBuffer.current.shift();
        }
    }, []);

    const captureError = useCallback((error: Error, info?: any) => {
        lastError.current = error;
        recordEvent('sys', { event: 'error', message: error.message, stack: error.stack, info });
        console.error('[AGENT_OBSERVABILITY] Captured Error:', error, info);
    }, [recordEvent]);

    const checkInvariants = useCallback(() => {
        const results: InvariantResult[] = [];
        if (!isReady) return results;

        const { stats } = vitals;

        // HP Sanity
        if (stats.hp !== undefined && stats.maxHp !== undefined) {
            results.push({
                id: 'hp-range',
                passed: stats.hp <= (stats.maxHp * 1.05),
                message: `HP (${stats.hp}) should be within reasonable range of MaxHP (${stats.maxHp})`,
                data: { hp: stats.hp, maxHp: stats.maxHp }
            });
        }

        // Mana/Move Sanity
        if (stats.mana !== undefined && stats.maxMana !== undefined) {
            results.push({
                id: 'mana-range',
                passed: stats.mana <= (stats.maxMana * 1.05),
                message: `Mana (${stats.mana}) should be within reasonable range of MaxMana (${stats.maxMana})`,
                data: { mana: stats.mana, maxMana: stats.maxMana }
            });
        }
        if (stats.move !== undefined && stats.maxMove !== undefined) {
            results.push({
                id: 'move-range',
                passed: stats.move <= (stats.maxMove * 1.2),
                message: `Move (${stats.move}) should be <= MaxMove*1.2 (${stats.maxMove})`,
                data: { move: stats.move, maxMove: stats.maxMove }
            });
        }

        // Registry Consistency
        const entities = game.registry?.entities || {};
        const entityList = Object.values(entities);
        const ids = entityList.map((e: any) => e.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
            results.push({
                id: 'duplicate-entities',
                passed: false,
                message: `Duplicate entity IDs found: ${ids.length - uniqueIds.size} collisions`,
                data: { total: ids.length, unique: uniqueIds.size }
            });
        }

        // Group Sanity
        const groupMembers = vitals.groupMembers || [];
        if (groupMembers.length > 0) {
            const invalidMembers = groupMembers.filter((m: any) => m.hp < 0 || m.hp > 100);
            if (invalidMembers.length > 0) {
                results.push({
                    id: 'group-health-corruption',
                    passed: false,
                    message: `Group member health out of range (0-100%): ${invalidMembers.map((m: any) => m.name).join(', ')}`,
                    data: { invalidMembers }
                });
            }
        }

        // State Sanity
        if (gameState === 'playing' && !game.characterName) {
            results.push({
                id: 'logged-in-no-name',
                passed: false,
                message: 'GameState is "playing" but characterName is null',
                data: { gameState, characterName: game.characterName }
            });
        }

        // Room Sanity
        if (gameState === 'playing' && !game.roomZone) {
            results.push({
                id: 'mapper-no-zone',
                passed: false,
                message: 'roomZone is missing',
                data: { roomZone: game.roomZone }
            });
        }

        return results;
    }, [vitals, game, gameState, isReady]);

    useEffect(() => {
        if (!isReady) return;
        const results = checkInvariants();
        
        let changed = false;
        setInvariants(prev => {
            if (prev.length !== results.length) {
                changed = true;
                return results;
            }
            // Check if any status changed
            const statusChanged = results.some((res, i) => 
                res.id !== prev[i].id || res.passed !== prev[i].passed
            );
            if (statusChanged) {
                changed = true;
                return results;
            }
            return prev;
        });

        if (changed && results.length > 0 && (window as any).__AGENT_OBSERVABILITY_DEBUG__) {
            console.warn(`[AGENT_OBSERVABILITY] Invariant Failures Detected (${results.map(f => f.id).join(', ')}):`, results);
        }
    }, [isReady, checkInvariants]);

    // Global Error Catching
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            captureError(event.error || new Error(event.message), { type: 'unhandlederror' });
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            captureError(new Error(event.reason), { type: 'unhandledrejection' });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [captureError]);

    // Expose to window for Agent access
    useEffect(() => {
        (window as any).__AGENT_OBSERVABILITY__ = {
            getSnapshot: () => ({
                vitals,
                game: game ? {
                    ...game,
                    // Exclude huge circular refs
                    registry: undefined,
                    roomDescRef: undefined,
                } : null,
                gameState,
                events: eventsBuffer.current,
                invariants: checkInvariants(),
                timestamp: new Date().toISOString()
            }),
            getLastEvents: () => eventsBuffer.current,
            getInvariants: () => checkInvariants(),
            triggerManualCheck: () => setInvariants(checkInvariants())
        };
    }, [vitals, game, gameState, checkInvariants]);

    return useMemo(() => ({
        recordEvent,
        captureError,
        invariants
    }), [recordEvent, captureError, invariants]);
};
