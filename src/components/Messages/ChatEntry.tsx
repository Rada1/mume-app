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

export const ChatEntry: React.FC<{ message: Message; triggerParley?: (event: React.SyntheticEvent<HTMLElement>) => void }> = ({ message, triggerParley }) => {
    const details = getChatMessageDetails(message);
    if (!details) return null;
    const fallbackText = getFallbackHtml(details.text);
    const phrase = getChatTranscriptPhrase(details);

    return (
        <article
            className={`chat-window-entry${details.isOutgoing ? ' chat-window-entry-outgoing' : ''}${triggerParley ? ' chat-window-entry-replyable' : ''}`}
            onClick={triggerParley}
            onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    triggerParley?.(event);
                }
            }}
            role={triggerParley ? 'button' : undefined}
            tabIndex={triggerParley ? 0 : undefined}
            aria-label={triggerParley ? `Reply to ${details.isOutgoing ? details.target || details.sender : details.sender} on ${details.channel}` : undefined}
        >
            <time className="message-timestamp chat-window-time" dateTime={new Date(message.timestamp).toISOString()}>
                {formatChatTime(message.timestamp)}
            </time>
            <div className={`message-content comm-content${message.type === 'comm-continue' ? ' continuation' : ''}`}>
                {message.type !== 'comm-continue' && (
                    <>
                        <span className="comm-sender">
                            {details.isOutgoing
                                ? details.sender
                                : <TokenRenderer tokens={message.commSenderTokens} fallbackHtml={getFallbackHtml(details.sender)} preferSettingsEntityColor />}
                        </span>
                        <span
                            className="comm-action"
                            style={details.color ? { color: details.color } : undefined}
                            dangerouslySetInnerHTML={{
                                __html: getFallbackHtml(message.commAction
                                    ? ` ${message.commAction}: `
                                    : phrase.slice(details.sender.length))
                            }}
                        />
                    </>
                )}
                <span
                    className={`comm-text${message.replyCommand === 'tell' ? ' tell-body' : ''}`}
                    dangerouslySetInnerHTML={{ __html: fallbackText }}
                />
            </div>
        </article>
    );
};

export default ChatEntry;
