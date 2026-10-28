/** @file commandChat.ts — Contracts for communication inside the command workspace. */
import type React from 'react';
import type { ParleyState } from './game';
import type { PopoverState } from './ui';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { useChatPanel } from '../hooks/useChatPanel';
import type { useCommandPanelChat } from '../hooks/useCommandPanelChat';

// --- Communication Contracts ---
export interface ParleyChannelChipProps {
    command: ParleyState['command'];
    target: string | null;
    whoList: string[];
    requestWhoList: () => void;
    onChoose: (command: Exclude<ParleyState['command'], 'none'>, target: string | null) => void;
    onClear?: () => void;
    disabled?: boolean;
    iconOnly?: boolean;
}
export interface CommandCommunicationIntent {
    command: Exclude<ParleyState['command'], 'none'>;
    target: string | null;
    text: string;
}
export interface ChatTranscriptContentProps {
    chat: ReturnType<typeof useChatPanel>;
    isVisible?: boolean;
    focusRequest?: number;
    showComposer?: boolean;
    onReplyPrepared?: () => void;
}
export interface CommandPanelViewsProps {
    communication: ReturnType<typeof useCommandPanelChat>;
    children: React.ReactNode;
}

export interface CommandInspectionOptions {
    activeState: PopoverState;
    scope: 'room' | 'self' | 'selected';
    isVisible?: boolean;
}

export interface CommunicationCommandChoice {
    command: CommandCommunicationIntent['command'];
    label: string;
    target: string | null;
}
export interface OnlineCommandTargetsProps {
    onSelect: (entry: CommandActionTargetEntry) => void;
    onPreviewTarget?: (entry: CommandActionTargetEntry | null) => void;
    currentEntityId?: string;
    color?: string;
    open?: boolean;
    hideHeader?: boolean;
    namesOnly?: boolean;
    onOpenChange?: (open: boolean) => void;
    excludedNames?: string[];
}
