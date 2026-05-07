import { useCallback, useRef } from 'react';
import { GroupMember } from '../../types';

interface UseGmcpGroupProps {
    setGroupMembers: React.Dispatch<React.SetStateAction<GroupMember[]>>;
    setStats: (stats: any) => void;
    characterName: string | null;
}

const getMemberKey = (member: Partial<GroupMember>) => {
    if (member.id !== undefined && member.id !== null) return String(member.id);
    if (member.name) return member.name.toLowerCase();
    return null;
};

const publishActiveMapId = (member: GroupMember, source: string) => {
    if (member.mapid === undefined || member.mapid === null) return;
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('mume-mapper-active-mapid', {
        detail: { mapid: member.mapid, source, spectating: false }
    }));
};

export const useGmcpGroup = ({
    setGroupMembers,
    setStats,
    characterName
}: UseGmcpGroupProps) => {
    const youIdRef = useRef<number | null>(null);

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

    const isSelfMember = useCallback((member: GroupMember) => {
        return member.id === youIdRef.current ||
               member.type === 'you' ||
               (characterName && member.name && member.name.toLowerCase() === characterName.toLowerCase());
    }, [characterName]);

    const mergeGroupMember = useCallback((member: GroupMember, source: string) => {
        const isYou = isSelfMember(member);

        if (isYou && member.id !== undefined) {
            youIdRef.current = Number(member.id);
        }

        if (isYou) {
            publishActiveMapId(member, source);
            if (typeof member.waiting === 'boolean') {
                setStats((prev: { conditions?: Record<string, boolean> }) => ({
                    ...prev,
                    conditions: { ...(prev.conditions || {}), waiting: member.waiting }
                }));
            }
            return;
        }

        const memberKey = getMemberKey(member);
        if (!memberKey) return;

        setGroupMembers(prev => {
            const existingIndex = prev.findIndex(existing => getMemberKey(existing) === memberKey);
            if (existingIndex === -1) {
                console.log(`[GMCP] ${source} created group member:`, JSON.stringify(member));
                return [...prev, member];
            }

            return prev.map((existing, index) => {
                if (index !== existingIndex) return existing;
                const merged = { ...existing, ...member };
                if (member.mapid === undefined && existing.mapid !== undefined) merged.mapid = existing.mapid;
                if (member.fighting === undefined && existing.fighting !== undefined) merged.fighting = existing.fighting;
                if (member.name === undefined && existing.name !== undefined) merged.name = existing.name;
                if (member.hp === undefined && existing.hp !== undefined) merged.hp = existing.hp;
                return merged;
            });
        });
    }, [isSelfMember, setGroupMembers]);

    const onGroupAdd = useCallback((data: GroupMember) => {
        console.log('[GMCP] onGroupAdd raw:', JSON.stringify(data));
        const member = normalizeGroupMember(data);
        mergeGroupMember(member, 'Group.Add');
    }, [mergeGroupMember]);

    const onGroupUpdate = useCallback((data: any) => {
        console.log('[GMCP] onGroupUpdate raw:', JSON.stringify(data));
        const updates = normalizeGroupMember(data);
        mergeGroupMember(updates, 'Group.Update');
    }, [mergeGroupMember]);


    const onGroupRemove = useCallback((id: number) => {
        console.log('[GMCP] onGroupRemove id:', id);
        setGroupMembers(prev => prev.filter(m => String(m.id) !== String(id)));
    }, [setGroupMembers]);

    const onGroupSet = useCallback((data: GroupMember[]) => {
        console.log('[GMCP] onGroupSet raw:', JSON.stringify(data));
        if (!Array.isArray(data)) {
            const member = normalizeGroupMember(data);
            mergeGroupMember(member, 'Group.Set object');
            return;
        }

        const members = Array.isArray(data) ? data.map(normalizeGroupMember) : [];
        
        const you = members.find(isSelfMember);
        if (you) {
            if (you.id !== undefined) {
                youIdRef.current = Number(you.id);
            }
            publishActiveMapId(you, 'Group.Set');
        }

        const others = members.filter(m => !isSelfMember(m));
        setGroupMembers(others);
    }, [setGroupMembers, isSelfMember, mergeGroupMember]);

    return { onGroupAdd, onGroupUpdate, onGroupRemove, onGroupSet };
};
