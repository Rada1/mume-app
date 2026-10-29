/** @file ParleyHistory.tsx — Combined communication history beside the Parley picker. */
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useMessageStore } from '../../stores/useMessageStore';
import { useModeStore } from '../../stores/useModeStore';
import { getChatReplyDetails, getChatWindowMessages, type ChatReplyDetails } from '../../utils/chatWindowUtils';
import { ChatEntry } from './ChatEntry';

// --- Combined transcript ---
export const ParleyHistory = ({ onClose, onReply, style }: { onClose: () => void; onReply: (reply: ChatReplyDetails) => void; style?: React.CSSProperties }) => {
    const userMessages = useMessageStore(state => state.userChat);
    const spectateMessages = useMessageStore(state => state.spectateChat);
    const isSpectating = useModeStore(state => state.isSpectating && state.activeView === 'target');
    const messages = useMemo(() => getChatWindowMessages(isSpectating ? spectateMessages : userMessages), [isSpectating, spectateMessages, userMessages]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const following = useRef(true);
    useLayoutEffect(() => {
        const element = scrollRef.current;
        if (element && following.current) element.scrollTop = element.scrollHeight;
    }, [messages]);
    return <section className="parley-history" style={style} aria-label="All communication history">
        <div className="parley-history-heading"><span>Recent communications</span><button type="button" onClick={onClose} aria-label="Close communication">×</button></div>
        <div className="parley-history-scroll" ref={scrollRef} onScroll={event => {
            const element = event.currentTarget;
            following.current = element.scrollHeight - element.clientHeight - element.scrollTop < 48;
        }}>
            {messages.length ? messages.map(message => {
                const reply = getChatReplyDetails(message);
                return <ChatEntry key={message.id} message={message} triggerParley={reply ? () => onReply(reply) : undefined} />;
            }) : <p>No communications yet.</p>}
        </div>
    </section>;
};
