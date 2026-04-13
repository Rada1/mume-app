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
    setSpectateWaiting: (val: boolean) => void;
    setSpectateRoomName: (name: string | null) => void;
    setSpectateInCombat: (val: boolean) => void;
    setSpectateCharacterName: (name: string | null) => void;
    setRoomPlayers: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomNpcs: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomItems: React.Dispatch<React.SetStateAction<any[]>>;
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
    characterName: string | null;
    mapperRef: React.RefObject<any>;
    detectLighting?: (light: number | string) => void;
    setWeather?: (w: any) => void;
    setIsFoggy?: (f: boolean) => void;
    isSpectateMode?: boolean;
    sessionMode?: 'live' | 'replay';
}

export function useLogGmcpParser(deps: LogGmcpParserDeps) {
    const {
        setSpectateStats,
        setSpectateHealthStatus,
        setSpectateOpponentName,
        setSpectateOpponentStatus,
        setSpectatePosition,
        setSpectateWaiting,
        setSpectateRoomName,
        setSpectateInCombat,
        setSpectateCharacterName,
        setRoomPlayers,
        setRoomNpcs,
        setRoomItems,
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
        
        // Detect if the line has explicit GMCP marking or snoop prefixes
        const isSnooped = /^\s*&[a-zA-Z]\s+/.test(stripped);
        const isExplicitGmcp = /GMCP\s+/i.test(stripped);
        
        // Robust GMCP regex handles optional GMCP prefix and ampersand prefixes
        // Sometimes snooped logs leak naked namespaces like "Core.Ping"
        // In session replays, non-printable "replacement characters" (diamonds) often appear at the start.
        const gmcpRegex = /^[\s\uFFFD\x00-\x1F\x7F-\xFF]*(?:&[a-zA-Z]\s+)*(?:GMCP\s+)?([A-Za-z]+\.[A-Za-z\.]+)(?:\s+(.+))?$/i;
        const match = stripped.match(gmcpRegex);
        
        if (!match) return false;

        const namespace = match[1];
        const jsonStr = match[2];

        // --- Selective Suppression Logic ---
        // If we are NOT in spectate mode, we only suppress if it is EXPLICITLY marked as GMCP,
        // UNLESS we are in replay mode (Theater Mode). In replays, ANY GMCP leak should be hidden.
        // This prevents suppressing "Core.Hello" (no payload) which is common in documentation/help text.
        const isReplay = deps.sessionMode === 'replay';
        if (!deps.isSpectateMode && !isExplicitGmcp && !isReplay) return false;

        // If it looks like a known GMCP namespace but has no payload, it's a signal to suppress
        // (but only if we've passed the mode check above)
        if (!jsonStr) return true;

        try {
            const data = JSON.parse(jsonStr.trim());
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
                        const posLower = data.position.toLowerCase();
                        setSpectateWaiting(posLower === 'waiting' || posLower.includes('waiting'));
                        if (posLower === 'fighting') {
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
                    // Group.Update contains data for arbitrary groupmates (identified by id),
                    // NOT specifically the spectated character. Do NOT use it to drive the
                    // map or spectate state — that must come from snooped Char.Vitals / Room.Info.
                    break;

                case 'Room.Info':
                    if (data.name) setSpectateRoomName(data.name);
                    setRoomItems([]);
                    if (mapperRef.current?.handleRoomInfo) {
                        mapperRef.current.handleRoomInfo({ ...data, spectating: true });
                    }
                    break;

                case 'Room.Items.Set':
                case 'Room.Items.List': {
                    const rawList = Array.isArray(data) ? data : (data.items || data.objects || data.obj || data.objs || []);
                    const list = Array.isArray(rawList) ? rawList : [rawList];
                    const items = list
                        .map((i: any) => typeof i === 'string'
                            ? { name: i, keyword: i, short: i }
                            : { ...i, name: i.name || i.short || i.shortdesc || i.keyword })
                        .filter((i: any) => i.name);
                    setRoomItems(items);
                    break;
                }

                case 'Room.Items.Add': {
                    const obj = typeof data === 'string'
                        ? { name: data, keyword: data, short: data }
                        : { ...data, name: data.name || data.short || data.shortdesc || data.keyword };
                    if (obj.name) {
                        setRoomItems(prev => [...prev, obj]);
                    }
                    break;
                }

                case 'Room.Items.Remove': {
                    const id = (data && typeof data === 'object') ? data.id : null;
                    const name = (data && typeof data === 'object') ? (data.name || data.short || data.keyword) : data;
                    setRoomItems(prev => prev.filter(it => {
                        if (id != null && (it as any).id != null && String((it as any).id) === String(id)) return false;
                        if (name && (it.name === name || it.keyword === name || it.short === name)) return false;
                        return true;
                    }));
                    break;
                }

                case 'Char.Name':
                case 'Char.Info':
                    if (data.name || data.fullname) {
                        setSpectateCharacterName(data.name || data.fullname);
                    }
                    break;

                case 'Room.Chars.Add':
                case 'Room.Chars.Update':
                case 'Room.Chars.Set': {
                    const rawChars = Array.isArray(data) ? data : (data.chars || data.players || data.npcs || [data]);
                    // Pre-process to extract names from descriptions if missing (common in snoop logs).
                    // We also classify PC vs NPC here: NPCs typically start with an article ("a pack horse"),
                    // PCs do not ("Ildaeth the Elf...").
                    const chars = rawChars.map((c: any) => {
                        const hadExplicitType = c.pc !== undefined || c.type !== undefined;
                        if (c.name && hadExplicitType) return c;
                        if (!c.desc && !c.name) return c;

                        const source = c.name || c.desc;
                        const words = source.trim().split(/[ \t,]/).filter(Boolean);
                        if (words.length === 0) return c;

                        const firstWord = words[0];
                        const startsWithArticle = /^(a|an|the|some)$/i.test(firstWord);

                        let extractedName = c.name || firstWord;
                        if (!c.name && startsWithArticle && words.length > 1) {
                            extractedName = words[1];
                        }

                        const sanitized = extractedName.replace(/[.,:;!]$/, '');
                        if (sanitized.length <= 1) return c;

                        // Heuristic: PC if the source didn't lead with an article. Only applied when
                        // the snooped payload didn't already give us a pc/type field.
                        const inferredPc = !hadExplicitType ? !startsWithArticle : undefined;

                        return {
                            ...c,
                            name: sanitized,
                            ...(inferredPc !== undefined ? { pc: inferredPc } : {})
                        };
                    });

                    // In the snooped log-GMCP path we do NOT filter by `characterName`:
                    // the app user (characterName) may legitimately appear in the spectated
                    // player's room list, and we want them highlighted like any other PC.
                    if (namespace === 'Room.Chars.Set') {
                        const pcs: any[] = [];
                        const npcs: any[] = [];
                        chars.forEach((c: any) => {
                            if (!c.name) return;
                            if (c.pc || c.type === 'pc' || c.type === 'player') pcs.push(c);
                            else npcs.push(c);
                        });
                        setRoomPlayers(pcs);
                        setRoomNpcs(npcs);
                    } else {
                        chars.forEach((c: any) => {
                            if (!c.name) return;
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
            // Even if JSON fails, if it's a GMCP line, we suppress it from the log
            return true;
        }
    }, [
        setSpectateStats, setSpectateHealthStatus, setSpectateOpponentName, 
        setSpectateOpponentStatus, setSpectatePosition, setSpectateWaiting, setSpectateRoomName,
        setSpectateInCombat, setSpectateCharacterName, mapperRef,
        detectLighting, setWeather, setIsFoggy, setRoomPlayers, setRoomNpcs, setRoomItems, characterName
    ]);

    return { parseLogGmcp };
}
