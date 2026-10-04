/** @file useVisibleRoomOrder.ts — Tracks character order in visible room output. */

// --- Logic Section ---
import { useCallback, useRef } from 'react';
import type { Message, VisibleRoomSubject } from '../types';
import { useRoomStore } from '../stores/useRoomStore';
import { getVisibleRoomSubject } from './roomVisibleOrder';

export const useVisibleRoomOrder = (isSpectateSession = false) => {
    const captureRef = useRef<{ roomNum: number; subjects: VisibleRoomSubject[] } | null>(null);

    const observeRoomLine = useCallback((message: Message) => {
        if (isSpectateSession || message.isSnoop) return;
        if (message.isRoomName) {
            captureRef.current = { roomNum: useRoomStore.getState().roomNum, subjects: [] };
            return;
        }

        const capture = captureRef.current;
        if (!capture) return;
        const line = (message.textOnly || message.textRaw).trim();
        const isEnd = message.type === 'prompt' || /^(?:exits:|obvious exits\b)/i.test(line);
        if (isEnd || message.type !== 'game' || message.isCombat || message.isComm) {
            useRoomStore.getState().setVisibleRoomSubjects(capture.subjects, capture.roomNum);
            captureRef.current = null;
            return;
        }
        if (line) capture.subjects.push(getVisibleRoomSubject(message));
    }, [isSpectateSession]);

    return observeRoomLine;
};
