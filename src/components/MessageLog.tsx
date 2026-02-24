import React from 'react';
import { Message } from '../types';
import { ansiConvert } from '../utils/ansi';
import TypewriterText from './TypewriterText';

interface MessageLogProps {
    messages: Message[];
    activePrompt: string;
    inCombat: boolean;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onScroll: () => void;
    onLogClick: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    onDoubleClick?: (e: React.MouseEvent) => void;
    getMessageClass: (index: number, total: number) => string;
    processMessageHtml: (html: string, mid?: string) => string;
    scrollToBottom: () => void;
}

const MessageItem = React.memo(({
    msg,
    index,
    total,
    isLatest,
    inCombat,
    getMessageClass,
    processMessageHtml,
    scrollToBottom
}: {
    msg: Message,
    index: number,
    total: number,
    isLatest: boolean,
    inCombat: boolean,
    getMessageClass: (i: number, t: number) => string,
    processMessageHtml: (h: string, mid?: string) => string,
    scrollToBottom: () => void
}) => {
    return (
        <div
            className={`message ${msg.type} ${getMessageClass(index, total)}${inCombat && !msg.isCombat ? ' combat-dim' : ''}`}
        >
            {msg.type === 'user' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'prompt' ? (
                <span>{msg.textRaw}</span>
            ) : (msg.isComm && isLatest) ? (
                <TypewriterText html={processMessageHtml(msg.html, msg.id)} onUpdate={scrollToBottom} />
            ) : (
                <div className="message-content" dangerouslySetInnerHTML={{ __html: processMessageHtml(msg.html, msg.id) }} />
            )}
        </div>
    );
});

const MessageLog: React.FC<MessageLogProps> = ({
    messages,
    activePrompt,
    inCombat,
    scrollContainerRef,
    messagesEndRef,
    onScroll,
    onLogClick,
    onMouseUp,
    onDoubleClick,
    getMessageClass,
    processMessageHtml,
    scrollToBottom
}) => {
    return (
        <div
            className={`message-log${inCombat ? ' combat-mode' : ''}`}
            ref={scrollContainerRef}
            onScroll={onScroll}
            onClick={onLogClick}
            onMouseUp={onMouseUp}
            onDoubleClick={onDoubleClick}
        >
            {messages.map((msg, i) => (
                <MessageItem
                    key={msg.id}
                    msg={msg}
                    index={i}
                    total={messages.length}
                    isLatest={i === messages.length - 1}
                    inCombat={inCombat}
                    getMessageClass={getMessageClass}
                    processMessageHtml={processMessageHtml}
                    scrollToBottom={scrollToBottom}
                />
            ))}
            {activePrompt && (
                <div className="message prompt msg-latest" style={{ transition: 'none' }}>
                    <div className="message-content" dangerouslySetInnerHTML={{ __html: processMessageHtml(ansiConvert.toHtml(activePrompt), 'prompt') }} />
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default React.memo(MessageLog);
