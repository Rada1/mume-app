/** @file useCommandPanelChat.ts — Inline communication composers and chat history routing. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PopoverState } from '../types';
import { useGame } from '../context/GameContext';
import { useChatPanel } from './useChatPanel';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useChatComposerRequestStore } from '../stores/useChatComposerRequestStore';
import { getInlineCategoryAxes } from '../utils/inlineCategoryAxes';
import { getCommandCommunicationIntent, getCommunicationCommands } from '../utils/commandCommunication';
import type { CommandCommunicationIntent } from '../types';

// --- Logic Section ---
type PendingRecipientCommand = Extract<CommandCommunicationIntent['command'], 'tell' | 'whisper' | 'ask'>;

export const useCommandPanelChat = (activeState: PopoverState) => {
    const chat = useChatPanel();
    const { keywordOverrides, groupMembers, viewport } = useGame();
    const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
    const [activeCommand, setActiveCommand] = useState<string | null>(null);
    const [pendingRecipientCommand, setPendingRecipientCommand] = useState<PendingRecipientCommand | null>(null);
    const composerRef = useRef<HTMLDivElement>(null);
    const historyVisible = historyPanelOpen;
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const isOpen = historyPanelOpen && !viewport?.isMobile;
        document.body.classList.toggle('has-unified-command-chat-history', isOpen);
        return () => document.body.classList.remove('has-unified-command-chat-history');
    }, [historyPanelOpen, viewport?.isMobile]);
    const [focusRequest, setFocusRequest] = useState(0);
    const directedTarget = getInlineCategoryAxes(activeState.category || activeState.setId).isCharacter
        && activeState.entityId !== 'command-panel-self' ? keywordOverrides?.[activeState.context || ''] || activeState.context || null : null;
    const axes = getInlineCategoryAxes(activeState.category || activeState.setId);
    const isLocal = axes.location === 'room';
    const hasGroup = Boolean(groupMembers?.length);
    const commands = useMemo(() => getCommunicationCommands(directedTarget, isLocal, hasGroup), [directedTarget, isLocal, hasGroup]);
    const chatCommands = useMemo(() => getCommunicationCommands(directedTarget, true, hasGroup, true), [directedTarget, hasGroup]);
    const focusComposer = () => setFocusRequest(value => value + 1);
    const openChatComposer = (command: CommandCommunicationIntent['command'], target: string | null, text: string) => {
        useChatComposerRequestStore.getState().requestComposer(command, target, text);
        setHistoryPanelOpen(false);
        setActiveCommand(null);
        useSettingsStore.getState().setShowChatWindow(true);
    };
    useEffect(() => {
        if (!focusRequest) return;
        const composer = composerRef.current?.querySelector<HTMLInputElement>(
            '.chat-communication-input, .command-inline-message-input'
        );
        composer?.focus();
    }, [focusRequest]);
    const handleCommand = (command: string, chooseRecipient = false, contextOverride?: string | null) => {
        const context = contextOverride !== undefined ? contextOverride : chooseRecipient ? null : directedTarget;
        const intent = getCommandCommunicationIntent(command, context);
        if (!intent) return false;
        setPendingRecipientCommand(null);
        openChatComposer(intent.command, intent.target, intent.text);
        return true;
    };
    const handleChatCommand = (command: string) => handleCommand(command, true);
    const selectPendingRecipient = (target: string) => {
        if (!pendingRecipientCommand || !target.trim()) return false;
        openChatComposer(pendingRecipientCommand, target.trim(), '');
        setPendingRecipientCommand(null);
        return true;
    };
    return { chat, activeCommand, focusRequest, directedTarget, handleCommand, handleChatCommand, commands, chatCommands,
        pendingRecipientCommand, selectPendingRecipient,
        historyVisible, historyPanelOpen, setHistoryPanelOpen, composerRef, focusComposer, isMobile: Boolean(viewport?.isMobile) };
};
