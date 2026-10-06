import { useEffect, useRef, useCallback } from 'react';
import { useSpectateVitalsStore } from '../stores/spectate/useSpectateVitalsStore';
import { useSpectateRoomStore } from '../stores/spectate/useSpectateRoomStore';
import { useSpectateCombatStore } from '../stores/spectate/useSpectateCombatStore';
import { useSpectateLiveVitalsStore } from '../stores/spectate/useSpectateLiveVitalsStore';
import { useSpectateLiveRoomStore } from '../stores/spectate/useSpectateLiveRoomStore';
import { useSpectateLiveCombatStore } from '../stores/spectate/useSpectateLiveCombatStore';
import { useSpectateEffectTimerStore, useSpectateLiveEffectTimerStore } from '../stores/spectate/useSpectateEffectTimerStore';
import type { CombatHealthStatus, GmcpOccupant, GroupMember, LightingType, WeatherType } from '../types';
import type { EffectTimer } from '../types';
import type { CharacterInfo } from '../stores/slices/vitalsSlice';

type AudioModifier = { pitch?: number; volume?: number } | string;

interface VitalsSnapshot {
    hp: number; maxHp: number;
    mana: number; maxMana: number;
    move: number; maxMove: number;
    gmcpVitals: {
        hp: number;
        maxHp: number;
        mana: number;
        maxMana: number;
        move: number;
        maxMove: number;
        hpStatus: CombatHealthStatus | null;
        manaStatus: string | null;
        moveStatus: string | null;
    };
    ob?: number; db?: number; pb?: number; armour?: number;
    hpStatus: CombatHealthStatus | null; manaStatus: string | null; moveStatus: string | null;
    inCombat: boolean;
    position: string;
    isRiding: boolean;
    mood: string | null;
    spellEffort: string | null;
    alertness: string | null;
    lighting: LightingType; weather: WeatherType; isFoggy: boolean;
    currentTerrain: string;
    activePrompt: unknown;
    wimpy: number;
    characterInfo: CharacterInfo;
}

interface RoomSnapshot {
    roomName: string; roomDesc: string; roomZone: string;
    terrain: string; roomNum: number;
    exits: string[]; rawExits: Record<string, unknown>;
    chars: Record<number, GmcpOccupant>; items: GmcpOccupant[];
}

interface StateSnapshot {
    timestamp: number;
    vitals: VitalsSnapshot;
    room: RoomSnapshot;
    timers: EffectTimer[];
    combat: {
        opponentId: number | null;
        opponentName: string | null;
        opponentHealthStatus: CombatHealthStatus | null;
        bufferName: string | null;
        bufferHealthStatus: CombatHealthStatus | null;
        groupMembers: GroupMember[];
    };
}

interface AudioEvent {
    timestamp: number;
    type: 'hit' | 'oof' | 'click';
    modifier?: AudioModifier;
}

export function useSpectateBufferSync({
    isSpectating,
    spectateTarget,
    displayCutoff,
    isLive,
    isPlaying,
    playHitImpactSound,
    playOofSound,
    playClickSound,
}: {
    isSpectating: boolean;
    spectateTarget: string | null;
    displayCutoff: number;
    isLive: boolean;
    isPlaying: boolean;
    playHitImpactSound: (modifier?: AudioModifier) => void;
    playOofSound: () => void;
    playClickSound: () => void;
}) {
    const stateTimelineRef = useRef<StateSnapshot[]>([]);
    const audioEventsRef = useRef<AudioEvent[]>([]);
    const lastCutoffRef = useRef<number>(Infinity);
    const isRestoringRef = useRef(false);
    const previousTargetRef = useRef(spectateTarget);
    const isLiveRef = useRef(isLive);
    const playHitImpactSoundRef = useRef(playHitImpactSound);
    const playOofSoundRef = useRef(playOofSound);
    const playClickSoundRef = useRef(playClickSound);

    useEffect(() => {
        isLiveRef.current = isLive;
    }, [isLive]);

    useEffect(() => {
        playHitImpactSoundRef.current = playHitImpactSound;
        playOofSoundRef.current = playOofSound;
        playClickSoundRef.current = playClickSound;
    }, [playHitImpactSound, playOofSound, playClickSound]);

    const snapshotVitals = useCallback((): VitalsSnapshot => {
        const v = useSpectateLiveVitalsStore.getState();
        return {
            hp: v.hp, maxHp: v.maxHp,
            mana: v.mana, maxMana: v.maxMana,
            move: v.move, maxMove: v.maxMove,
            gmcpVitals: { ...v.gmcpVitals },
            ob: v.ob, db: v.db,
            pb: v.pb, armour: v.armour,
            hpStatus: v.hpStatus,
            manaStatus: v.manaStatus,
            moveStatus: v.moveStatus,
            inCombat: v.inCombat,
            position: v.position,
            isRiding: v.isRiding,
            mood: v.mood,
            spellEffort: v.spellEffort,
            alertness: v.alertness,
            lighting: v.lighting,
            weather: v.weather,
            isFoggy: v.isFoggy,
            currentTerrain: v.currentTerrain,
            activePrompt: v.activePrompt,
            wimpy: v.wimpy ?? 0,
            characterInfo: { ...v.characterInfo },
        };
    }, []);

    const snapshotRoom = useCallback((): RoomSnapshot => {
        const r = useSpectateLiveRoomStore.getState();
        return {
            roomName: r.roomName,
            roomDesc: r.roomDesc,
            roomZone: r.roomZone,
            terrain: r.terrain,
            roomNum: r.roomNum,
            exits: [...(r.exits || [])],
            rawExits: { ...(r.rawExits || {}) },
            chars: { ...(r.chars || {}) },
            items: [...(r.items || [])],
        };
    }, []);

    const snapshotCombat = useCallback(() => {
        const c = useSpectateLiveCombatStore.getState();
        return {
            opponentId: c.opponentId,
            opponentName: c.opponentName,
            opponentHealthStatus: c.opponentHealthStatus,
            bufferName: c.bufferName,
            bufferHealthStatus: c.bufferHealthStatus,
            groupMembers: [...(c.groupMembers || [])],
        };
    }, []);

    const snapshotTimers = useCallback(() => [...useSpectateLiveEffectTimerStore.getState().timers], []);

    const applyDisplaySnapshot = useCallback((snap: Pick<StateSnapshot, 'vitals' | 'room' | 'combat' | 'timers'>) => {
        isRestoringRef.current = true;
        useSpectateVitalsStore.setState(snap.vitals);
        useSpectateRoomStore.setState(snap.room);
        useSpectateCombatStore.setState(snap.combat);
        useSpectateEffectTimerStore.getState().setTimers(snap.timers);
        isRestoringRef.current = false;
    }, []);

    useEffect(() => {
        if (!isSpectating) {
            stateTimelineRef.current = [];
            audioEventsRef.current = [];
            lastCutoffRef.current = Infinity;
            useSpectateLiveEffectTimerStore.getState().clearAll();
            useSpectateEffectTimerStore.getState().clearAll();
        }
    }, [isSpectating]);

    useEffect(() => {
        if (!isSpectating || !isLive) return;
        const interval = window.setInterval(() => {
            useSpectateLiveEffectTimerStore.getState().clearExpired();
        }, 1000);
        return () => window.clearInterval(interval);
    }, [isSpectating, isLive]);

    useEffect(() => {
        if (previousTargetRef.current === spectateTarget) return;
        previousTargetRef.current = spectateTarget;
        stateTimelineRef.current = [];
        audioEventsRef.current = [];
        lastCutoffRef.current = Infinity;
        useSpectateLiveEffectTimerStore.getState().clearAll();
        useSpectateEffectTimerStore.getState().clearAll();
    }, [spectateTarget]);

    // Subscribe to live ingest stores. Live mode mirrors live into display;
    // buffered mode records only, so real-time data cannot pull the UI forward.
    useEffect(() => {
        if (!isSpectating) return;

        const record = () => {
            if (isRestoringRef.current) return;
            const next = {
                timestamp: Date.now(),
                vitals: snapshotVitals(),
                room: snapshotRoom(),
                timers: snapshotTimers(),
                combat: snapshotCombat(),
            };
            stateTimelineRef.current.push(next);
            if (isLiveRef.current) applyDisplaySnapshot(next);
        };

        const unsubV = useSpectateLiveVitalsStore.subscribe(record);
        const unsubR = useSpectateLiveRoomStore.subscribe(record);
        const unsubC = useSpectateLiveCombatStore.subscribe(record);
        const unsubT = useSpectateLiveEffectTimerStore.subscribe(record);
        record();
        return () => { unsubV(); unsubR(); unsubC(); unsubT(); };
    }, [isSpectating, applyDisplaySnapshot, snapshotCombat, snapshotRoom, snapshotTimers, snapshotVitals]);

    useEffect(() => {
        if (!isSpectating || !isLive) return;
        applyDisplaySnapshot({
            vitals: snapshotVitals(),
            room: snapshotRoom(),
            timers: snapshotTimers(),
            combat: snapshotCombat(),
        });
    }, [isSpectating, isLive, applyDisplaySnapshot, snapshotCombat, snapshotRoom, snapshotTimers, snapshotVitals]);

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
            applyDisplaySnapshot(best);
        }

        // Replay audio events newly visible in this tick (only during forward play)
        if (isPlaying && prevCutoff < displayCutoff && prevCutoff !== Infinity) {
            const toPlay = audioEventsRef.current.filter(
                e => e.timestamp > prevCutoff && e.timestamp <= displayCutoff
            );
            toPlay.slice(0, 3).forEach(evt => {
                if (evt.type === 'hit') playHitImpactSoundRef.current(evt.modifier);
                else if (evt.type === 'oof') playOofSoundRef.current();
                else if (evt.type === 'click') playClickSoundRef.current();
            });
        }
    }, [displayCutoff, isLive, isPlaying, applyDisplaySnapshot]);

    const recordHit = useCallback((modifier?: AudioModifier) => {
        audioEventsRef.current.push({ timestamp: Date.now(), type: 'hit', modifier });
    }, []);

    const recordOof = useCallback(() => {
        audioEventsRef.current.push({ timestamp: Date.now(), type: 'oof' });
    }, []);

    const recordClick = useCallback(() => {
        audioEventsRef.current.push({ timestamp: Date.now(), type: 'click' });
    }, []);

    return { recordHit, recordOof, recordClick };
}
