/**
 * @file ChatTranscriptWindow.tsx
 * @description Terminal transcript of received and outgoing communications.
 */

import React from 'react';
import { Send, X } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGame } from '../../context/GameContext';
import { useChatPanel, CHAT_COMMANDS } from '../../hooks/useChatPanel';
import { ChatEntry } from './ChatEntry';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';

// --- Component Section ---

const ChatTranscriptWindow: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
    const { viewport } = useGame();
    const setShowChatWindow = useSettingsStore(state => state.setShowChatWindow);
    const chat = useChatPanel();
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const scrollElement = scrollRef.current;
        if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
    }, [chat.visibleMessages.length, chat.filter]);

    const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
        chat.send(event);
        inputRef.current?.focus();
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
                    : chat.visibleMessages.map(message => <ChatEntry key={message.id} message={message} />)}
            </div>
            <form className="chat-transcript-compose" onSubmit={handleSend}>
                {chat.recipientOpen && chat.needsRecipient && (
                    <div className="chat-recipient-list" role="group" aria-label="WHO recipients">
                        <div className="chat-recipient-title">WHO · choose recipient</div>
                        {chat.recipients.length === 0
                            ? <div className="chat-recipient-empty">WHO list is empty</div>
                            : chat.recipients.map(name => (
                                <button type="button" key={name} onClick={() => { chat.chooseRecipient(name); inputRef.current?.focus(); }}>{name}</button>
                            ))}
                    </div>
                )}
                <span className="chat-input-prompt" aria-hidden="true">&gt;</span>
                <label className="chat-command-label">
                    <span className="chat-sr-only">Communication command</span>
                    <select value={chat.command} onChange={event => chat.chooseCommand(event.target.value)} aria-label="Communication command">
                        {CHAT_COMMANDS.map(command => <option key={command} value={command}>{command}</option>)}
                    </select>
                </label>
                {chat.needsRecipient && (
                    <button type="button" className="chat-target-button" onClick={chat.toggleRecipients}>
                        {chat.recipient || 'choose target'} ▾
                    </button>
                )}
                <input
                    ref={inputRef}
                    className="chat-transcript-input"
                    type="text"
                    value={chat.inputValue}
                    onChange={event => chat.setInputValue(event.target.value)}
                    aria-label="Message"
                    placeholder="type a message..."
                    autoComplete="off"
                />
                <button type="submit" className="chat-transcript-send" disabled={!chat.inputValue.trim()} aria-label="Send message"><Send size={15} /></button>
                {chat.status && <span className="chat-compose-status" role="status">{chat.status}</span>}
            </form>
        </aside>
    );
};

export default React.memo(ChatTranscriptWindow);
