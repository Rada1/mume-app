/** @file useTelnetTextQueue.ts — Ordered text chunk scheduling and fresh tokenizer snapshots. */
import React from 'react';
import type { TelnetConfig } from './useTelnet';
import type { WorkerLineEntry } from '../services/parser/parserWorkerTypes';
import { perfMonitor } from '../utils/perfMonitor';
import { processIncomingTextChunk } from './telnetTextQueue';
import { getRoom as getActiveRoom } from '../stores/useRoomStore';
import { getCombat as getActiveCombat } from '../stores/useCombatStore';
import { getVitals as getActiveVitals } from '../stores/useVitalsStore';
import { getSettings } from '../stores/useSettingsStore';
import { useButtonStore } from '../stores/useButtonStore';
import { useUIStore } from '../stores/useUIStore';

// --- Queue Section ---
export function useTelnetTextQueue(configRef: React.MutableRefObject<TelnetConfig>) {
    const pendingTextLines = React.useRef<WorkerLineEntry[]>([]);
    const processingQueuedRef = React.useRef(false);
    const tokenizationChainRef = React.useRef<Promise<void>>(Promise.resolve());
    const queuedTextChunksRef = React.useRef(0);
    const lastTextYieldAtRef = React.useRef(0);
    return (processedLines: WorkerLineEntry[]) => {
        if (processedLines.length > 0) {
            pendingTextLines.current.push(...processedLines);

            if (!processingQueuedRef.current) {
                // Let all text callbacks from this socket event join the same chunk,
                // then start tokenizing without waiting for the next paint frame.
                processingQueuedRef.current = true;
                queueMicrotask(() => {
                    processingQueuedRef.current = false;
                    const chunk = [...pendingTextLines.current];
                    pendingTextLines.current = [];

                    if (chunk.length === 0) return;

                    const buildTokenizerContext = () => {
                        const settings = getSettings();
                        const roomStore = getActiveRoom();
                        const combatStore = getActiveCombat();
                        const vitalsStore = getActiveVitals();
                        const buttonStore = useButtonStore.getState();
                        const uiStore = useUIStore.getState();

                        const onlinePlayers = (roomStore.whoList || []).map((entry: string) => entry.includes('|') ? entry.split('|')[1] : entry);
                        const registeredPlayers = combatStore.bufferName ? [combatStore.bufferName] : [];

                        return {
                            target: vitalsStore.target,
                            registeredPlayers,
                            currentOccupants: Object.values(roomStore.chars || {}),
                            roomNpcs: Object.values(roomStore.chars || {}).filter((c) => c.type === 'npc'),
                            activeGroupMembers: combatStore.groupMembers || [],
                            roomItems: roomStore.items || [],
                            discoveredItems: [],
                            onlinePlayers,
                            inlineCategories: settings.inlineCategories || [],
                            npcColor: settings.npcColor,
                            playerColor: settings.playerColor,
                            objectColor: settings.objectColor,
                            roomColor: settings.roomColor,
                            buttons: buttonStore.rawButtons || [],
                            selectedObjectIds: uiStore.selectedObjectIds || new Set<string>()
                        };
                    };

                    const isAccountMode = configRef.current.getGameState?.() === 'account';
                    const queuedAt = performance.now();
                    const runProcessing = async () => {
                        const startedAt = performance.now();
                        try {
                            await processIncomingTextChunk(
                                chunk,
                                buildTokenizerContext,
                                (line, tokens, chunkEffects) => configRef.current.processLine(line, tokens, chunkEffects),
                                isAccountMode
                            );
                        } finally {
                            perfMonitor.recordTextTiming(startedAt - queuedAt, performance.now() - startedAt);
                            queuedTextChunksRef.current--;
                            // A burst of short socket chunks otherwise forms a continuous
                            // promise microtask chain that can postpone paint on mobile.
                            if (queuedTextChunksRef.current > 0 && document.visibilityState !== 'hidden' &&
                                performance.now() - lastTextYieldAtRef.current > 8) {
                                await new Promise<void>(resolve => window.setTimeout(resolve, 0));
                                lastTextYieldAtRef.current = performance.now();
                            }
                        }
                    };

                    queuedTextChunksRef.current++;
                    tokenizationChainRef.current = tokenizationChainRef.current.then(runProcessing, runProcessing);
                });
            }
        }
    };
}
