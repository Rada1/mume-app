/**
 * @file useRoomParser.ts
 * @description Detects room names, dark status, and triggers mapper movement events.
 */

import { useCallback } from 'react';
import { CaptureStage } from '../../types';

export interface RoomParserDeps {
    roomNameRef: React.RefObject<string | null>;
    captureStage: React.MutableRefObject<CaptureStage>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
}

export function useRoomParser(deps: RoomParserDeps) {
    const {
        roomNameRef,
        captureStage,
        isWaitingForStats,
        isWaitingForEq,
        isWaitingForInv,
        isDrawerCapture,
        isSilentCapture
    } = deps;

    const detectRoom = useCallback((textOnly: string, lower: string, cleanLine: string) => {
        const currentRoomRefValue = roomNameRef.current;
        let isRoomMatched = currentRoomRefValue && (
            textOnly === currentRoomRefValue || lower === currentRoomRefValue.toLowerCase() ||
            textOnly === currentRoomRefValue + '.' || lower === currentRoomRefValue.toLowerCase() + '.' ||
            (textOnly.startsWith(currentRoomRefValue) || lower.startsWith(currentRoomRefValue.toLowerCase()))
        );
        let isRoomAnsiMatch = /^\s*(?:\x1b\[[0-9;]*m)*\x1b\[[0-9;]*3[0-7]m/.test(cleanLine) &&
            textOnly.length < 80 && !textOnly.includes(' - ') &&
            !/carrying|using|following|contains|says|tells/i.test(lower);
        
        let isRoomName = !!(isRoomAnsiMatch || (isRoomMatched && textOnly.length < (currentRoomRefValue?.length || 0) + 30 && !textOnly.includes(' - ') && !/carrying|using|following|contains|says|tells/i.test(lower)));

        if (isRoomName && captureStage.current === 'none' && !isWaitingForStats.current && !isWaitingForEq.current && !isWaitingForInv.current) {
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
            isSilentCapture.current = 0;

            const isSameRoom = currentRoomRefValue && (textOnly === currentRoomRefValue || lower === currentRoomRefValue.toLowerCase());
            if (!isSameRoom) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: false } }));
                }
            }
        } else if (textOnly.includes('It is pitch black...') || textOnly.includes('You cannot see a thing!')) {
             if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: true } }));
            }
        }

        return isRoomName;
    }, [roomNameRef, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv, isDrawerCapture, isSilentCapture]);

    return { detectRoom };
}
