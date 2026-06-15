/**
 * @file AIGenerateButton.tsx
 * @description Reusable button component to trigger AI text/data generation in Shaper.
 */

import React from 'react';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';
import { useAIGenerator } from '../hooks/useAIGenerator';

interface AIGenerateButtonProps<T> {
    target: 'room-description' | 'room-name' | 'door-description';
    doc: ShaperWorkspaceDoc;
    roomId: string;
    onSuccess: (result: T) => void;
    customContext?: Record<string, unknown>;
    title?: string;
    style?: React.CSSProperties;
}

export const AIGenerateButton = <T,>({
    target,
    doc,
    roomId,
    onSuccess,
    customContext,
    title = 'Generate content with AI',
    style
}: AIGenerateButtonProps<T>) => {
    const { generate, isGenerating, status } = useAIGenerator<T>({
        target,
        doc,
        roomId,
        onSuccess
    });
    const agentStatusTitle = status
        ? 'The request is queued in src/shaper/ai_request.json. An MCP agent must read it and submit a response.'
        : title;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...style }}>
            {status && (
                <span
                    title={agentStatusTitle}
                    style={{ fontSize: '10px', color: '#a78bfa', fontWeight: 'bold' }}
                >
                    {status}
                </span>
            )}
            <button
                type="button"
                onClick={() => generate(customContext)}
                disabled={isGenerating}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isGenerating ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.3)',
                    border: '1px solid #7c3aed',
                    borderRadius: '4px',
                    color: '#ffffff',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                }}
                title={agentStatusTitle}
            >
                ✨ {isGenerating ? 'Gen...' : 'AI'}
            </button>
        </div>
    );
};
