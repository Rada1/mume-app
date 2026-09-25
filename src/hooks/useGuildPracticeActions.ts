/**
 * @file useGuildPracticeActions.ts
 * @description Detect current guild training and expose eligible skill practice actions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMapper } from '../context/useMapper';
import type { GmcpOccupant, PracticeData, PracticeSkill } from '../types';
import { getGuildClassFromFlags } from '../utils/practiceClassCatalog';

type PracticeCommand = (command: string, silent?: boolean, hideInHistory?: boolean, skipHistory?: boolean, system?: boolean) => void;

// --- Logic Section ---
export const useGuildPracticeActions = (
    isPlaying: boolean,
    roomNum: string | number | null | undefined,
    roomNpcs: GmcpOccupant[],
    practiceData: PracticeData | null | undefined,
    executeCommand: PracticeCommand
) => {
    const mapper = useMapper();
    const roomKey = String(roomNum ?? mapper.currentRoomId ?? '');
    const mapRoomKey = mapper.currentRoomId || '';
    const roomIdVnum = mapRoomKey.replace(/^m_/, '');
    const mapRoom = mapper.rooms[mapRoomKey] || mapper.rooms[`m_${roomIdVnum}`] || mapper.rooms[roomIdVnum];
    const currentVnum = mapRoom?.gmcpId ? String(mapRoom.gmcpId) : roomIdVnum;
    const preloadedRoom = currentVnum ? mapper.preloadedCoordsRef?.current?.[currentVnum] : undefined;
    const guildClass = getGuildClassFromFlags([
        ...(preloadedRoom?.[7] || []), ...(mapRoom?.mobFlags || []),
        ...(preloadedRoom?.[8] || []), ...(mapRoom?.loadFlags || [])
    ]);
    const hasGuildmaster = Boolean(guildClass) || roomNpcs.some(npc => /guild\s?master/i.test(npc.name || ''));
    const requestKey = isPlaying && hasGuildmaster ? roomKey : null;
    const requestedRoomRef = useRef<string | null>(null);
    const previousDataRef = useRef<PracticeData | null | undefined>(null);
    const [syncedRoom, setSyncedRoom] = useState<string | null>(null);

    useEffect(() => {
        if (!requestKey) { requestedRoomRef.current = null; setSyncedRoom(null); return; }
        if (requestedRoomRef.current === requestKey) return;
        requestedRoomRef.current = requestKey;
        previousDataRef.current = practiceData;
        setSyncedRoom(null);
        executeCommand('practice', true, true, false, true);
    }, [requestKey, executeCommand, practiceData]);

    useEffect(() => {
        if (requestKey && practiceData && practiceData !== previousDataRef.current && practiceData.isAtGuildmaster) {
            setSyncedRoom(requestKey);
        }
    }, [requestKey, practiceData]);

    const available = Boolean(requestKey && syncedRoom === requestKey && practiceData?.isAtGuildmaster);
    const skills = useMemo(() => new Map(
        (available ? practiceData?.skills || [] : []).map(skill => [skill.name.trim().toLowerCase(), skill])
    ), [available, practiceData]);

    const trainingFor = useCallback((name: string): { skill: PracticeSkill; enabled: boolean; reason: string } | null => {
        const skill = skills.get(name.trim().toLowerCase());
        if (!skill) return null;
        const sessions = skill.sessions.match(/^(\d+)\s*\/\s*(\d+)$/);
        const maxed = (sessions && Number(sessions[1]) >= Number(sessions[2])) || /know as much as i do/i.test(skill.advice);
        const noSessions = (practiceData?.sessionsLeft ?? 0) < 1;
        return { skill, enabled: !maxed && !noSessions, reason: maxed ? 'Maxed here' : noSessions ? 'No sessions' : 'Practice' };
    }, [skills, practiceData?.sessionsLeft]);

    return { available, sessionsLeft: practiceData?.sessionsLeft ?? 0, trainingFor };
};
