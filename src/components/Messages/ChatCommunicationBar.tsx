/** @file ChatCommunicationBar.tsx — Communication composer with cascading destination selection. */
import React from 'react';
import { Send } from 'lucide-react';
import { useChatPanel } from '../../hooks/useChatPanel';
import { ParleyChannelChip } from './ParleyChannelChip';
import { isDirectedParleyChannel } from '../../hooks/useParleyChannelMenu';
// --- Render Section ---
const ChatCommunicationBar = ({ chat, destinationLocked = false }: {
    chat: ReturnType<typeof useChatPanel>; destinationLocked?: boolean;
}) => {
    const directed = isDirectedParleyChannel(chat.command);
    const canSend = Boolean(chat.inputValue.trim()) && (!directed || Boolean(chat.target));
    return <form className="chat-communication-bar" onSubmit={chat.send} aria-label="Send a communication">
        <span className="docked-prompt-symbol" aria-hidden="true">&gt;</span>
        <ParleyChannelChip command={chat.command} target={chat.target} whoList={chat.whoList}
            requestWhoList={chat.ensureWhoList} disabled={destinationLocked}
            onChoose={(command,target) => { chat.setCommand(command); chat.setTarget(target); }}
            onClear={() => { chat.setCommand('say'); chat.setTarget(null); }} />
        <input className="chat-communication-input" value={chat.inputValue} onChange={event => chat.setInputValue(event.target.value)}
            placeholder={directed && !chat.target ? 'Choose a recipient…' : `Send ${chat.command}…`} aria-label="Communication message" />
        <button type="submit" className="chat-communication-send" disabled={!canSend} aria-label="Send communication" title="Send"><Send size={14}/></button>
    </form>;
};
export default ChatCommunicationBar;
