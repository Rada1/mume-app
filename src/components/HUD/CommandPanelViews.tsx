/** @file CommandPanelViews.tsx — Persistent command actions with a separate communication history panel. */
import React from 'react';
import type { CommandPanelViewsProps } from '../../types';
import { CommandChatHistoryPanel } from './CommandChatHistoryPanel';
import './CommandPanelViews.css';

// --- Render Section ---
export const CommandPanelViews: React.FC<CommandPanelViewsProps> = ({ communication, children }) => {
    return <section className="unified-command-workspace" aria-label="Commands" ref={communication.composerRef}>
        {children}
        <CommandChatHistoryPanel communication={communication} />
    </section>;
};
