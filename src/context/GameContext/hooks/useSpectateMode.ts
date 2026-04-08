import { useMemo, useRef, useEffect } from 'react';
import { GroupMember } from '../../../types';

interface UseSpectateModeProps {
    isSpectateMode: boolean;
    spectateTargetId: number | null;
    groupMembers: GroupMember[];
}

export const useSpectateMode = ({ isSpectateMode, spectateTargetId, groupMembers }: UseSpectateModeProps) => {
    const spectateTarget = useMemo(() => {
        if (!isSpectateMode || spectateTargetId == null) return null;
        const target = groupMembers.find(m => {
            const mIdStr = String(m.id);
            const targetIdStr = String(spectateTargetId);
            return mIdStr === targetIdStr || m.name === targetIdStr;
        });
        if (!target) {
            console.warn('[Spectate] Target not found in groupMembers!', {
                spectateTargetId,
                memberIds: groupMembers.map(m => m.id),
                memberNames: groupMembers.map(m => m.name)
            });
        }
        return target ?? null;
    }, [isSpectateMode, spectateTargetId, groupMembers]);

    const prevSpectateTargetIdRef = useRef<number | null>(null);
    useEffect(() => {
        if (spectateTarget && spectateTarget.id !== prevSpectateTargetIdRef.current) {
            console.log('[Spectate] Switched Target to:', spectateTarget.name,
                '| HP:', spectateTarget.hp, '| Mana:', spectateTarget.mana,
                '| Room:', spectateTarget.room, '| MapID:', spectateTarget.mapid,
                '| Fighting:', spectateTarget.fighting,
                '| Full:', JSON.stringify(spectateTarget));
            prevSpectateTargetIdRef.current = spectateTarget.id;
        } else if (!spectateTarget && prevSpectateTargetIdRef.current !== null) {
            console.log('[Spectate] Target cleared');
            prevSpectateTargetIdRef.current = null;
        }
    }, [spectateTarget]);

    return spectateTarget;
};
