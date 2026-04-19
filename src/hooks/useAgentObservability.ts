import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { LogEntry, LogEntryType } from './useSessionRecorder';
import { GameContextType, VitalsContextType } from '../context/GameContext/types';

const BUFFER_SIZE = 100;

export interface InvariantResult {
    id: string;
    message: string;
    passed: boolean;
    data?: any;
}

export const useAgentObservability = (vitals: VitalsContextType, game: GameContextType) => {
    const eventsBuffer = useRef<LogEntry[]>([]);
    const [invariants, setInvariants] = useState<InvariantResult[]>([]);
    const lastError = useRef<Error | null>(null);

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
        const { stats } = vitals;

        // HP Sanity
        if (stats.hp !== undefined && stats.maxHp !== undefined) {
            results.push({
                id: 'hp-range',
                passed: stats.hp <= stats.maxHp && stats.hp >= -10,
                message: `HP (${stats.hp}) should be <= MaxHP (${stats.maxHp})`,
                data: { hp: stats.hp, maxHp: stats.maxHp }
            });
        }

        // Mana/Move Sanity
        if (stats.mana !== undefined && stats.maxMana !== undefined) {
            results.push({
                id: 'mana-range',
                passed: stats.mana <= stats.maxMana,
                message: `Mana (${stats.mana}) should be <= MaxMana (${stats.maxMana})`,
                data: { mana: stats.mana, maxMana: stats.maxMana }
            });
        }
        if (stats.move !== undefined && stats.maxMove !== undefined) {
            results.push({
                id: 'move-range',
                passed: stats.move <= stats.maxMove,
                message: `Move (${stats.move}) should be <= MaxMove (${stats.maxMove})`,
                data: { move: stats.move, maxMove: stats.maxMove }
            });
        }

        // Registry Consistency
        const entities = game.entities || {};
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
        if (game.groupMembers?.length > 0) {
            const invalidMembers = game.groupMembers.filter((m: any) => m.hp < 0 || m.hp > 100);
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
        if (game.gameState === 'playing' && !game.characterName) {
            results.push({
                id: 'logged-in-no-name',
                passed: false,
                message: 'GameState is "playing" but characterName is null',
                data: { gameState: game.gameState, characterName: game.characterName }
            });
        }

        // Room Sanity
        if (game.gameState === 'playing' && game.isMmapperMode && !game.roomZone) {
            results.push({
                id: 'mapper-no-zone',
                passed: false,
                message: 'mMapper mode active but roomZone is missing',
                data: { roomZone: game.roomZone }
            });
        }

        return results;
    }, [vitals, game]);

    useEffect(() => {
        const results = checkInvariants();
        const failed = results.filter(r => !r.passed);
        if (failed.length > 0) {
            setInvariants(results);
            // Proactive logging to console for Agent to see via CDP
            console.warn('[AGENT_OBSERVABILITY] Invariant Failures Detected:', failed);
        }
    }, [checkInvariants]);

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
                game: {
                    ...game,
                    // Exclude huge circular refs if any
                    executeCommandRef: undefined,
                    roomDescRef: undefined,
                },
                events: eventsBuffer.current,
                invariants: checkInvariants(),
                timestamp: new Date().toISOString()
            }),
            getLastEvents: () => eventsBuffer.current,
            getInvariants: () => checkInvariants(),
            triggerManualCheck: () => setInvariants(checkInvariants())
        };
    }, [vitals, game, checkInvariants]);

    return {
        recordEvent,
        captureError,
        invariants
    };
};
