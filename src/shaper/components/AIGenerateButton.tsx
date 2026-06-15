/**
 * @file AIGenerateButton.tsx
 * @description Hidden AI generation control for Shaper.
 */

import type { CSSProperties } from 'react';
import type { ShaperWorkspaceDoc } from '../model/shaperTypes';

interface AIGenerateButtonProps<T> {
    target: 'room-description' | 'room-name' | 'door-description';
    doc: ShaperWorkspaceDoc;
    roomId: string;
    onSuccess: (result: T) => void;
    customContext?: Record<string, unknown>;
    title?: string;
    style?: CSSProperties;
}

// --- Component Section ---
export const AIGenerateButton = <T,>({
    target,
    doc,
    roomId,
    onSuccess,
    customContext,
    title,
    style
}: AIGenerateButtonProps<T>) => {
    void target;
    void doc;
    void roomId;
    void onSuccess;
    void customContext;
    void title;
    void style;
    return null;
};
