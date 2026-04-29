import { useEffect, useRef, useCallback } from 'react';
import { useSpectateVitalsStore } from '../stores/spectate/useSpectateVitalsStore';
import { useSpectateRoomStore } from '../stores/spectate/useSpectateRoomStore';

interface VitalsSnapshot {
    hp: number; maxHp: number;
    mana: number; maxMana: number;
    move: number; maxMove: number;
    ob?: number; db?: number; pb?: number; armour?: number;
    hpStatus: any; manaStatus: any; moveStatus: any;
    inCombat: boolean;
    lighting: string; weather: string; isFoggy: boolean;
    currentTerrain: string;
    activePrompt: any;
    wimpy: number;
}

interface RoomSnapshot {
    roomName: string; roomZone: string;
    terrain: string; roomNum: number;
}

interface StateSnapshot {
    timestamp: number;
    vitals: VitalsSnapshot;
    room: RoomSnapshot;
}

interface AudioEvent {
    timestamp: number;
    type: 'hit' | 'oof';
    modifier?: any;
}

export function useSpectateBufferSync({
    isSpectating,
    displayCutoff,
    isLive,
    isPlaying,
    playHitImpactSound,
    playOofSound,
}: {
    isSpectating: boolean;
    displayCutoff: number;
    isLive: boolean;
    isPlaying: boolean;
    playHitImpactSound: (modifier?: any) => void;
    playOofSound: () => void;
}) {
    const stateTimelineRef = useRef<StateSnapshot[]>([]);
    const audioEventsRef = useRef<AudioEvent[]>([]);
    const lastCutoffRef = useRef<number>(Infinity);
    const isRestoringRef = useRef(false);

    useEffect(() => {
        if (!isSpectating) {
            stateTimelineRef.current = [];
            audioEventsRef.current = [];
            lastCutoffRef.current = Infinity;
        }
    }, [isSpectating]);

    // Subscribe to Zustand stores to record timestamped snapshots
    useEffect(() => {
        if (!isSpectating) return;

        const record = () => {
            if (isRestoringRef.current) return;
            const v = useSpectateVitalsStore.getState();
            const r = useSpectateRoomStore.getState();
            stateTimelineRef.current.push({
                timestamp: Date.now(),
                vitals: {
                    hp: v.hp, maxHp: v.maxHp,
                    mana: v.mana, maxMana: v.maxMana,
                    move: (v as any).move, maxMove: (v as any).maxMove,
                    ob: (v as any).ob, db: (v as any).db,
                    pb: (v as any).pb, armour: (v as any).armour,
                    hpStatus: (v as any).hpStatus, manaStatus: (v as any).manaStatus, moveStatus: (v as any).moveStatus,
                    inCombat: (v as any).inCombat,
                    lighting: (v as any).lighting, weather: (v as any).weather, isFoggy: (v as any).isFoggy,
                    currentTerrain: (v as any).currentTerrain,
                    activePrompt: (v as any).activePrompt,
                    wimpy: (v as any).wimpy ?? 0,
                },
                room: {
                    roomName: r.roomName, roomZone: r.roomZone,
                    terrain: r.terrain, roomNum: r.roomNum,
                },
            });
        };

        const unsubV = useSpectateVitalsStore.subscribe(record);
        const unsubR = useSpectateRoomStore.subscribe(record);
        return () => { unsubV(); unsubR(); };
    }, [isSpectating]);

    // Restore state when displayCutoff changes; replay audio during playback
    useEffect(() => {
        if (isLive) {
            lastCutoffRef.current = Infinity;
            return;
        }

        const prevCutoff = lastCutoffRef.current;
        lastCutoffRef.current = displayCutoff;

        const snapshots = stateTimelineRef.current;
        let best: StateSnapshot | null = null;
        for (const snap of snapshots) {
            if (snap.timestamp <= displayCutoff) best = snap;
        }

        if (best) {
            isRestoringRef.current = true;
            useSpectateVitalsStore.setState(best.vitals as any);
            useSpectateRoomStore.setState({
                roomName: best.room.roomName,
                roomZone: best.room.roomZone,
                terrain: best.room.terrain,
                roomNum: best.room.roomNum,
            } as any);
            isRestoringRef.current = false;
        }

        // Replay audio events newly visible in this tick (only during forward play)
        if (isPlaying && prevCutoff < displayCutoff && prevCutoff !== Infinity) {
            const toPlay = audioEventsRef.current.filter(
                e => e.timestamp > prevCutoff && e.timestamp <= displayCutoff
            );
            toPlay.slice(0, 3).forEach(evt => {
                if (evt.type === 'hit') playHitImpactSound(evt.modifier);
                else playOofSound();
            });
        }
    }, [displayCutoff, isLive, isPlaying, playHitImpactSound, playOofSound]);

    const recordHit = useCallback((modifier?: any) => {
        audioEventsRef.current.push({ timestamp: Date.now(), type: 'hit', modifier });
    }, []);

    const recordOof = useCallback(() => {
        audioEventsRef.current.push({ timestamp: Date.now(), type: 'oof' });
    }, []);

    return { recordHit, recordOof };
}
