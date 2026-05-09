import { useReplayBufferStore } from '../../stores/replay/useReplayBufferStore';
import { useReplayVitalsStore } from '../../stores/replay/useReplayVitalsStore';
import { useReplayRoomStore } from '../../stores/replay/useReplayRoomStore';
import { useReplayCombatStore } from '../../stores/replay/useReplayCombatStore';
import { gmcpBus } from '../../events/gmcpBus';
import { initialVitalsState } from '../../stores/slices/vitalsSlice';

/**
 * @file ReplayEngine.ts
 * @description Headless logic for driving the replay/theater mode by emitting 
 * events and updating stores based on the event buffer.
 */

export class ReplayEngine {
    private timer: ReturnType<typeof setInterval> | null = null;
    private playbackSpeed: number = 1.0;

    constructor() {
        console.log('[ReplayEngine] Initialized');
    }

    /**
     * Seeks to a specific timestamp in the replay buffer.
     * Synchronously updates the state to the nearest prior keyframe and then 
     * rapidly replays subsequent events to reach the target time.
     */
    public seek(timestamp: number) {
        const store = useReplayBufferStore.getState();
        const keyframes = store.keyframes;
        
        // Find best keyframe (prior to or at target timestamp)
        const bestKeyframe = [...keyframes]
            .sort((a, b) => b.timestamp - a.timestamp)
            .find(k => k.timestamp <= timestamp);

        if (bestKeyframe) {
            useReplayVitalsStore.getState().loadSnapshot(bestKeyframe.snapshot.vitals);
            useReplayRoomStore.getState().loadSnapshot(bestKeyframe.snapshot.room);
            useReplayCombatStore.getState().loadSnapshot(bestKeyframe.snapshot.combat);
        } else {
            // No keyframe? Start from scratch
        }

        store.setCurrentTime(timestamp);
    }

    /**
     * Advances the playback by a specified time delta.
     */
    public step(deltaTime: number) {
        const store = useReplayBufferStore.getState();
        const nextTime = store.currentTime + deltaTime;
        
        // Find events between current and nextTime
        const events = store.events.filter(e => e.timestamp > store.currentTime && e.timestamp <= nextTime);

        events.forEach(event => this.executeEvent(event));

        store.setCurrentTime(nextTime);
    }

    /**
     * Dispatches a single event to the appropriate handler/store.
     */
    private executeEvent(event: any) {
        switch (event.type) {
            case 'gmcp': {
                const { namespace, payload } = event;
                const data = payload;

                if (namespace === 'Char.Vitals') {
                    useReplayVitalsStore.getState().applyCharVitals(data);
                } else if (namespace === 'Room.Info') {
                    useReplayRoomStore.getState().setRoomInfo(data);
                } else if (namespace === 'Session.Reset') {
                    console.log('[ReplayEngine] Resetting stores due to Session.Reset');
                    useReplayVitalsStore.getState().setVitals(initialVitalsState);
                    // useReplayRoomStore.getState().setRoom(initialRoomState);
                    // useReplayCombatStore.getState().setCombat(initialCombatState);
                } else if (namespace === 'Char.Target') {
                    useReplayVitalsStore.getState().setTarget(data);
                } else if (namespace === 'Room.Players') {
                    useReplayRoomStore.getState().loadSnapshot({ players: data } as any);
                } else if (namespace === 'Room.Npcs') {
                    useReplayRoomStore.getState().loadSnapshot({ npcs: data } as any);
                } else if (namespace === 'Group.Members') {
                    if (Array.isArray(data)) {
                        useReplayCombatStore.getState().loadSnapshot({ groupMembers: data } as any);
                    }
                }
                break;
            }
            case 'text':
                // Re-emit text events for the UI to capture
                gmcpBus.emit('Game.Text', { ...event.payload, isReplay: true } as any);
                break;
        }
    }
}
