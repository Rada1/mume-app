import { useState, useCallback, useRef } from 'react';
import type { Message, MessageType } from '../types';

export function useReplayMessages() {
    const [messages, setMessages] = useState<Message[]>([]);
    const idCounterRef = useRef(0);

    const addMessage = useCallback((
        type: MessageType,
        text: string,
        _extra?: any,
        mid?: string,
        isRoomName?: boolean,
        precalculated?: { textOnly?: string; lower?: string; html?: string; tokens?: any[] },
        shopItem?: any,
        practiceSkill?: any,
        practiceHeader?: any,
        _isSystem?: boolean,
        replyTarget?: string,
        replyCommand?: string,
        commSender?: string,
        commAction?: string,
        commText?: string,
        commColor?: string,
        commSenderTokens?: any[],
        commTextTokens?: any[],
        providedCombatSide?: 'player' | 'opponent' | 'groupmate',
        providedIsHitImpact?: boolean,
        providedIsHitterImpact?: boolean,
        providedIsSnoop?: boolean,
        providedIsSnoopInput?: boolean,
    ) => {
        const id = mid || `replay-${Date.now()}-${idCounterRef.current++}`;
        const msg: Message = {
            id,
            type,
            textRaw: text,
            textOnly: precalculated?.textOnly ?? text,
            html: precalculated?.html ?? text,
            tokens: precalculated?.tokens,
            timestamp: Date.now(),
            isRoomName,
            replyTarget,
            replyCommand,
            commSender,
            commAction,
            commText,
            commColor,
            commSenderTokens,
            commTextTokens,
            combatSide: providedCombatSide,
            isHitImpact: providedIsHitImpact,
            isHitterImpact: providedIsHitterImpact,
            isSnoop: providedIsSnoop,
            isSnoopInput: providedIsSnoopInput,
            shopItem,
            practiceSkill,
            practiceHeader,
        };
        setMessages(prev => [...prev, msg]);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        idCounterRef.current = 0;
    }, []);

    return { messages, addMessage, clearMessages };
}
