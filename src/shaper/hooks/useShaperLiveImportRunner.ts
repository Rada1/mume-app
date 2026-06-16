/**
 * @file useShaperLiveImportRunner.ts
 * @description Runs live MUME zone reads and imports captured output.
 */

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { applyShaperLiveTranscript } from '../import/shaperLiveImport';
import { parseShaperBuildListRooms } from '../import/shaperLiveRoomDiscovery';
import { parseShaperZoneInfoKeywords } from '../import/shaperZoneInfoDiscovery';
import { useShaperLiveImportStore } from '../import/useShaperLiveImportStore';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

interface ShaperLiveImportRunnerParams {
    send: (command: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    persist: (doc: ShaperWorkspaceDoc) => ShaperWorkspaceDoc;
    setDoc: Dispatch<SetStateAction<ShaperWorkspaceDoc | null>>;
}

export interface ShaperLiveImportStatus {
    running: boolean;
    label: string;
    completed: number;
    total: number;
    error: string | null;
}

const COMMAND_SETTLE_MS = 125;
const MAX_EXIT_DISCOVERY_PASSES = 4;

const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

// Discovery keys rooms zero-padded (`31:00`) for grid placement, but MUME's
// canonical id is unpadded (`31:0`, `31:8`). `/com` re-resolves the room id and
// rejects the padded form, so send the canonical id to the MUD.
const toMumeRoom = (roomNumber: string): string => {
    const [zone, room] = roomNumber.split(':');
    return room !== undefined && /^\d+$/.test(room) ? `${zone}:${Number(room)}` : roomNumber;
};

export const buildShaperRoomLiveImportCommands = (roomNumber: string): string[] => {
    const mume = toMumeRoom(roomNumber);
    return [
        // `full` is required: the short `/stat room` output omits the
        // Description block, so the room description never imports without it.
        `/at ${mume} /stat room full`,
        `/at ${mume} /com list`,
        `/lib room ${mume} list`
    ];
};

export const buildShaperZoneInfoListCommand = (zoneNumber: number): string =>
    `/info zone ${zoneNumber} list`;

export const buildShaperZoneInfoReadCommand = (zoneNumber: number, keyword: string): string =>
    `/info zone ${zoneNumber} ${keyword} read`;

export const findShaperFollowUpRoomNumbers = (
    doc: ShaperWorkspaceDoc,
    importedRoomNumbers: Set<string>,
    zoneNumber = doc.zoneNumber
): string[] => {
    const roomsById = doc.rooms;
    const roomNumbers = new Set<string>();
    Object.values(doc.exits).forEach(exit => {
        const fromRoom = roomsById[exit.fromRoomId];
        const toRoom = exit.toRoomId ? roomsById[exit.toRoomId] : null;
        if (!fromRoom?.liveSnapshot?.statRoomFull || !toRoom) return;
        if (!toRoom.roomNumber.startsWith(`${zoneNumber}:`)) return;
        if (importedRoomNumbers.has(toRoom.roomNumber)) return;
        if (toRoom.liveSnapshot?.statRoomFull && toRoom.name.trim() && toRoom.sector) return;
        roomNumbers.add(toRoom.roomNumber);
    });
    return [...roomNumbers].sort((left, right) => Number(left.split(':')[1]) - Number(right.split(':')[1]));
};

// --- Hook Section ---
export const useShaperLiveImportRunner = ({ send, persist, setDoc }: ShaperLiveImportRunnerParams) => {
    const [status, setStatus] = useState<ShaperLiveImportStatus>({
        running: false,
        label: '',
        completed: 0,
        total: 0,
        error: null
    });
    const [keywordOptions, setKeywordOptions] = useState<string[]>([]);
    const runningRef = useRef(false);

    const runCommand = useCallback(async (command: string) => {
        const waiter = useShaperLiveImportStore.getState().waitForCommand(command);
        send(command, true, true, false, true);
        return waiter;
    }, [send]);

    // Read the given rooms (each: /stat room, /com list, /lib list) into the doc.
    // A single failed command is recorded and skipped, never aborting the run.
    const importRoomNumbers = useCallback(async (
        startDoc: ShaperWorkspaceDoc,
        roomNumbers: string[],
        completedOffset: number,
        total: number
    ): Promise<{ doc: ShaperWorkspaceDoc; completed: number; failures: number }> => {
        let completed = completedOffset;
        let failures = 0;
        let nextDoc = startDoc;
        for (const roomNumber of roomNumbers) {
            for (const command of buildShaperRoomLiveImportCommands(roomNumber)) {
                setStatus({ running: true, label: command, completed, total, error: null });
                try {
                    const result = await runCommand(command);
                    nextDoc = applyShaperLiveTranscript(nextDoc, `${command}\n${result.output}`).doc;
                    setDoc(persist(nextDoc));
                } catch (commandError) {
                    failures += 1;
                    // eslint-disable-next-line no-console
                    console.warn('[ShaperLiveImport] command failed, skipping:', command, commandError);
                }
                completed += 1;
                setStatus({ running: true, label: command, completed, total, error: null });
                await sleep(COMMAND_SETTLE_MS);
            }
        }
        return { doc: nextDoc, completed, failures };
    }, [persist, runCommand, setDoc]);

    const importZoneInfoKeywords = useCallback(async (
        startDoc: ShaperWorkspaceDoc,
        keywords: string[],
        completedOffset: number,
        total: number
    ): Promise<{ doc: ShaperWorkspaceDoc; completed: number; failures: number }> => {
        let completed = completedOffset;
        let failures = 0;
        let nextDoc = startDoc;
        for (const keyword of keywords) {
            const command = buildShaperZoneInfoReadCommand(nextDoc.zoneNumber, keyword);
            setStatus({ running: true, label: `Reading keyword ${keyword}`, completed, total, error: null });
            try {
                const result = await runCommand(command);
                nextDoc = applyShaperLiveTranscript(nextDoc, `${command}\n${result.output}`).doc;
                setDoc(persist(nextDoc));
            } catch (commandError) {
                failures += 1;
                // eslint-disable-next-line no-console
                console.warn('[ShaperLiveImport] keyword read failed, skipping:', command, commandError);
            }
            completed += 1;
            setStatus({ running: true, label: `Read keyword ${keyword}`, completed, total, error: null });
            await sleep(COMMAND_SETTLE_MS);
        }
        return { doc: nextDoc, completed, failures };
    }, [persist, runCommand, setDoc]);

    // Shared lifecycle wrapper: single-run lock, output suppression, error capture.
    const runImport = useCallback(async (
        work: () => Promise<{ label: string; completed: number; total: number }>
    ) => {
        if (runningRef.current) return;
        runningRef.current = true;
        useShaperLiveImportStore.getState().clearWaiters();
        // Suppress raw output display and route lines through the import collector.
        useShaperLiveImportStore.getState().setImporting(true);
        try {
            const result = await work();
            setStatus({ running: false, label: result.label, completed: result.completed, total: result.total, error: null });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Live import failed.';
            setStatus(current => ({ ...current, running: false, error: message, label: message }));
        } finally {
            runningRef.current = false;
            useShaperLiveImportStore.getState().setImporting(false);
            useShaperLiveImportStore.getState().clearWaiters();
        }
    }, []);

    // Whole-zone import: discover rooms via the build list, then read each.
    const start = useCallback((doc: ShaperWorkspaceDoc) => runImport(async () => {
        setStatus({ running: true, label: 'Reading build list', completed: 0, total: 0, error: null });
        const buildList = await runCommand(`/misc build ${doc.zoneNumber} list`);
        const roomNumbers = parseShaperBuildListRooms(buildList.output, doc.zoneNumber);
        if (roomNumbers.length === 0) {
            const snippet = buildList.output.replace(/\s+/g, ' ').trim().slice(0, 80);
            throw new Error(`No rooms found for zone ${doc.zoneNumber} (captured ${buildList.output.length} chars: "${snippet}").`);
        }
        let discoveryFailures = 0;
        setStatus({ running: true, label: 'Reading zone keyword list', completed: 0, total: 0, error: null });
        const keywordListCommand = buildShaperZoneInfoListCommand(doc.zoneNumber);
        let keywords: string[] = [];
        try {
            const keywordList = await runCommand(keywordListCommand);
            keywords = parseShaperZoneInfoKeywords(keywordList.output);
        } catch (commandError) {
            discoveryFailures = 1;
            // eslint-disable-next-line no-console
            console.warn('[ShaperLiveImport] keyword list failed, skipping zone info auto-import:', commandError);
        }
        let total = keywords.length + roomNumbers.length * 3;
        setStatus({ running: true, label: `Found ${roomNumbers.length} rooms and ${keywords.length} keywords`, completed: 0, total, error: null });
        const keywordResult = await importZoneInfoKeywords(doc, keywords, 0, total);
        const importedRoomNumbers = new Set(roomNumbers);
        let importedDoc = keywordResult.doc;
        let completed = keywordResult.completed;
        let readFailures = 0;
        const initialResult = await importRoomNumbers(importedDoc, roomNumbers, completed, total);
        importedDoc = initialResult.doc;
        completed = initialResult.completed;
        readFailures += initialResult.failures;

        for (let pass = 0; pass < MAX_EXIT_DISCOVERY_PASSES; pass += 1) {
            const followUpRooms = findShaperFollowUpRoomNumbers(importedDoc, importedRoomNumbers);
            if (followUpRooms.length === 0) break;
            followUpRooms.forEach(roomNumber => importedRoomNumbers.add(roomNumber));
            total += followUpRooms.length * 3;
            setStatus({
                running: true,
                label: `Reading ${followUpRooms.length} exit-linked rooms`,
                completed,
                total,
                error: null
            });
            const followUpResult = await importRoomNumbers(importedDoc, followUpRooms, completed, total);
            importedDoc = followUpResult.doc;
            completed = followUpResult.completed;
            readFailures += followUpResult.failures;
        }

        if (completed !== total) {
            setStatus({ running: true, label: 'Finalizing live import', completed, total, error: null });
        }
        const allFailures = discoveryFailures + readFailures + keywordResult.failures;
        return {
            label: allFailures > 0
                ? `Imported ${importedRoomNumbers.size} rooms and ${keywords.length} keywords (${allFailures} reads skipped)`
                : `Imported ${importedRoomNumbers.size} rooms and ${keywords.length} keywords`,
            completed: total,
            total
        };
    }), [runImport, runCommand, importZoneInfoKeywords, importRoomNumbers]);

    // Single-room re-import: skips build-list discovery for a quick refresh.
    const startRoom = useCallback((doc: ShaperWorkspaceDoc, roomNumber: string) => runImport(async () => {
        const label = toMumeRoom(roomNumber);
        setStatus({ running: true, label: `Re-reading ${label}`, completed: 0, total: 3, error: null });
        const { failures } = await importRoomNumbers(doc, [roomNumber], 0, 3);
        return {
            label: failures > 0 ? `Re-imported ${label} (${failures} reads skipped)` : `Re-imported ${label}`,
            completed: 3,
            total: 3
        };
    }), [runImport, importRoomNumbers]);

    // Keyword re-import: fetch `/info z <zone> <keyword> read` from MUD.
    const startKeyword = useCallback((doc: ShaperWorkspaceDoc, keyword: string) => runImport(async () => {
        const cmd = buildShaperZoneInfoReadCommand(doc.zoneNumber, keyword);
        setStatus({ running: true, label: `Reading keyword ${keyword}`, completed: 0, total: 1, error: null });
        const result = await runCommand(cmd);
        const nextDoc = applyShaperLiveTranscript(doc, `${cmd}\n${result.output}`).doc;
        setDoc(persist(nextDoc));
        return {
            label: `Imported keyword ${keyword}`,
            completed: 1,
            total: 1
        };
    }), [runImport, runCommand, persist, setDoc]);

    const startKeywordList = useCallback((doc: ShaperWorkspaceDoc) => runImport(async () => {
        const cmd = buildShaperZoneInfoListCommand(doc.zoneNumber);
        setStatus({ running: true, label: 'Reading zone keyword list', completed: 0, total: 1, error: null });
        const result = await runCommand(cmd);
        const keywords = parseShaperZoneInfoKeywords(result.output);
        setKeywordOptions(keywords);
        return {
            label: `Found ${keywords.length} zone keywords`,
            completed: 1,
            total: 1
        };
    }), [runImport, runCommand]);

    return { status, keywordOptions, start, startRoom, startKeyword, startKeywordList };
};
