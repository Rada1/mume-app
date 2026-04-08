/**
 * @file useLogGmcpParser.ts
 * @description Extracts and processes GMCP data embedded as text in the log.
 */

import { useCallback } from 'react';
import { GameStats, CombatHealthStatus } from '../../types';

interface LogGmcpParserDeps {
    setSpectateStats: (stats: GameStats | ((prev: GameStats) => GameStats)) => void;
    setSpectateHealthStatus: (status: CombatHealthStatus | null) => void;
    setSpectateOpponentName: (name: string | null) => void;
    setSpectateOpponentStatus: (status: CombatHealthStatus | null) => void;
    setSpectatePosition: (pos: string) => void;
    setSpectateRoomName: (name: string | null) => void;
    setSpectateInCombat: (val: boolean) => void;
    setSpectateCharacterName: (name: string | null) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
    characterName: string | null;
    mapperRef: React.RefObject<any>;
    detectLighting?: (light: number | string) => void;
    setWeather?: (w: any) => void;
    setIsFoggy?: (f: boolean) => void;
}

export function useLogGmcpParser(deps: LogGmcpParserDeps) {
    const {
        setSpectateStats,
        setSpectateHealthStatus,
        setSpectateOpponentName,
        setSpectateOpponentStatus,
        setSpectatePosition,
        setSpectateRoomName,
        setSpectateInCombat,
        setSpectateCharacterName,
        setRoomPlayers,
        setRoomNpcs,
        setRoomName,
        setRoomDesc,
        characterName,
        mapperRef,
        detectLighting,
        setWeather,
        setIsFoggy
    } = deps;

    const findStatus = (str: string | undefined): CombatHealthStatus | null => {
        if (!str) return null;
        const s = str.toLowerCase();
        if (s.includes('healthy')) return 'Healthy';
        if (s.includes('fine')) return 'Fine';
        if (s.includes('hurt')) return 'Hurt';
        if (s.includes('wounded')) return 'Wounded';
        if (s.includes('bad')) return 'Bad';
        if (s.includes('awful')) return 'Awful';
        if (s.includes('stunned')) return 'Stunned';
        if (s.includes('dying') || s.includes('bleeding')) return 'Dying';
        return null;
    };

    const parseLogGmcp = useCallback((line: string) => {
        // Strip ANSI escape codes first — cleanLine from processLine still contains them
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        // Regex to find "GMCP Namespace {JSON}" possibly with a snoop prefix like "&G "
        // Example: "&W GMCP Char.Vitals {"hp":87,...}"
        const gmcpRegex = /^(?:&[a-zA-Z]\s+)?GMCP\s+([A-Za-z\.]+)\s+(.+)$/;
        const match = stripped.match(gmcpRegex);
        if (!match) return false;

        const namespace = match[1];
        const jsonStr = match[2];

        try {
            const data = JSON.parse(jsonStr);
            console.log('[LogGmcpParser] Parsed:', namespace, data);

            switch (namespace) {
                case 'Char.Vitals':
                    if (data.hp !== undefined || data.mana !== undefined || data.move !== undefined || data.mp !== undefined || data.hits !== undefined) {
                        setSpectateStats(prev => ({
                            hp: data.hp ?? data.hits ?? prev.hp,
                            maxHp: data.maxhp ?? data.maxhits ?? prev.maxHp,
                            mana: data.mana ?? prev.mana,
                            maxMana: data.maxmana ?? prev.maxMana,
                            move: data.move ?? data.moves ?? data.mv ?? data.mp ?? prev.move,
                            maxMove: data.maxmove ?? data.maxmoves ?? data.maxmv ?? data.maxmp ?? prev.maxMove,
                            wimpy: data.wimpy ?? prev.wimpy
                        }));
                    }
                    if (data.hp_status || data['hp-string']) {
                        setSpectateHealthStatus(findStatus(data.hp_status || data['hp-string']));
                    }
                    if (data.position) {
                        setSpectatePosition(data.position);
                        if (data.position.toLowerCase() === 'fighting') {
                            setSpectateInCombat(true);
                        }
                    }
                    if (data.fighting !== undefined) {
                        setSpectateInCombat(!!data.fighting);
                    }
                    if (data.opponent !== undefined) {
                        setSpectateOpponentName(data.opponent || null);
                        setSpectateOpponentStatus(findStatus(data['opponent-hp']));
                        setSpectateInCombat(!!data.opponent);
                    }
                    // --- Environmental sync from snooped Char.Vitals ---
                    if (data.light !== undefined && data.light !== null && detectLighting) {
                        detectLighting(data.light);
                    }
                    if (data.weather !== undefined && setWeather) {
                        setWeather(data.weather);
                    }
                    break;

                case 'Group.Update':
                case 'Group.Set':
                    // Group.Update contains data for arbitrary groupmates (identified by id).
                    // We must NOT use it to update stat bars — those belong to Char.Vitals only.
                    // We can still use it for combat/position context if desired.
                    if (data.fighting !== undefined) {
                        setSpectateInCombat(!!data.fighting);
                    }
                    if (data.opponent !== undefined) {
                        setSpectateOpponentName(data.opponent || null);
                        setSpectateOpponentStatus(findStatus(data['opponent-hp']));
                    }
                    if (data.room !== undefined) {
                        setSpectateRoomName(data.room);
                    }
                    if (data.mapid !== undefined && mapperRef.current?.handleRoomInfo) {
                        mapperRef.current.handleRoomInfo({ 
                            num: Number(data.mapid), 
                            name: data.room || '',
                            spectating: true 
                        });
                    }
                    break;

                case 'Room.Info':
                    if (data.name) setSpectateRoomName(data.name);
                    if (mapperRef.current?.handleRoomInfo) {
                        mapperRef.current.handleRoomInfo({ ...data, spectating: true });
                    }
                    break;

                case 'Char.Name':
                case 'Char.Info':
                    if (data.name || data.fullname) {
                        setSpectateCharacterName(data.name || data.fullname);
                    }
                    break;

                case 'Room.Chars.Add':
                case 'Room.Chars.Update':
                case 'Room.Chars.Set': {
                    const chars = Array.isArray(data) ? data : (data.chars || data.players || data.npcs || [data]);
                    if (namespace === 'Room.Chars.Set') {
                        const pcs: any[] = [];
                        const npcs: any[] = [];
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            if (characterName && c.name.toLowerCase() === characterName.toLowerCase()) return;
                            if (c.pc || c.type === 'pc' || c.type === 'player') pcs.push(c);
                            else npcs.push(c);
                        });
                        setRoomPlayers(pcs);
                        setRoomNpcs(npcs);
                    } else {
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            if (characterName && c.name.toLowerCase() === characterName.toLowerCase()) return;
                            const isPc = c.pc || c.type === 'pc' || c.type === 'player';
                            const setter = isPc ? setRoomPlayers : setRoomNpcs;
                            setter(prev => {
                                const idx = prev.findIndex(x => (x.id && x.id === c.id) || x.name === c.name);
                                if (idx >= 0) {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], ...c };
                                    return next;
                                }
                                return [...prev, c];
                            });
                        });
                    }
                    break;
                }

                case 'Room.Chars.Remove': {
                    const id = typeof data === 'object' ? data.id : data;
                    const filter = (p: any) => p.id !== id;
                    setRoomPlayers(prev => prev.filter(filter));
                    setRoomNpcs(prev => prev.filter(filter));
                    break;
                }
            }
            return true;
        } catch (e) {
            console.warn('[LogGmcpParser] Failed to parse JSON:', jsonStr);
            return false;
        }
    }, [
        setSpectateStats, setSpectateHealthStatus, setSpectateOpponentName, 
        setSpectateOpponentStatus, setSpectatePosition, setSpectateRoomName, 
        setSpectateInCombat, setSpectateCharacterName, mapperRef,
        detectLighting, setWeather, setIsFoggy, setRoomPlayers, setRoomNpcs, characterName
    ]);

    return { parseLogGmcp };
}
