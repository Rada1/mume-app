import { useCallback, useRef } from 'react';
import { GmcpCharVitals, GmcpCharInfo, CombatHealthStatus } from '../../types';
import { normalizeCombatantName } from '../../utils/combatUtils';
import { normalizeGmcpWeather } from '../../utils/weatherUtils';

interface UseGmcpVitalsProps {
    setCurrentTerrain: (terrain: string) => void;
    setPlayerHealthStatus: (status: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (status: CombatHealthStatus | null) => void;
    setBufferHealthStatus: (status: CombatHealthStatus | null) => void;
    setOpponentId: (id: string | null) => void;
    setOpponentName: (name: string | null) => void;
    setBufferName: (name: string | null) => void;
    setPlayerPosition: (pos: string) => void;
    setMood?: (val: string) => void;
    sendCommand?: (cmd: string) => void;
    setCurrentWeather: (weather: import('../../types').WeatherType) => void;
    setIsFoggy: (isFoggy: boolean) => void;
    setCharacterInfo: React.Dispatch<React.SetStateAction<import('../../types').CharacterInfo>>;
    getCharNameFromId: (id: string | null | undefined) => string | null;
    findStatus: (str: string | undefined) => CombatHealthStatus | null;
    detectLighting?: (symbol: string | number) => void;
    isSpectateMode?: boolean;
    setInCombat?: (val: boolean, force?: boolean) => void;
    playerPositionRef: React.MutableRefObject<string>;
    opponentName: string | null;
    opponentId: string | null;
    bufferName: string | null;
}

export const useGmcpVitals = ({
    setCurrentTerrain,
    setPlayerHealthStatus,
    setOpponentHealthStatus,
    setBufferHealthStatus,
    setOpponentId,
    setOpponentName,
    setBufferName,
    setPlayerPosition,
    setMood,
    sendCommand,
    setCurrentWeather,
    setIsFoggy,
    setCharacterInfo,
    getCharNameFromId,
    findStatus,
    detectLighting,
    isSpectateMode,
    setInCombat,
    playerPositionRef,
    opponentName,
    opponentId,
    bufferName
}: UseGmcpVitalsProps) => {
    const lastMoodRef = useRef<string | null>(null);

    const onCharVitals = useCallback((data: GmcpCharVitals) => {
        if (data.mood && !isSpectateMode) {
            const nextMood = data.mood.toLowerCase();
            const previousMood = lastMoodRef.current;
            lastMoodRef.current = nextMood;
            setMood?.(nextMood);

            if (previousMood !== null && previousMood !== nextMood) {
                sendCommand?.('info %O %D %k %A');
            }
        }

        if (data.terrain) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-terrain', { detail: data.terrain }));
            }
            if (!isSpectateMode) {
                setCurrentTerrain(data.terrain);
            }
        }

        if (data.light !== undefined && data.light !== null && detectLighting) {
            if (!isSpectateMode) {
                detectLighting(data.light);
            }
        }

        if (data.position) {
            // console.log('[GMCP] Position Update:', data.position);
            // Don't let 'standing' stomp 'riding' because MUME often says 'standing' while mounted.
            const isCurrentlyRiding = playerPositionRef.current === 'riding' || playerPositionRef.current === 'mounted';
            if (data.position === 'standing' && isCurrentlyRiding) {
                // console.log('[GMCP] Ignoring position:standing because we are riding');
            } else {
                setPlayerPosition(data.position);
                playerPositionRef.current = data.position;
                
                // Sync combat state from position
                if (setInCombat && !isSpectateMode) {
                    setInCombat(data.position === 'fighting');
                }
            }
        }

        // Strict clearing signal: if opponent is null/empty, we ARE NOT fighting
        if (data.opponent === null || data.opponent === "" || (data.opponent === undefined && data.position === 'standing')) {
            if (setInCombat && !isSpectateMode) {
                setInCombat(false);
            }
        }

        // --- Combat Info via Vitals ---
        if (data.hp_status || data['hp-string'] || data['health-string']) {
            setPlayerHealthStatus(findStatus(data.hp_status ?? data['hp-string'] ?? data['health-string']));
        }

        if (data.opponent !== undefined) {
            const oppId = data.opponent;
            setOpponentId(oppId);
            const oppName = getCharNameFromId(oppId);
            if (oppName || !oppId) setOpponentName(oppName);
            if (!oppName && !oppId) setOpponentHealthStatus(null);
            
            // --- Store Sync ---
            import('../../events/gmcpBus').then(({ gmcpBus }) => {
                gmcpBus.emit('Char.Opponent', { data: oppId, name: oppName, id: oppId, isSnooped: false });
            });
        }

        const opponentStatus = findStatus(data['opponent-hits'] ?? data['opponent-hp']);
        if (opponentStatus) {
            setOpponentHealthStatus(opponentStatus);
        }

        if (data.weather !== undefined) {
            const weather = normalizeGmcpWeather(data.weather);
            if (weather) setCurrentWeather(weather);
        }


        if (data.fog !== undefined) {
            setIsFoggy(data.fog === 'on' || data.fog === 'thick' || data.fog === 'yes' || !!data.fog);
        }

        // console.log('[GMCP] CharVitals:', data);

        // --- Store Sync ---
        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Char.Vitals', { ...data, isSnooped: false });
        });
    }, [setCurrentTerrain, setCurrentWeather, setIsFoggy, setPlayerHealthStatus, setOpponentId, setOpponentName, setOpponentHealthStatus, setBufferName, setBufferHealthStatus, setPlayerPosition, setMood, sendCommand, findStatus, getCharNameFromId, isSpectateMode, detectLighting, playerPositionRef, setInCombat]);

    const onCharInfo = useCallback((data: GmcpCharInfo) => {
        // console.log('[GMCP] CharInfo:', data);
        setCharacterInfo(prev => {
            const xp = data.xp !== undefined ? Number(data.xp) : prev.xp;
            const xpMax = data.xp_max !== undefined ? Number(data.xp_max) : (data['next-level-xp'] !== undefined ? Number(data['next-level-xp']) : prev.xpMax);
            const tp = data.tp !== undefined ? Number(data.tp) : prev.tp;
            const tpMax = data.tp_max !== undefined ? Number(data.tp_max) : (data['next-level-tp'] !== undefined ? Number(data['next-level-tp']) : prev.tpMax);

            return {
                ...prev,
                name: data.name ?? data.fullname ?? prev.name,
                level: data.level !== undefined ? Number(data.level) : prev.level,
                xp,
                xpMax,
                tp,
                tpMax,
                tnl: Math.max(0, xpMax - xp),
                tpnl: Math.max(0, tpMax - tp),
                race: data.race ?? prev.race,
                subrace: data.subrace ?? prev.subrace,
                subclass: data.subclass ?? prev.subclass,
                class: data.class ?? prev.class,
                description: data.description ?? prev.description,
                whois: data.whois ?? prev.whois
            };
        });

        // --- Store Sync ---
        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Char.Info', { ...data, isSnooped: false });
        });
    }, [setCharacterInfo]);

    const onRoomCharsCombat = useCallback((data: any[]) => {
        if (!Array.isArray(data)) return;

        data.forEach(char => {
            const status = findStatus(char.health || char.condition || char.hp_status || char.status);
            if (!status) return;

            // Prioritize ID match for opponent
            if (opponentId && String(char.id) === String(opponentId)) {
                const name = normalizeCombatantName(char.name || char.short || char.keyword);
                if (name) setOpponentName(name);
                setOpponentHealthStatus(status);
            } else if (opponentName && !opponentId) {
                // Fallback to name match if no ID yet (only if no direct ID match exists)
                const name = normalizeCombatantName(char.name || char.short || char.keyword);
                if (name && (name.toLowerCase() === normalizeCombatantName(opponentName).toLowerCase())) {
                    setOpponentHealthStatus(status);
                }
            }

            // Buffer match
            if (bufferName) {
                 const name = normalizeCombatantName(char.name || char.short || char.keyword);
                 if (name && (name.toLowerCase() === normalizeCombatantName(bufferName).toLowerCase())) {
                    setBufferHealthStatus(status);
                 }
            }
        });

        // --- Store Sync ---
        import('../../events/gmcpBus').then(({ gmcpBus }) => {
            gmcpBus.emit('Room.Chars.Combat', Object.assign(data, { isSnooped: false }));
        });
    }, [findStatus, opponentName, opponentId, bufferName, setOpponentHealthStatus, setBufferHealthStatus]);

    return { onCharVitals, onCharInfo, onRoomCharsCombat };
};
