/**
 * @file useAIGenerator.ts
 * @description Hook to trigger and poll for generic AI generation targets in Shaper.
 */

import { useState, useCallback } from 'react';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';
import { buildShaperRoomProseContext } from '../model/shaperRoomProse';

interface UseAIGeneratorOptions<T> {
    target: 'room-description' | 'room-name' | 'door-description';
    doc: ShaperWorkspaceDoc;
    roomId: string;
    onSuccess: (result: T) => void;
}

// --- Validation Section ---
const hasTextField = (data: unknown, field: string): boolean =>
    Boolean(data && typeof data === 'object' && typeof (data as Record<string, unknown>)[field] === 'string' && ((data as Record<string, unknown>)[field] as string).trim());

const assertGeneratedPayload = (
    target: UseAIGeneratorOptions<unknown>['target'],
    data: unknown
): void => {
    if (target === 'room-name') {
        if (hasTextField(data, 'name') && hasTextField(data, 'preposition')) return;
        throw new Error('AI returned no usable room name.');
    }
    if (target === 'door-description') {
        if (hasTextField(data, 'exitDescription')) return;
        throw new Error('AI returned no usable exit description.');
    }
    if (hasTextField(data, 'description')) return;
    throw new Error('AI returned no usable room description.');
};

// --- Hook Section ---
export const useAIGenerator = <T>({ target, doc, roomId, onSuccess }: UseAIGeneratorOptions<T>) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState('');

    const generate = useCallback(async (customContext?: Record<string, unknown>) => {
        if (isGenerating) return;
        setIsGenerating(true);
        setStatus('Queueing AI request...');

        try {
            const baseContext = buildShaperRoomProseContext(doc, roomId);
            const context = customContext 
                ? { ...baseContext, ...customContext } 
                : baseContext;

            if (!context) {
                throw new Error('Could not build context for AI generation.');
            }

            const response = await fetch('/api/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target,
                    roomNumber: doc.rooms[roomId]?.roomNumber || '',
                    context
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const message = errorData && typeof errorData.error === 'string'
                    ? errorData.error
                    : 'Failed to send AI request to local server.';
                throw new Error(message);
            }

            const initData = await response.json();

            if (initData.success && initData.instant) {
                const pollRes = await fetch('/api/ai-poll');
                if (pollRes.ok) {
                    const pollData = await pollRes.json();
                    if (pollData && pollData.success && pollData.data) {
                        assertGeneratedPayload(target, pollData.data);
                        onSuccess(pollData.data as T);
                        setIsGenerating(false);
                        setStatus('');
                        return;
                    }
                }
            }

            setStatus('Queued for Agent');
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                if (attempts > 120) {
                    clearInterval(pollInterval);
                    setIsGenerating(false);
                    setStatus('Agent request still pending');
                    return;
                }

                try {
                    const pollResponse = await fetch('/api/ai-poll');
                    if (pollResponse.ok) {
                        const pollData = await pollResponse.json();
                        if (pollData.success && pollData.data) {
                            clearInterval(pollInterval);
                            assertGeneratedPayload(target, pollData.data);
                            onSuccess(pollData.data as T);
                            setIsGenerating(false);
                            setStatus('');
                        }
                    }
                } catch (e) {
                    console.error('Error polling AI status:', e);
                    clearInterval(pollInterval);
                    setIsGenerating(false);
                    setStatus(e instanceof Error ? `Error: ${e.message}` : 'Error polling AI status.');
                }
            }, 1500);
        } catch (err: unknown) {
            console.error('AI generation error:', err);
            setIsGenerating(false);
            const message = err instanceof Error ? err.message : 'AI request failed.';
            setStatus(`Error: ${message}`);
        }
    }, [target, doc, roomId, isGenerating, onSuccess]);

    return {
        generate,
        isGenerating,
        status
    };
};
