/**
 * @file ChatEntry.tsx
 * @description Renders one received or outgoing communication as a terminal transcript line.
 */

import React from 'react';
import type { Message } from '../../types';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { getChatMessageDetails, getChatTranscriptPhrase } from '../../utils/chatWindowUtils';
import { TokenRenderer } from './TokenRenderer';

// --- Logic Section ---

const formatChatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getFallbackHtml = (text: string): string => (
    sanitizeMumeHtml(ansiConvert.toHtml(text))
);

// --- Component Section ---

export const ChatEntry: React.FC<{ message: Message; triggerParley?: (event: React.MouseEvent) => void }> = ({ message }) => {
    const details = getChatMessageDetails(message);
    if (!details) return null;
    const fallbackText = getFallbackHtml(details.text);

    return (
        <article className={`chat-window-entry${details.isOutgoing ? ' chat-window-entry-outgoing' : ''}`}>
            <time className="chat-window-time" dateTime={new Date(message.timestamp).toISOString()}>
                {formatChatTime(message.timestamp)}
            </time>
            <div className="chat-window-line">
                <span className="chat-window-phrase" style={details.color ? { color: details.color } : undefined}>
                    {getChatTranscriptPhrase(details)}
                </span>
                <div className="chat-window-text">
                    {details.isOutgoing ? details.text : <TokenRenderer tokens={message.commTextTokens} fallbackHtml={fallbackText} />}
                </div>
            </div>
        </article>
    );
};

export default ChatEntry;
