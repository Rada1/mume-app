/**
 * @file ChatEntry.tsx
 * @description Renders a single chat bubble message in the communication-only chat window.
 */

import React from 'react';
import type { Message } from '../../types';
import { useGame } from '../../context/GameContext';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { getChatMessageDetails } from '../../utils/chatWindowUtils';
import { TokenRenderer } from './TokenRenderer';

// --- Logic Section ---

const formatChatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const CHANNEL_LABELS: Record<string, string> = {
    ask: 'Ask',
    group: 'Group',
    narrate: 'Narrate',
    pray: 'Pray',
    say: 'Say',
    shout: 'Shout',
    sing: 'Song',
    tell: 'Tell',
    whisper: 'Whisper',
    yell: 'Yell'
};

const getChannelLabel = (channel: string): string => CHANNEL_LABELS[channel] || channel.replace(/\b\w/g, c => c.toUpperCase());

const getFallbackHtml = (text: string): string => (
    sanitizeMumeHtml(ansiConvert.toHtml(text))
);

// --- Component Section ---

interface ChatEntryProps {
    message: Message;
    triggerParley: (e: React.MouseEvent) => void;
}

export const ChatEntry: React.FC<ChatEntryProps> = ({ message, triggerParley }) => {
    const { characterName } = useGame() as { characterName: string | null };
    const details = getChatMessageDetails(message);
    if (!details) return null;
    const { channel, sender, text, isOutgoing } = details;
    const channelLabel = getChannelLabel(channel);
    const fallbackText = getFallbackHtml(text);
    const displayName = isOutgoing ? (characterName || sender) : sender;

    return (
        <div className={`chat-window-entry ${isOutgoing ? 'chat-window-entry-outgoing' : 'chat-window-entry-incoming'} chat-channel-${channel}`}>
            <div
                className="comm-bubble"
                style={{
                    color: message.commColor,
                    cursor: 'pointer',
                    '--bubble-color': message.commColor,
                    '--glow-color': message.commColor
                } as React.CSSProperties}
                onClick={triggerParley}
            >
                <div className="chat-window-meta">
                    <span className="chat-window-channel">{channelLabel}</span>
                    <span className="comm-sender">
                        {isOutgoing ? displayName : <TokenRenderer tokens={message.commSenderTokens} fallbackHtml={getFallbackHtml(displayName)} />}
                    </span>
                    <span className="chat-window-time">{formatChatTime(message.timestamp)}</span>
                </div>
                <div className="comm-text">
                    {isOutgoing ? text : <TokenRenderer tokens={message.commTextTokens} fallbackHtml={fallbackText} splitFirstWord />}
                </div>
            </div>
        </div>
    );
};

export default ChatEntry;
