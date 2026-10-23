/** @file CommandChatHistoryPanel.tsx — Chat transcript output beside the command workspace. */
import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CommandPanelViewsProps } from '../../types';
import { ChatTranscriptContent } from '../Messages/ChatTranscriptContent';

// --- Render Section ---
export const CommandChatHistoryPanel: React.FC<Pick<CommandPanelViewsProps, 'communication'>> = ({ communication }) => {
    const close = () => communication.setHistoryPanelOpen(false);
    const heading = <header className="command-chat-history-heading">
        <span>Chat</span>
        <button type="button" onClick={close} aria-label="Close chat history" title="Close chat history"><X size={16} /></button>
    </header>;
    const transcript = <ChatTranscriptContent chat={communication.chat} isVisible={communication.historyVisible} showComposer={false}
        onReplyPrepared={communication.focusComposer} />;

    if (communication.isMobile) {
        if (!communication.historyPanelOpen) return null;
        return <section className="command-chat-history-panel chat-transcript-panel" aria-label="Communication history">
            {heading}
            {transcript}
        </section>;
    }
    if (!communication.historyPanelOpen || typeof document === 'undefined') return null;
    return createPortal(
        <aside className="command-chat-history-side-panel chat-transcript-panel" aria-label="Communication history">
            {heading}
            {transcript}
        </aside>,
        document.body
    );
};
