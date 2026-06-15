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

export const useAIGenerator = <T>({ target, doc, roomId, onSuccess }: UseAIGeneratorOptions<T>) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState('');

    const generate = useCallback(async (customContext?: any) => {
        if (isGenerating) return;
        setIsGenerating(true);
        setStatus('Requesting Agent...');

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
                throw new Error('Failed to send AI request to local server.');
            }

            const initData = await response.json();

            if (initData.success && initData.instant) {
                const pollRes = await fetch('/api/ai-poll');
                if (pollRes.ok) {
                    const pollData = await pollRes.json();
                    if (pollData && pollData.success && pollData.data) {
                        onSuccess(pollData.data as T);
                        setIsGenerating(false);
                        setStatus('');
                        return;
                    }
                }
            }

            setStatus('Waiting for Agent...');
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                if (attempts > 120) {
                    clearInterval(pollInterval);
                    setIsGenerating(false);
                    setStatus('Timeout waiting for agent.');
                    return;
                }

                try {
                    const pollResponse = await fetch('/api/ai-poll');
                    if (pollResponse.ok) {
                        const pollData = await pollResponse.json();
                        if (pollData.success && pollData.data) {
                            clearInterval(pollInterval);
                            onSuccess(pollData.data as T);
                            setIsGenerating(false);
                            setStatus('');
                        }
                    }
                } catch (e) {
                    console.error('Error polling AI status:', e);
                }
            }, 1500);
        } catch (err: any) {
            console.error('AI generation error:', err);
            setIsGenerating(false);
            setStatus(`Error: ${err.message}`);
        }
    }, [target, doc, roomId, isGenerating, onSuccess]);

    return {
        generate,
        isGenerating,
        status
    };
};
