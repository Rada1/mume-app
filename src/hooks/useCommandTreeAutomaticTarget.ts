/** @file useCommandTreeAutomaticTarget.ts — Resolves the auto-target chip value for offensive command rows. */
import { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useAutomaticTargetForRoom, useAutomaticTargetStore } from '../stores/useAutomaticTargetStore';
import { getNonGroupmateRoomTargetSuggestions } from '../utils/groupTargetSuggestions';
import { getAutoRoomTarget } from '../utils/commandAutoTarget';
import { getRoomTargetSuggestions } from '../utils/commandSuggestionUtils';
import { getRoomIdentityKey } from '../utils/roomIdentityUtils';

// --- Logic Section ---
export const useCommandTreeAutomaticTarget = (): string | null => {
    const game = useGame();
    const enabled = useAutomaticTargetStore(state => state.enabled);
    const roomOccupants = useMemo(() => game.roomChars
        ? Object.values(game.roomChars)
        : [...game.roomPlayers, ...game.roomNpcs], [game.roomChars, game.roomNpcs, game.roomPlayers]);
    const suggestions = useMemo(() => [
        ...getNonGroupmateRoomTargetSuggestions(roomOccupants, game.groupMembers, game.characterName || ''),
        ...getRoomTargetSuggestions([], game.roomItems, 'objects')
    ], [game.characterName, game.groupMembers, game.roomItems, roomOccupants]);
    const roomKey = getRoomIdentityKey({
        roomNum: game.roomNum,
        roomName: game.roomName || '',
        roomZone: game.roomZone || '',
        roomDesc: game.roomDesc || ''
    });
    const selectedTarget = useAutomaticTargetForRoom(roomKey, suggestions);
    const fallbackTarget = useMemo(() => getAutoRoomTarget(
        'hit', roomOccupants, game.characterName || '', game.groupMembers
    ), [game.characterName, game.groupMembers, roomOccupants]);

    return enabled ? selectedTarget || fallbackTarget : null;
};
