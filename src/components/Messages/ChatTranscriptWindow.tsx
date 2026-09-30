/**
 * @file ChatTranscriptWindow.tsx
 * @description Terminal transcript of received and outgoing communications.
 */

import React from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGame } from '../../context/GameContext';
import { useChatPanel } from '../../hooks/useChatPanel';
import { ChatEntry } from './ChatEntry';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import ChatCommunicationBar from './ChatCommunicationBar';

// --- Component Section ---

const ChatTranscriptWindow: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
    const { viewport, triggerHaptic, playClickSound } = useGame();
    const setShowChatWindow = useSettingsStore(state => state.setShowChatWindow);
    const chat = useChatPanel();
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const scrollElement = scrollRef.current;
        if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
    }, [chat.visibleMessages.length, chat.filter]);

    const handleReply = (message: Parameters<typeof chat.replyToMessage>[0], event: React.SyntheticEvent<HTMLElement>) => {
        if (!chat.replyToMessage(message)) return;
        event.stopPropagation();
        triggerHaptic?.(20);
        playClickSound?.();

        window.setTimeout(() => {
            const inputElement = document.querySelector('.chat-communication-input') as HTMLInputElement | null;
            if (!inputElement) return;
            inputElement.focus();
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                const wasReadOnly = inputElement.readOnly;
                inputElement.readOnly = false;
                inputElement.focus();
                window.setTimeout(() => { inputElement.readOnly = wasReadOnly; }, 100);
            }
        }, 50);
    };

    return (
        <aside className="docked-panel chat-window-panel chat-transcript-panel" style={style} aria-label="Chat transcript">
            {!viewport?.isMobile && <DrawerResizeHandle handleType="left" widthVar="--desktop-chat-width" minWidth={15} maxWidth={60} />}
            <header className="chat-transcript-header">
                <span><span aria-hidden="true">&gt; </span>chat</span>
                <div className="chat-transcript-header-actions">
                    <span>communications</span>
                    <button type="button" onClick={() => setShowChatWindow(false)} aria-label="Close chat"><X size={14} /></button>
                </div>
            </header>
            <div className="chat-filter-row">
                <label htmlFor="chat-type-filter">show:</label>
                <select id="chat-type-filter" value={chat.filter} onChange={event => chat.setFilter(event.target.value)} aria-label="Filter communications by type">
                    <option value="all">all</option>
                    {chat.channels.map(channel => <option key={channel} value={channel}>{channel}</option>)}
                </select>
                <span>{chat.visibleMessages.length} {chat.visibleMessages.length === 1 ? 'line' : 'lines'}</span>
            </div>
            <div className="chat-transcript-scroll" ref={scrollRef} aria-label="Communication history">
                {chat.visibleMessages.length === 0
                    ? <div className="chat-transcript-empty">No communications of this type.</div>
                    : chat.visibleMessages.map(message => <ChatEntry key={message.id} message={message} triggerParley={event => handleReply(message, event)} />)}
            </div>
            <ChatCommunicationBar chat={chat} />
        </aside>
    );
};

export default React.memo(ChatTranscriptWindow);
