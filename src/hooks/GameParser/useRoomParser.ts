/**
 * @file useRoomParser.ts
 * @description Detects room names, dark status, and triggers mapper movement events.
 */

import { useCallback, useRef } from 'react';
import { MOVE_FAILURE_REGEX } from '../useMessageLog';
import { getTaggedRoomObjectNames } from './roomItemDetection';

const WALL_BUMP_REGEX = /^(?:Alas, you cannot go that way\.|You can't go there\.|You cannot go that way\.|The .+ seems to be closed\.|It's closed\.|You can't see to go that way\.)/i;
// MMapper consumes one queued command for these server responses as well.
const ADDITIONAL_MOVE_FAILURE_REGEX = /^(?:You failed to climb|You need to swim to go there\.|You cannot ride there\.|You are too exhausted to ride\.|Your mount refuses to follow your orders!|You failed swimming there\.|You can't go into deep water!|You cannot ride into deep water!|You unsuccessfully try to break through the ice\.|Your boat cannot enter this place\.|No way! You are fighting for your life!|Nah\.\.\. You feel too relaxed to do that\.|Maybe you should get on your feet first\?|In your dreams, or what\?|If you still want to try, you must|ZBLAM! .+ doesn't want you riding (?:him|her|it) anymore\.)|(?:seem to be closed\.|seems to be closed\.|is too steep, you need to climb to go there\.|is too exhausted\.)$/i;

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
        // Preserve the original line for display, but ignore protocol padding for matching.
        const roomMatchText = textOnly.trim();
        const roomMatchLower = roomMatchText.toLowerCase();
        let isRoomMatched = currentRoomRefValue && (
            roomMatchText === currentRoomRefValue || roomMatchLower === currentRoomRefValue.toLowerCase() ||
            roomMatchText === currentRoomRefValue + '.' || roomMatchLower === currentRoomRefValue.toLowerCase() + '.' ||
            (roomMatchText.startsWith(currentRoomRefValue) || roomMatchLower.startsWith(currentRoomRefValue.toLowerCase()))
        );
        // Rely exclusively on authoritative GMCP matching for room names to prevent false positives with NPCs/Items.
        let isRoomName = !!(isRoomMatched && roomMatchText.length < (currentRoomRefValue?.length || 0) + 30 && !roomMatchText.includes(' - ') && !/carrying|using|following|contains|says|tells|help|change prompt|manual|commands/i.test(roomMatchLower));

        // Allow room name markers even during background captures to ensure descriptions are detected.
        if (isRoomName) {
            const isSameRoom = currentRoomRefValue && (roomMatchText === currentRoomRefValue || roomMatchLower === currentRoomRefValue.toLowerCase());
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

    const parseRoomLine = useCallback((textOnly: string, cleanLine: string, isSnoop: boolean = false, containsRoomObject = false): 'game' | 'room-name' | 'room-description' | null => {
        const lower = textOnly.toLowerCase();
        const { isRoomName, isRoomDescription, isRoomWindow } = detectRoom(textOnly, lower, false, isSnoop);
        const hasRoomObject = containsRoomObject || getTaggedRoomObjectNames(cleanLine).length > 0;
        
        if (isRoomName) return 'room-name';
        if (isRoomDescription || (isRoomWindow && hasRoomObject)) return 'room-description';
        
        if (textOnly.includes('It is pitch black...') || textOnly.includes('You cannot see a thing!')) {
            return 'game';
        }

        if (!isSnoop && (MOVE_FAILURE_REGEX.test(textOnly) || ADDITIONAL_MOVE_FAILURE_REGEX.test(textOnly))) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-move-failed'));
                if (WALL_BUMP_REGEX.test(textOnly.trim())) {
                    window.dispatchEvent(new Event('mume-mapper-wall-bump'));
                }
            }
            return 'game';
        }

        return null;
    }, [detectRoom]);

    return { detectRoom, parseRoomLine };
}
