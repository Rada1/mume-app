/**
 * @file RotatedStatusPanel.tsx
 * @description Keeps the command bar visible in rotated landscape mode.
 */

// --- Logic Section ---
import React from 'react';
import { LogDockedInput } from '../HUD/LogDockedInput';

interface RotatedStatusPanelProps {
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe?: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview?: string | null;
}

// --- Render Section ---
export const RotatedStatusPanel: React.FC<RotatedStatusPanelProps> = ({
    handleSend,
    handleInputSwipe,
    commandPreview
}) => (
    <aside className="rotated-status-panel">
        <LogDockedInput
            handleSend={handleSend}
            handleInputSwipe={handleInputSwipe}
            commandPreview={commandPreview}
        />
    </aside>
);
