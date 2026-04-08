import { useMemo } from 'react';
import { GameStats, CombatHealthStatus, CharacterInfo } from '../../../types';

interface UseGameContextVitalsProps {
    v: any;
    s: any;
}

export const useGameContextVitals = ({ v, s }: UseGameContextVitalsProps) => {
    const effectiveStats = useMemo(() => {
        if (s.isSpectateMode) {
            return s.spectateStats;
        }
        return v.stats;
    }, [s.isSpectateMode, s.spectateStats, v.stats]);

    const effectiveVitals = useMemo(() => {
        if (s.isSpectateMode) {
            return {
                ...v,
                stats: s.spectateStats,
                playerHealthStatus: s.spectateHealthStatus,
                opponentName: s.spectateOpponentName,
                opponentHealthStatus: s.spectateOpponentStatus,
                characterName: s.spectateCharacterName,
                roomName: s.spectateRoomName
            };
        }
        return v;
    }, [v, s.isSpectateMode, s.spectateStats, s.spectateHealthStatus, s.spectateOpponentName, s.spectateOpponentStatus, s.spectateCharacterName, s.spectateRoomName]);

    return { effectiveStats, effectiveVitals };
};
