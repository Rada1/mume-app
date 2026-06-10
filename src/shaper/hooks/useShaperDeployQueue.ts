/**
 * @file useShaperDeployQueue.ts
 * @description Paced, single-lock deploy queue that sends previewed commands
 *              through the host client's command path and records an audit log.
 *              Editor-block steps open MUME's GMCP editor and write the body.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { extractEditorBody, planShaperDeploy } from '../deployment/shaperDeployPlan';
import type { ShaperDeployAuditEntry, ShaperDeployCommand, ShaperDeployStatus } from '../deployment/shaperDeployTypes';

interface UseShaperDeployQueueParams {
    send?: (command: string) => void;
    isConnected: boolean;
    // True while MUME's GMCP editor session is open.
    isEditorOpen?: boolean;
    // Writes the editor body via GMCP and closes the session.
    saveEditor?: (text: string) => void;
    paceMs?: number;
}

const DEFAULT_PACE_MS = 600;
const EDITOR_POLL_MS = 150;
const EDITOR_TIMEOUT_MS = 5000;

// --- Hook Section ---
export const useShaperDeployQueue = ({
    send,
    isConnected,
    isEditorOpen = false,
    saveEditor,
    paceMs = DEFAULT_PACE_MS
}: UseShaperDeployQueueParams) => {
    const [steps, setSteps] = useState<ShaperDeployCommand[]>([]);
    const [isDeploying, setIsDeploying] = useState(false);
    const [audit, setAudit] = useState<ShaperDeployAuditEntry[]>([]);

    const stepsRef = useRef<ShaperDeployCommand[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sendRef = useRef(send);
    const connectedRef = useRef(isConnected);
    const editorOpenRef = useRef(isEditorOpen);
    const saveEditorRef = useRef(saveEditor);
    const pendingEditorRef = useRef<{ stepId: string; body: string; deadline: number } | null>(null);

    useEffect(() => { sendRef.current = send; }, [send]);
    useEffect(() => { connectedRef.current = isConnected; }, [isConnected]);
    useEffect(() => { editorOpenRef.current = isEditorOpen; }, [isEditorOpen]);
    useEffect(() => { saveEditorRef.current = saveEditor; }, [saveEditor]);
    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    const sync = useCallback((next: ShaperDeployCommand[]) => {
        stepsRef.current = next;
        setSteps(next);
    }, []);

    const patch = useCallback((id: string, change: Partial<ShaperDeployCommand>) => {
        sync(stepsRef.current.map(step => step.id === id ? { ...step, ...change } : step));
    }, [sync]);

    const log = useCallback((text: string, status: ShaperDeployStatus) => {
        setAudit(prev => [...prev, { timestamp: Date.now(), text, status }]);
    }, []);

    const processNextRef = useRef<() => void>(() => {});

    // Wait for the GMCP editor to open, then write the body. Falls back to a
    // manual-apply failure if the editor never opens within the timeout.
    const waitForEditor = useCallback(() => {
        const pending = pendingEditorRef.current;
        if (!pending) return;
        const stepText = stepsRef.current.find(step => step.id === pending.stepId)?.text ?? pending.stepId;

        if (editorOpenRef.current && saveEditorRef.current) {
            saveEditorRef.current(pending.body);
            patch(pending.stepId, { status: 'sent' });
            log(stepText, 'sent');
            pendingEditorRef.current = null;
            timerRef.current = setTimeout(() => processNextRef.current(), paceMs);
            return;
        }

        if (Date.now() > pending.deadline) {
            patch(pending.stepId, { status: 'failed', error: 'Editor did not open; apply this block manually.' });
            log(stepText, 'failed');
            pendingEditorRef.current = null;
            timerRef.current = setTimeout(() => processNextRef.current(), 0);
            return;
        }

        timerRef.current = setTimeout(waitForEditor, EDITOR_POLL_MS);
    }, [patch, log, paceMs]);

    // Send the next queued step, then schedule the following one.
    const processNext = useCallback(() => {
        const next = stepsRef.current.find(step => step.status === 'queued');
        if (!next) {
            setIsDeploying(false);
            return;
        }

        if (!connectedRef.current || !sendRef.current) {
            patch(next.id, { status: 'failed', error: 'Not connected.' });
            log(next.text, 'failed');
            setIsDeploying(false);
            return;
        }

        patch(next.id, { status: 'sending' });

        if (next.requiresEditor) {
            sendRef.current(next.text);
            pendingEditorRef.current = {
                stepId: next.id,
                body: extractEditorBody(next.lines),
                deadline: Date.now() + EDITOR_TIMEOUT_MS
            };
            timerRef.current = setTimeout(waitForEditor, EDITOR_POLL_MS);
            return;
        }

        sendRef.current(next.text);
        patch(next.id, { status: 'sent' });
        log(next.text, 'sent');
        timerRef.current = setTimeout(processNext, paceMs);
    }, [patch, log, paceMs, waitForEditor]);

    useEffect(() => { processNextRef.current = processNext; }, [processNext]);

    const start = useCallback((commands: string[]): boolean => {
        if (isDeploying || commands.length === 0) return false;
        if (!connectedRef.current || !sendRef.current) return false;
        pendingEditorRef.current = null;
        sync(planShaperDeploy(commands));
        setAudit([]);
        setIsDeploying(true);
        timerRef.current = setTimeout(processNext, 0);
        return true;
    }, [isDeploying, sync, processNext]);

    const abort = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        pendingEditorRef.current = null;
        setIsDeploying(false);
        log('Deploy aborted by operator.', 'failed');
    }, [log]);

    const reset = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        pendingEditorRef.current = null;
        setIsDeploying(false);
        sync([]);
        setAudit([]);
    }, [sync]);

    const markVerified = useCallback((id: string) => {
        const step = stepsRef.current.find(item => item.id === id);
        patch(id, { status: 'verified' });
        if (step) log(step.text, 'verified');
    }, [patch, log]);

    const markFailed = useCallback((id: string) => {
        const step = stepsRef.current.find(item => item.id === id);
        patch(id, { status: 'failed', error: 'Marked failed by operator.' });
        if (step) log(step.text, 'failed');
    }, [patch, log]);

    return { steps, isDeploying, audit, start, abort, reset, markVerified, markFailed };
};
