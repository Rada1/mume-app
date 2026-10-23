/**
 * @file ChatTranscriptWindow.tsx
 * @description Terminal transcript of received and outgoing communications.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useChatPanel } from '../../hooks/useChatPanel';
import { useChatComposerRequestStore } from '../../stores/useChatComposerRequestStore';
import { ChatTranscriptContent } from './ChatTranscriptContent';

// --- Component Section ---

const ChatTranscriptWindow: React.FC<{ style?: React.CSSProperties; stacked?: boolean }> = ({ style, stacked = false }) => {
    const setShowChatWindow = useSettingsStore(state => state.setShowChatWindow);
    const chat = useChatPanel();
    const composerRequest = useChatComposerRequestStore(state => state.request);
    useEffect(() => {
        if (!composerRequest) return;
        chat.setCommand(composerRequest.command);
        chat.setTarget(composerRequest.target);
        chat.setInputValue(composerRequest.text);
        useChatComposerRequestStore.getState().clearRequest(composerRequest.id);
    }, [chat.setCommand, chat.setInputValue, chat.setTarget, composerRequest]);
    return (
        <aside className={`docked-panel chat-window-panel chat-transcript-panel${stacked ? ' client-panel-stack-item' : ''}`} style={style} aria-label="Chat transcript">
            <header className="chat-transcript-header popover-inspection-panel-heading">
                <span className="client-panel-heading-label">CHAT</span>
                <div className="chat-transcript-header-actions">
                    <button type="button" onClick={() => setShowChatWindow(false)} aria-label="Close chat"><X size={14} /></button>
                </div>
            </header>
            <ChatTranscriptContent chat={chat} />
        </aside>
    );
};

export default React.memo(ChatTranscriptWindow);
