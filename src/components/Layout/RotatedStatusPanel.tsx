/**
 * @file RotatedStatusPanel.tsx
 * @description Groups the command bar and character status for rotated landscape mode.
 */

// --- Logic Section ---
import React from 'react';
import { ActionBox, ActionBoxProps } from '../HUD/ActionBox';
import { LogDockedInput } from '../HUD/LogDockedInput';

interface RotatedStatusPanelProps extends Omit<ActionBoxProps, 'mobile' | 'handleSend'> {
    handleSend: NonNullable<ActionBoxProps['handleSend']>;
    handleInputSwipe?: ActionBoxProps['handleInputSwipe'];
    commandPreview?: ActionBoxProps['commandPreview'];
}

// --- Render Section ---
export const RotatedStatusPanel: React.FC<RotatedStatusPanelProps> = ({
    handleSend,
    handleInputSwipe,
    commandPreview,
    setCommandPreview,
    heldButton,
    setHeldButton,
    wasDraggingRef
}) => (
    <aside className="rotated-status-panel">
        <LogDockedInput
            handleSend={handleSend}
            handleInputSwipe={handleInputSwipe}
            commandPreview={commandPreview}
        />
        <ActionBox
            mobile
            handleSend={handleSend}
            handleInputSwipe={handleInputSwipe}
            commandPreview={commandPreview}
            setCommandPreview={setCommandPreview}
            heldButton={heldButton}
            setHeldButton={setHeldButton}
            wasDraggingRef={wasDraggingRef}
        />
    </aside>
);
