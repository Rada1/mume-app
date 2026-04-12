/**
 * @file useRoomParser.ts
 * @description Detects room names, dark status, and triggers mapper movement events.
 */

import { useCallback, useRef } from 'react';
import { CaptureStage } from '../../types';

export interface RoomParserDeps {
    roomNameRef: React.RefObject<string | null>;
    roomDescRef?: React.RefObject<string>;
    captureStage: React.MutableRefObject<CaptureStage>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    isWaitingForInfo: React.MutableRefObject<boolean>;
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
}

export function useRoomParser(deps: RoomParserDeps) {
    const {
        roomNameRef,
        roomDescRef,
        captureStage,
        isWaitingForStats,
        isWaitingForEq,
        isWaitingForInv,
        isWaitingForInfo,
        isDrawerCapture,
        isSilentCapture
    } = deps;

    const afterRoomNameRef = useRef(false);
    const descLineCountRef = useRef(0); // Safety counter to prevent runaway matching
    const normDescCacheRef = useRef<{ raw: string; norm: string }>({ raw: '', norm: '' });

    const getNormDesc = (desc: string) => {
        if (desc === normDescCacheRef.current.raw) return normDescCacheRef.current.norm;
        const norm = desc.replace(/\s+/g, ' ').toLowerCase();
        normDescCacheRef.current = { raw: desc, norm };
        return norm;
    };

    const detectRoom = useCallback((textOnly: string, lower: string, isPromptMatch: boolean): { isRoomName: boolean; isRoomDescription: boolean; isRoomWindow: boolean } => {
        const currentRoomRefValue = roomNameRef.current;
        let isRoomMatched = currentRoomRefValue && (
            textOnly === currentRoomRefValue || lower === currentRoomRefValue.toLowerCase() ||
            textOnly === currentRoomRefValue + '.' || lower === currentRoomRefValue.toLowerCase() + '.' ||
            (textOnly.startsWith(currentRoomRefValue) || lower.startsWith(currentRoomRefValue.toLowerCase()))
        );
        // Rely exclusively on authoritative GMCP matching for room names to prevent false positives with NPCs/Items.
        let isRoomName = !!(isRoomMatched && textOnly.length < (currentRoomRefValue?.length || 0) + 30 && !textOnly.includes(' - ') && !/carrying|using|following|contains|says|tells|help|change prompt|manual|commands/i.test(lower));

        // Allow room name markers even during background captures to ensure descriptions are detected.
        if (isRoomName) {
            const isSameRoom = currentRoomRefValue && (textOnly === currentRoomRefValue || lower === currentRoomRefValue.toLowerCase());
            if (!isSameRoom && captureStage.current === 'none') {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: false } }));
                }
            }
            afterRoomNameRef.current = true;
            descLineCountRef.current = 0; // Reset counter for the new room
        } else if (textOnly.includes('It is pitch black...') || textOnly.includes('You cannot see a thing!')) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: true } }));
            }
            afterRoomNameRef.current = false;
            descLineCountRef.current = 0;
        }

        // Room description: match lines against the GMCP desc.
        // Key design: do NOT abort on a single non-matching line. Terminal wrapping,
        // dynamic weather text, and blank lines can all appear mid-description.
        // Only terminate when we see "Exits:" or exceed a safety line limit.
        let isRoomDescription = false;
        if (!isRoomName && afterRoomNameRef.current && roomDescRef?.current) {
            const trimmed = textOnly.trim();
            if (lower.startsWith('obvious exits') || lower.startsWith('exits:')) {
                // Definitive end of room description block
                afterRoomNameRef.current = false;
                descLineCountRef.current = 0;
            } else if (descLineCountRef.current > 20) {
                // Safety valve: if we've checked >20 lines without hitting exits, stop
                afterRoomNameRef.current = false;
                descLineCountRef.current = 0;
            } else if (trimmed !== '') {
                descLineCountRef.current++;
                const normDesc = getNormDesc(roomDescRef.current);
                const normLine = trimmed.replace(/\s+/g, ' ').toLowerCase();
                
                // Strip punctuation and spacing to ensure terminal wrapping or punctuation changes
                // don't break the GMCP text match.
                const strippedDesc = normDesc.replace(/[^a-z0-9]/g, '');
                const strippedLine = normLine.replace(/[^a-z0-9]/g, '');
                const isDescMatch = strippedLine.length > 0 && strippedDesc.includes(strippedLine);

                if (isDescMatch) {

                    isRoomDescription = true;
                }
                // NOTE: We intentionally do NOT set afterRoomNameRef = false here.
                // Non-matching lines (weather, items, etc.) are just skipped — the
                // next line still gets a chance to match the description.
            }
            // Blank lines are simply ignored without affecting the state
        }

        return { isRoomName, isRoomDescription, isRoomWindow: afterRoomNameRef.current };
    }, [roomNameRef, roomDescRef, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, isDrawerCapture, isSilentCapture]);

    return { detectRoom };
}
