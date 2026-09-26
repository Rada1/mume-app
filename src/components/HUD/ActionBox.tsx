/**
 * @file ActionBox.tsx
 * @description Desktop HUD surface for the "This is You" console below the log.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ThisIsYouConsole } from './ThisIsYouConsole';
import './ActionBox.css';

export interface ActionBoxProps {
    handleSend?: (e?: React.FormEvent) => void;
    handleInputSwipe?: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview?: string | null;
    setCommandPreview?: React.Dispatch<React.SetStateAction<string | null>>;
    heldButton?: unknown;
    setHeldButton?: React.Dispatch<React.SetStateAction<unknown>>;
    wasDraggingRef?: React.RefObject<boolean>;
}

// --- Render Section ---
export const ActionBox: FC<ActionBoxProps> = () => {
    const bottomBarOpacity = useSettingsStore(s => s.bottomBarOpacity);

    return (
        <div
            className="action-box"
            style={{ opacity: bottomBarOpacity } as React.CSSProperties}
        >
            <div className="action-box-this-is-you-row">
                <ThisIsYouConsole />
            </div>
        </div>
    );
};

export default ActionBox;
