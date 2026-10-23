/** @file ChatTranscriptContent.tsx — Shared combined feed, channel filters, and communication composer. */
import React from 'react';
import type { ChatTranscriptContentProps } from '../../types';
import { useChatTranscript } from '../../hooks/useChatTranscript';
import { ChatEntry } from './ChatEntry';
import ChatCommunicationBar from './ChatCommunicationBar';
import './ChatTranscriptWindow.css';

// --- Render Section ---
export const ChatTranscriptContent: React.FC<ChatTranscriptContentProps> = props => {
    const { chat } = props;
    const transcript = useChatTranscript(props);
    const filterId = React.useId();
    return <div className="chat-transcript-content" ref={transcript.rootRef}>
        <div className="chat-filter-row">
            <label htmlFor={filterId}>Show:</label>
            <select id={filterId} value={chat.filter} onChange={event => chat.setFilter(event.target.value)} aria-label="Filter communications by type">
                <option value="all">All communications</option>
                {chat.channels.map(channel => <option key={channel} value={channel}>{channel}</option>)}
            </select>
            <span>{chat.visibleMessages.length}</span>
        </div>
        <div className="chat-transcript-scroll" ref={transcript.scrollRef} onScroll={transcript.onScroll} aria-label="Communication history">
            {chat.visibleMessages.length === 0 ? <div className="chat-transcript-empty">No communications of this type.</div>
                : chat.visibleMessages.map(message => <ChatEntry key={message.id} message={message} triggerParley={event => transcript.reply(message, event)} />)}
        </div>
        {!transcript.atBottom && <button type="button" className="chat-latest-button" onClick={transcript.scrollToLatest}>Latest messages ↓</button>}
        {props.showComposer !== false && <ChatCommunicationBar chat={chat} />}
    </div>;
};
