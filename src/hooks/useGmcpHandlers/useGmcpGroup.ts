import { useCallback, useRef } from 'react';
import { GroupMember } from '../../types';

interface UseGmcpGroupProps {
    setGroupMembers: React.Dispatch<React.SetStateAction<GroupMember[]>>;
    setStats: (stats: any) => void;
    characterName: string | null;
}

export const useGmcpGroup = ({
    setGroupMembers,
    setStats,
    characterName
}: UseGmcpGroupProps) => {
    const youIdRef = useRef<number | null>(null);

    const syncWaitingState = useCallback((member: GroupMember) => {
        if (member.waiting === undefined && member.position === undefined) return;

        const rawPosition = String(member.position || '').toLowerCase();
        const waiting = member.waiting === true || rawPosition === 'waiting' || rawPosition.includes('waiting');
        setStats((prev: any) => ({
            ...prev,
            conditions: {
                ...(prev.conditions || {}),
                waiting
            }
        }));
    }, [setStats]);

    const normalizeGroupMember = (raw: any): GroupMember => {
        const id = raw.id !== undefined && raw.id !== null ? Number(raw.id) : raw.id;

        const candidates = [raw.mapid, raw.roomid, raw.room_id, raw.rid, raw.vnum, raw.map_id];
        let mapid: number | undefined = undefined;
        for (const c of candidates) {
            if (c !== undefined && c !== null) { mapid = Number(c); break; }
        }
        if (mapid === undefined && raw.room !== undefined && raw.room !== null && !isNaN(Number(raw.room))) {
            mapid = Number(raw.room);
        }
        console.log('[Group Member] raw keys:', Object.keys(raw), '| id:', id, '| resolved mapid:', mapid, '| fighting:', raw.fighting, '| raw:', JSON.stringify(raw));
        return { ...raw, id, mapid: (mapid !== undefined && !isNaN(mapid)) ? mapid : undefined };
    };

    const onGroupAdd = useCallback((data: GroupMember) => {
        console.log('[GMCP] onGroupAdd raw:', JSON.stringify(data));
        const member = normalizeGroupMember(data);
        const isYou = member.type === 'you' || (characterName && member.name && member.name.toLowerCase() === characterName.toLowerCase());

        if (isYou) {
            if (member.id !== undefined) youIdRef.current = Number(member.id);
            syncWaitingState(member);
            return;
        }
        setGroupMembers(prev => {
            if (prev.find(m => Number(m.id) === Number(member.id))) return prev;
            return [...prev, member];
        });
    }, [setGroupMembers, characterName, syncWaitingState]);

    const onGroupUpdate = useCallback((data: any) => {
        console.log('[GMCP] onGroupUpdate raw:', JSON.stringify(data));
        const updates = normalizeGroupMember(data);

        const isYou = updates.id === youIdRef.current ||
                      updates.type === 'you' ||
                      (characterName && updates.name && updates.name.toLowerCase() === characterName.toLowerCase());

        if (isYou && updates.id !== undefined) {
            youIdRef.current = Number(updates.id);
        }

        if (isYou) {
            syncWaitingState(updates);
        }

        setGroupMembers(prev => prev.map(m => {
            if (String(m.id) === String(updates.id)) {
                const merged = { ...m, ...updates };
                if (updates.mapid === undefined && m.mapid !== undefined) {
                    merged.mapid = m.mapid;
                }
                if (updates.fighting === undefined && m.fighting !== undefined) {
                    merged.fighting = m.fighting;
                }
                return merged;
            }
            return m;
        }));
    }, [setGroupMembers, characterName, syncWaitingState]);


    const onGroupRemove = useCallback((id: number) => {
        console.log('[GMCP] onGroupRemove id:', id);
        setGroupMembers(prev => prev.filter(m => String(m.id) !== String(id)));
    }, [setGroupMembers]);

    const onGroupSet = useCallback((data: GroupMember[]) => {
        console.log('[GMCP] onGroupSet raw:', JSON.stringify(data));
        const members = Array.isArray(data) ? data.map(normalizeGroupMember) : [];
        
        const you = members.find(m => m.type === 'you' || (characterName && m.name && m.name.toLowerCase() === characterName.toLowerCase()));
        if (you && you.id !== undefined) {
            youIdRef.current = Number(you.id);
            syncWaitingState(you);
        } else {
            syncWaitingState({ id: 'you', waiting: false } as GroupMember);
        }

        const others = members.filter(m => {
            if (m.type === 'you') return false;
            if (characterName && m.name && m.name.toLowerCase() === characterName.toLowerCase()) return false;
            return true;
        });
        setGroupMembers(others);
    }, [setGroupMembers, characterName, syncWaitingState]);

    return { onGroupAdd, onGroupUpdate, onGroupRemove, onGroupSet };
};
