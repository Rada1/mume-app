/**
 * @file ChatWindow.tsx
 * @description Communication-only chat window with custom thread scoping and a modern messaging input area.
 */

import React from 'react';
import type { Message } from '../../types';
import { useMessageStore } from '../../stores/useMessageStore';
import { useModeStore } from '../../stores/useModeStore';
import { getChatMessageDetails, getChatWindowMessages, parseOutgoingChatCommand } from '../../utils/chatWindowUtils';
import { useGame } from '../../context/GameContext';
import { ChatEntry } from './ChatEntry';
import { Send } from 'lucide-react';

// --- Logic Section ---

type ChatThread = {
    key: string;
    label: string;
    kind: 'all' | 'private' | 'global' | 'vicinity' | 'group';
    count: number;
    lastTimestamp: number;
};

const getPrivateThreadName = (message: Message): string | null => {
    const details = getChatMessageDetails(message);
    if (!details || (details.channel !== 'tell' && details.channel !== 'whisper')) return null;
    return details.isOutgoing ? (details.target || details.sender) : details.sender;
};

const getMessageThreadKey = (message: Message): string => {
    const details = getChatMessageDetails(message);
    if (!details) return 'all';
    const privateName = getPrivateThreadName(message);
    if (privateName) return `private:${privateName.toLowerCase()}`;
    if (details.channel === 'group') return 'group';
    if (details.channel === 'narrate' || details.channel === 'sing' || details.channel === 'pray') return 'global';
    return 'vicinity';
};

// --- Component Section ---

const ChatWindow: React.FC = () => {
    const isSpectateMode = useModeStore(s => s.isSpectating);
    const activeView = useModeStore(s => s.activeView);
    const userMessages = useMessageStore(s => s.user);
    const spectateMessages = useMessageStore(s => s.spectate);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    const sourceMessages = isSpectateMode && activeView === 'target'
        ? spectateMessages
        : userMessages;

    const chatMessages = React.useMemo(
        () => getChatWindowMessages(sourceMessages),
        [sourceMessages]
    );

    const [selectedThread, setSelectedThread] = React.useState('all');
    const [inputValue, setInputValue] = React.useState('');

    const chatThreads = React.useMemo(() => {
        const threads = new Map<string, ChatThread>([
            ['all', { key: 'all', label: 'All', kind: 'all', count: chatMessages.length, lastTimestamp: 0 }]
        ]);
        chatMessages.forEach(message => {
            const key = getMessageThreadKey(message);
            if (key === 'all') return;
            const privateName = getPrivateThreadName(message);
            const thread = threads.get(key) || {
                key,
                label: privateName || (key === 'global' ? 'Global' : key === 'group' ? 'Group' : 'Vicinity'),
                kind: key.startsWith('private:') ? 'private' : key as ChatThread['kind'],
                count: 0,
                lastTimestamp: 0
            };
            thread.count += 1;
            thread.lastTimestamp = message.timestamp;
            threads.set(key, thread);
        });
        const scopedThreads = ['global', 'vicinity', 'group']
            .map(key => threads.get(key))
            .filter((thread): thread is ChatThread => Boolean(thread));
        const privateThreads = Array.from(threads.values())
            .filter(thread => thread.kind === 'private')
            .sort((a, b) => a.label.localeCompare(b.label));
        return [threads.get('all') as ChatThread, ...scopedThreads, ...privateThreads];
    }, [chatMessages]);

    const scopedThreadList = React.useMemo(
        () => chatThreads.filter(thread => thread.kind !== 'private'),
        [chatThreads]
    );

    const directThreadList = React.useMemo(
        () => chatThreads.filter(thread => thread.kind === 'private'),
        [chatThreads]
    );

    const visibleMessages = React.useMemo(() => (
        selectedThread === 'all'
            ? chatMessages
            : chatMessages.filter(message => getMessageThreadKey(message) === selectedThread)
    ), [chatMessages, selectedThread]);

    React.useEffect(() => {
        if (selectedThread === 'all') return;
        if (!chatThreads.some(thread => thread.key === selectedThread)) {
            setSelectedThread('all');
        }
    }, [chatThreads, selectedThread]);

    const { setParley, triggerHaptic, playClickSound, executeCommand } = useGame() as {
        setParley?: (val: unknown) => void;
        triggerHaptic?: (ms: number) => void;
        playClickSound?: () => void;
        executeCommand?: (cmd: string) => void;
    };

    const handleParley = React.useCallback((msg: Message, e: React.MouseEvent) => {
        if (!setParley || !triggerHaptic) return;
        e.stopPropagation();
        const details = getChatMessageDetails(msg);
        const command = details?.channel || msg.replyCommand || 'tell';
        const directed = command === 'tell' || command === 'whisper';
        setParley({
            active: true,
            command,
            target: directed ? (details?.target ?? msg.replyTarget ?? msg.commSender ?? null) : null
        });
        triggerHaptic(20);
        if (playClickSound) playClickSound();

        // Trigger keyboard on mobile
        setTimeout(() => {
            const inputEl = document.querySelector('.input-field') as HTMLTextAreaElement;
            if (inputEl) {
                inputEl.focus();
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                    const wasReadOnly = inputEl.readOnly;
                    inputEl.readOnly = false;
                    inputEl.focus();
                    setTimeout(() => { inputEl.readOnly = wasReadOnly; }, 100);
                }
            }
        }, 50);
    }, [setParley, triggerHaptic, playClickSound]);

    const handleSendMessage = React.useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text || !executeCommand) return;

        let commandToSend = text;
        const parsed = parseOutgoingChatCommand(text);
        if (!parsed) {
            if (selectedThread === 'vicinity' || selectedThread === 'all') {
                commandToSend = `say ${text}`;
            } else if (selectedThread === 'global') {
                commandToSend = `narrate ${text}`;
            } else if (selectedThread === 'group') {
                commandToSend = `gsay ${text}`;
            } else if (selectedThread.startsWith('private:')) {
                const recipient = selectedThread.substring(8);
                commandToSend = `tell ${recipient} ${text}`;
            }
        }

        executeCommand(commandToSend);
        setInputValue('');
        if (triggerHaptic) triggerHaptic(15);
        
        setTimeout(() => {
            inputRef.current?.focus();
        }, 30);
    }, [inputValue, selectedThread, executeCommand, triggerHaptic]);

    const getPlaceholderText = React.useCallback(() => {
        if (selectedThread === 'all' || selectedThread === 'vicinity') return 'Say to room...';
        if (selectedThread === 'global') return 'Narrate globally...';
        if (selectedThread === 'group') return 'Say to group...';
        if (selectedThread.startsWith('private:')) {
            const name = selectedThread.substring(8);
            return `Tell ${name.charAt(0).toUpperCase() + name.slice(1)}...`;
        }
        return 'Type a message...';
    }, [selectedThread]);

    React.useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;
        scrollEl.scrollTop = scrollEl.scrollHeight;
    }, [visibleMessages.length, selectedThread]);

    return (
        <aside className="chat-window-panel" aria-label="Chat window">
            <div className="chat-window-header">
                <span>Chat</span>
                <span className="chat-window-count">{chatMessages.length}</span>
            </div>
            <div className="chat-window-body">
                <div className="chat-thread-strip" aria-label="Chat scopes">
                    {scopedThreadList.map(thread => (
                        <button
                            key={thread.key}
                            className={`chat-thread-chip${selectedThread === thread.key ? ' active' : ''} chat-thread-${thread.kind}`}
                            onClick={() => setSelectedThread(thread.key)}
                            type="button"
                        >
                            <span className="chat-thread-dot" aria-hidden="true" />
                            <span className="chat-thread-label">{thread.label}</span>
                            <span className="chat-thread-count">{thread.count}</span>
                        </button>
                    ))}
                    {directThreadList.length > 0 && (
                        <>
                            <div className="chat-thread-divider">Tells/Whispers</div>
                            {directThreadList.map(thread => (
                                <button
                                    key={thread.key}
                                    className={`chat-thread-chip chat-thread-dm${selectedThread === thread.key ? ' active' : ''} chat-thread-${thread.kind}`}
                                    onClick={() => setSelectedThread(thread.key)}
                                    type="button"
                                >
                                    <span className="chat-thread-avatar" aria-hidden="true">{thread.label.charAt(0).toUpperCase()}</span>
                                    <span className="chat-thread-label">{thread.label}</span>
                                    <span className="chat-thread-count">{thread.count}</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
                <div className="chat-window-scroll" ref={scrollRef}>
                    {visibleMessages.length === 0 ? (
                        <div className="chat-window-empty">No chat yet.</div>
                    ) : visibleMessages.map(message => (
                        <ChatEntry 
                            key={message.id} 
                            message={message} 
                            triggerParley={(e) => handleParley(message, e)} 
                        />
                    ))}
                </div>
            </div>

            {/* Messaging Input Area */}
            <form onSubmit={handleSendMessage} className="chat-window-input-area">
                <div className="chat-input-wrapper">
                    <input
                        type="text"
                        className="chat-window-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={getPlaceholderText()}
                        ref={inputRef}
                    />
                </div>
                <button 
                    type="submit" 
                    className="chat-window-send-btn"
                    disabled={!inputValue.trim()}
                    aria-label="Send message"
                >
                    <Send size={15} />
                </button>
            </form>
        </aside>
    );
};

export default React.memo(ChatWindow);
