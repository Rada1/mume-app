/** @file CommandCommunicationInlineComposer.tsx — Adds a message field to a selected communication action. */
import React from 'react';
import { Send } from 'lucide-react';
import type { useCommandPanelChat } from '../../hooks/useCommandPanelChat';

// --- Render Section ---
interface CommandCommunicationInlineComposerProps {
    command: string;
    communication: ReturnType<typeof useCommandPanelChat>;
    children?: React.ReactNode;
}

export const CommandCommunicationInlineComposer: React.FC<CommandCommunicationInlineComposerProps> = ({ command, communication, children }) => {
    const { chat, activeCommand } = communication;
    const isActive = activeCommand === command;
    const needsTarget = chat.command === 'tell' || chat.command === 'whisper' || chat.command === 'ask';
    const canSend = Boolean(chat.inputValue.trim()) && (!needsTarget || Boolean(chat.target));
    return <div className="command-communication-inline-action">
        {children}
        {isActive && <form className="command-inline-message-form" onSubmit={chat.send} aria-label={`Compose ${chat.command} message`}>
            <input className="command-inline-message-input" value={chat.inputValue}
                onChange={event => chat.setInputValue(event.target.value)} placeholder="Type a message…"
                aria-label={`Message${chat.target ? ` to ${chat.target}` : ''}`} />
            <button type="submit" disabled={!canSend} aria-label="Send message" title="Send message"><Send size={13} /></button>
        </form>}
    </div>;
};
