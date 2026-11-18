/** @file ParleyHistory.tsx — Combined communication history beside the Parley picker. */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useMessageStore } from '../../stores/useMessageStore';
import { useModeStore } from '../../stores/useModeStore';
import { getChatReplyDetails, getChatWindowMessages, type ChatReplyDetails } from '../../utils/chatWindowUtils';
import { useChatHistoryChannels } from '../../hooks/useChatHistoryChannels';
import { ChatEntry } from './ChatEntry';

// --- Combined transcript ---
export const ParleyHistory = ({ onClose, onReply, style }: { onClose: () => void; onReply: (reply: ChatReplyDetails) => void; style?: React.CSSProperties }) => {
    const userMessages = useMessageStore(state => state.userChat);
    const spectateMessages = useMessageStore(state => state.spectateChat);
    const isSpectating = useModeStore(state => state.isSpectating && state.activeView === 'target');
    const messages = useMemo(() => getChatWindowMessages(isSpectating ? spectateMessages : userMessages), [isSpectating, spectateMessages, userMessages]);
    const { filter, setFilter, channels, counts, visibleMessages } = useChatHistoryChannels(messages);
    const scrollRef = useRef<HTMLDivElement>(null);
    const following = useRef(true);
    useLayoutEffect(() => {
        const element = scrollRef.current;
        if (element && following.current) element.scrollTop = element.scrollHeight;
    }, [visibleMessages]);
    return <section className="parley-history" style={style} aria-label="All communication history">
        <div className="parley-history-heading"><span>Recent communications</span><button type="button" onClick={onClose} aria-label="Close communication">×</button></div>
        <div className="parley-history-filter" role="group" aria-label="Filter communications by type">
            {['all', ...channels].map(channel => <button key={channel} type="button" aria-pressed={filter === channel}
                aria-label={`${channel === 'all' ? 'All communications' : channel}${counts[channel] ? `, ${counts[channel]} recent` : ''}`}
                onClick={() => { following.current = true; setFilter(channel); }}>
                {channel === 'all' ? 'All' : channel}{Boolean(counts[channel]) && <span className="parley-history-recent-count" aria-hidden="true">{counts[channel]}</span>}
            </button>)}
        </div>
        <div className="parley-history-scroll" ref={scrollRef} onScroll={event => {
            const element = event.currentTarget;
            following.current = element.scrollHeight - element.clientHeight - element.scrollTop < 48;
        }}>
            {visibleMessages.length ? visibleMessages.map(message => {
                const reply = getChatReplyDetails(message);
                return <ChatEntry key={message.id} message={message} triggerParley={reply ? () => onReply(reply) : undefined} />;
            }) : <p>{filter === 'all' ? 'No communications yet.' : 'No communications of this type.'}</p>}
        </div>
    </section>;
};
