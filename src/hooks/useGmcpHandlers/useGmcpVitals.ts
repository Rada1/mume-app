import { useCallback } from 'react';
import { GmcpCharVitals, GmcpCharInfo, CombatHealthStatus } from '../../types';

interface UseGmcpVitalsProps {
    setCurrentTerrain: (terrain: string) => void;
    setPlayerHealthStatus: (status: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (status: CombatHealthStatus | null) => void;
    setBufferHealthStatus: (status: CombatHealthStatus | null) => void;
    setOpponentId: (id: string | null) => void;
    setOpponentName: (name: string | null) => void;
    setBufferName: (name: string | null) => void;
    setPlayerPosition: (pos: string) => void;
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

    const onCharVitals = useCallback((data: GmcpCharVitals) => {
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
            console.log('[GMCP] Position Update:', data.position);
            // Don't let 'standing' stomp 'riding' because MUME often says 'standing' while mounted.
            const isCurrentlyRiding = playerPositionRef.current === 'riding' || playerPositionRef.current === 'mounted';
            if (data.position === 'standing' && isCurrentlyRiding) {
                console.log('[GMCP] Ignoring position:standing because we are riding');
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
        if (data.hp_status) {
            setPlayerHealthStatus(findStatus(data.hp_status));
        }

        if (data.opponent !== undefined) {
            const oppId = data.opponent;
            setOpponentId(oppId);
            const oppName = getCharNameFromId(oppId);
            setOpponentName(oppName);
            if (!oppName && !oppId) setOpponentHealthStatus(null);
        }

        if (data.weather !== undefined) {
            // MUME sends weather as a string or null
            if (data.weather === null || data.weather === 'clear') setCurrentWeather('clear');
            else if (data.weather.includes('rain')) setCurrentWeather(data.weather.includes('heavy') ? 'heavy-rain' : 'rain');
            else if (data.weather.includes('snow')) setCurrentWeather('snow');
            else if (data.weather.includes('cloud')) setCurrentWeather('cloud');
        }

        if (data.fog !== undefined) {
            setIsFoggy(data.fog === 'on' || data.fog === 'thick' || data.fog === 'yes' || !!data.fog);
        }

        console.log('[GMCP] CharVitals:', data);
    }, [setCurrentTerrain, setCurrentWeather, setIsFoggy, setPlayerHealthStatus, setOpponentId, setOpponentName, setOpponentHealthStatus, setBufferName, setBufferHealthStatus, setPlayerPosition, findStatus, getCharNameFromId, isSpectateMode, detectLighting, playerPositionRef]);

    const onCharInfo = useCallback((data: GmcpCharInfo) => {
        console.log('[GMCP] CharInfo:', data);
        setCharacterInfo(prev => ({
            ...prev,
            name: data.name ?? data.fullname ?? prev.name,
            level: data.level !== undefined ? Number(data.level) : prev.level,
            xp: data.xp !== undefined ? Number(data.xp) : prev.xp,
            xpMax: data.xp_max !== undefined ? Number(data.xp_max) : (data['next-level-xp'] !== undefined ? Number(data['next-level-xp']) : prev.xpMax),
            tp: data.tp !== undefined ? Number(data.tp) : prev.tp,
            tpMax: data.tp_max !== undefined ? Number(data.tp_max) : (data['next-level-tp'] !== undefined ? Number(data['next-level-tp']) : prev.tpMax),
            race: data.race ?? prev.race,
            subrace: data.subrace ?? prev.subrace,
            subclass: data.subclass ?? prev.subclass,
            class: data.class ?? prev.class,
            description: data.description ?? prev.description,
            whois: data.whois ?? prev.whois
        }));
    }, [setCharacterInfo]);

    const onRoomCharsCombat = useCallback((data: any[]) => {
        if (!Array.isArray(data)) return;

        data.forEach(char => {
            const status = findStatus(char.health || char.condition || char.hp_status || char.status);
            if (!status) return;

            // Prioritize ID match for opponent
            if (opponentId && char.id === opponentId) {
                setOpponentHealthStatus(status);
            } else if (opponentName && !opponentId) {
                // Fallback to name match if no ID yet (only if no direct ID match exists)
                const name = char.name || char.short || char.keyword;
                if (name && (name.toLowerCase() === opponentName.toLowerCase())) {
                    setOpponentHealthStatus(status);
                }
            }

            // Buffer match
            if (bufferName) {
                 const name = char.name || char.short || char.keyword;
                 if (name && (name.toLowerCase() === bufferName.toLowerCase())) {
                    setBufferHealthStatus(status);
                 }
            }
        });
    }, [findStatus, opponentName, opponentId, bufferName, setOpponentHealthStatus, setBufferHealthStatus]);

    return { onCharVitals, onCharInfo, onRoomCharsCombat };
};
