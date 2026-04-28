/**
 * @file useRoomParser.ts
 * @description Detects room names, dark status, and triggers mapper movement events.
 */

import { useCallback, useRef } from 'react';

export interface RoomParserDeps {
    roomNameRef: React.RefObject<string | null>;
    roomDescRef?: React.RefObject<string>;
    capture: import('../../types/capture').CaptureController;
    isSpectateMode?: boolean;
    spectateRoomName?: string | null;
    spectateRoomDesc?: string | null;
}

export function useRoomParser(deps: RoomParserDeps) {
    const {
        roomNameRef,
        roomDescRef,
        capture,
        isSpectateMode,
        spectateRoomName,
        spectateRoomDesc
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

    const detectRoom = useCallback((textOnly: string, lower: string, _isPromptMatch: boolean, isSnoop: boolean = false): { isRoomName: boolean; isRoomDescription: boolean; isRoomWindow: boolean } => {
        // Match against spectate state IF it's a snoop line, or match against normal state if it's a regular line.
        const currentRoomRefValue = (isSnoop && spectateRoomName !== undefined) ? spectateRoomName : roomNameRef.current;
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
            if (!isSameRoom && !capture.hasSession() && !isSnoop) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: false } }));
                }
            }
            afterRoomNameRef.current = true;
            descLineCountRef.current = 0; // Reset counter for the new room
        } else if (textOnly.includes('It is pitch black...') || textOnly.includes('You cannot see a thing!')) {
            if (typeof window !== 'undefined' && !isSnoop) {
                window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: true } }));
            }
            afterRoomNameRef.current = false;
            descLineCountRef.current = 0;
        }

        let isRoomDescription = false;
        const currentRoomDescValue = (isSnoop && spectateRoomDesc !== undefined) ? spectateRoomDesc : roomDescRef?.current;
        
        if (!isRoomName && afterRoomNameRef.current && currentRoomDescValue) {
            const trimmed = textOnly.trim();
            if (lower.startsWith('obvious exits') || lower.startsWith('exits:')) {
                afterRoomNameRef.current = false;
                descLineCountRef.current = 0;
            } else if (descLineCountRef.current > 20) {
                afterRoomNameRef.current = false;
                descLineCountRef.current = 0;
            } else if (trimmed !== '') {
                descLineCountRef.current++;
                const normDesc = getNormDesc(currentRoomDescValue);
                const normLine = trimmed.replace(/\s+/g, ' ').toLowerCase();
                const strippedDesc = normDesc.replace(/[^a-z0-9]/g, '');
                const strippedLine = normLine.replace(/[^a-z0-9]/g, '');
                const isDescMatch = strippedLine.length > 0 && strippedDesc.includes(strippedLine);

                if (isDescMatch) {
                    isRoomDescription = true;
                }
            }
        } else if (!isRoomName && afterRoomNameRef.current && !currentRoomDescValue) {
            const trimmed = textOnly.trim();
            if (lower.startsWith('obvious exits') || lower.startsWith('exits:')) {
                afterRoomNameRef.current = false;
            } else if (trimmed !== '') {
                isRoomDescription = true; 
            }
        }

        return { isRoomName, isRoomDescription, isRoomWindow: afterRoomNameRef.current };
    }, [roomNameRef, roomDescRef, capture, isSpectateMode, spectateRoomName, spectateRoomDesc]);

    const parseRoomLine = useCallback((textOnly: string, _cleanLine: string, isSnoop: boolean = false): 'game' | 'room-name' | 'room-description' | null => {
        const lower = textOnly.toLowerCase();
        const { isRoomName, isRoomDescription } = detectRoom(textOnly, lower, false, isSnoop);
        
        if (isRoomName) return 'room-name';
        if (isRoomDescription) return 'room-description';
        
        if (textOnly.includes('It is pitch black...') || textOnly.includes('You cannot see a thing!')) {
            return 'game';
        }

        return null;
    }, [detectRoom]);

    return { detectRoom, parseRoomLine };
}
