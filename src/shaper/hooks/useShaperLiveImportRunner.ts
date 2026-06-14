/**
 * @file useShaperLiveImportRunner.ts
 * @description Runs live MUME zone reads and imports captured output.
 */

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { applyShaperLiveTranscript } from '../import/shaperLiveImport';
import { parseShaperBuildListRooms } from '../import/shaperLiveRoomDiscovery';
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

const PACE_MS = 500;

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
        `/at ${mume} /stat room`,
        `/at ${mume} /com list`,
        `/lib room ${mume} list`
    ];
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
                await sleep(PACE_MS);
            }
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
        const total = roomNumbers.length * 3;
        setStatus({ running: true, label: `Found ${roomNumbers.length} rooms`, completed: 0, total, error: null });
        const { failures } = await importRoomNumbers(doc, roomNumbers, 0, total);
        return {
            label: failures > 0
                ? `Imported ${roomNumbers.length} rooms (${failures} reads skipped)`
                : `Imported ${roomNumbers.length} rooms`,
            completed: total,
            total
        };
    }), [runImport, runCommand, importRoomNumbers]);

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

    return { status, start, startRoom };
};
