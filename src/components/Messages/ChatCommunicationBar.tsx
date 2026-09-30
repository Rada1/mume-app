/**
 * @file ChatCommunicationBar.tsx
 * @description Communication-only composer for the docked chat transcript.
 */

// --- Logic Section ---
import React, { useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useChatPanel } from '../../hooks/useChatPanel';
import { CHAT_PARLEY_CHANNELS, getChatChannelColor, getChatChannelSuggestions, getChatTargetSuggestions } from '../../utils/chatWindowUtils';
import { getTargetClassificationColor } from '../../utils/targetClassificationColor';
import type { EntityColorMap } from '../../utils/inlineActionModel';
import { TargetChipPicker } from '../HUD/TargetChipPicker';

interface ChatCommunicationBarProps {
    chat: ReturnType<typeof useChatPanel>;
}

const ChatCommunicationBar: React.FC<ChatCommunicationBarProps> = ({ chat }) => {
    const channelAnchorRef = useRef<HTMLButtonElement>(null);
    const targetAnchorRef = useRef<HTMLButtonElement>(null);
    const [openPicker, setOpenPicker] = useState<'channel' | 'target' | null>(null);
    const channelSuggestions = useMemo(() => getChatChannelSuggestions(), []);
    const targetSuggestions = useMemo(() => getChatTargetSuggestions(chat.whoList), [chat.whoList]);
    const inlineCategories = useSettingsStore(state => state.inlineCategories);
    const playerColor = useSettingsStore(state => state.playerColor);
    const npcColor = useSettingsStore(state => state.npcColor);
    const enemyColor = useSettingsStore(state => state.enemyColor);
    const neutralColor = useSettingsStore(state => state.neutralColor);
    const theme = useSettingsStore(state => state.theme);
    const isDirected = chat.command === 'tell' || chat.command === 'whisper' || chat.command === 'ask';
    const canSend = Boolean(chat.inputValue.trim()) && (!isDirected || Boolean(chat.target));
    const channelColor = getChatChannelColor(chat.command);
    const targetColor = getTargetClassificationColor(
        'who', inlineCategories,
        { player: playerColor, ally: playerColor, npc: npcColor, enemy: enemyColor, neutral: neutralColor } as EntityColorMap,
        theme
    ) || '#61c290';

    const chooseChannel = (value: string) => {
        const channel = CHAT_PARLEY_CHANNELS.find(item => item === value);
        if (channel) chat.setCommand(channel);
        setOpenPicker(null);
    };

    const chooseTarget = (value: string) => {
        chat.setTarget(value || null);
        setOpenPicker(null);
    };

    return (
        <form className="chat-communication-bar" onSubmit={chat.send} aria-label="Send a communication">
            <span className="docked-prompt-symbol" aria-hidden="true">&gt;</span>
            <div className="docked-parley-chip" role="group" aria-label="Communication channel" style={{ borderColor: channelColor }}>
                <button
                    ref={channelAnchorRef}
                    type="button"
                    className="parley-action"
                    aria-haspopup="listbox"
                    aria-expanded={openPicker === 'channel'}
                    onPointerDown={event => {
                        event.preventDefault();
                        setOpenPicker(openPicker === 'channel' ? null : 'channel');
                    }}
                    onClick={event => {
                        if (event.detail === 0) setOpenPicker(openPicker === 'channel' ? null : 'channel');
                    }}
                    title="Choose another communication channel"
                >
                    <span className="parley-cmd" style={{ color: channelColor }}>{chat.command}</span>
                </button>
                <button type="button" className="parley-x" aria-label="Clear communication channel" title="Clear communication channel" onMouseDown={event => event.preventDefault()} onClick={() => { chat.setCommand('say'); chat.setTarget(null); }}>&times;</button>
            </div>
            {isDirected && (
                <div className="docked-parley-chip docked-parley-target-chip" role="group" aria-label="Communication recipient" style={{ borderColor: targetColor }}>
                    <button
                        ref={targetAnchorRef}
                        type="button"
                        className="parley-action parley-target-action"
                        aria-haspopup="listbox"
                        aria-expanded={openPicker === 'target'}
                        onPointerDown={event => {
                            event.preventDefault();
                            const isOpening = openPicker !== 'target';
                            if (isOpening) chat.ensureWhoList();
                            setOpenPicker(isOpening ? 'target' : null);
                        }}
                        onClick={event => {
                            if (event.detail !== 0) return;
                            const isOpening = openPicker !== 'target';
                            if (isOpening) chat.ensureWhoList();
                            setOpenPicker(isOpening ? 'target' : null);
                        }}
                        title="Choose a communication recipient"
                    >
                        <span className="parley-tgt" style={{ color: targetColor }}>{chat.target || 'Select target'}</span>
                    </button>
                    {chat.target && <button type="button" className="parley-x" aria-label="Clear recipient" title="Clear recipient" onMouseDown={event => event.preventDefault()} onClick={() => chat.setTarget(null)}>&times;</button>}
                </div>
            )}
            <input
                className="chat-communication-input"
                value={chat.inputValue}
                onChange={event => chat.setInputValue(event.target.value)}
                placeholder={isDirected && !chat.target ? 'Choose a recipient…' : `Send ${chat.command}…`}
                aria-label="Communication message"
            />
            <button type="submit" className="chat-communication-send" disabled={!canSend} aria-label="Send communication" title="Send">
                <Send size={14} />
            </button>
            <TargetChipPicker
                isOpen={openPicker === 'channel'}
                anchorRef={channelAnchorRef}
                suggestions={channelSuggestions}
                currentTarget={chat.command}
                title="Communication channel"
                showMeta={false}
                onChoose={chooseChannel}
                onDismiss={() => setOpenPicker(null)}
            />
            <TargetChipPicker
                isOpen={openPicker === 'target'}
                anchorRef={targetAnchorRef}
                suggestions={targetSuggestions}
                currentTarget={chat.target}
                title="Communication recipient"
                showMeta={false}
                onChoose={chooseTarget}
                onDismiss={() => setOpenPicker(null)}
            />
        </form>
    );
};

export default ChatCommunicationBar;
