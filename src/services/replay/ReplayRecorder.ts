/**
 * @file ReplayRecorder.ts
 * @description Listens to gmcpBus and populates the ReplayBufferStore with events and keyframes.
 */

import { gmcpBus, GmcpEventMap } from '../../events/gmcpBus';
import { useReplayBufferStore } from '../../stores/replay/useReplayBufferStore';
import { ReplayEvent, ReplayEventType, Keyframe } from '../../types/replay';
import { useVitalsStore } from '../../stores/useVitalsStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useCombatStore } from '../../stores/useCombatStore';

const KEYFRAME_INTERVAL_MS = 5000;

const RECORD_EVENTS: (keyof GmcpEventMap)[] = [
    'Char.Vitals', 'Char.Info', 'Char.Name', 'Char.Position', 'Char.Ride',
    'Room.Info', 'Room.UpdateExits', 'Room.Chars',  'Room.Items',
    'Room.AddChar', 'Room.RemoveChar', 'Room.UpdateChar',
    'Room.CharsCombat', 'Char.Opponent', 'Char.Buffer',
    'Group.Add', 'Group.Update', 'Group.Remove', 'Group.Set',
    'Comm.Channel', 'Mume.Edit', 'Core.Ping', 'Core.Goodbye',
    'Connection.Disconnect', 'Session.Reset', 'Session.Start'
];

export class ReplayRecorder {
    private isRecording: boolean = false;
    private lastKeyframeTime: number = 0;
    private unsubscribeFunctions: (() => void)[] = [];

    public start() {
        this.isRecording = true;
        this.lastKeyframeTime = 0;
        console.log('[ReplayRecorder] Starting recording...');

        RECORD_EVENTS.forEach(event => {
            const unsub = gmcpBus.on(event, (data: any) => {
                if (!this.isRecording) return;
                if (event === 'Session.Reset') {
                    console.log('[ReplayRecorder] Session.Reset received. Clearing buffers.');
                    useReplayBufferStore.getState().clear();
                }
                this.recordEvent('gmcp', data, event);
                this.checkKeyframe();
            });
            this.unsubscribeFunctions.push(unsub);
        });

        const unsubText = gmcpBus.on('Game.Text', (data) => {
            if (!this.isRecording) return;
            this.recordEvent('text', data);
        });
        this.unsubscribeFunctions.push(unsubText);
    }

    public stop() {
        this.isRecording = false;
        console.log('[ReplayRecorder] Stopping recording.');
        this.unsubscribeFunctions.forEach(unsub => unsub());
        this.unsubscribeFunctions = [];
    }

    private recordEvent(type: ReplayEventType, payload: any, namespace?: string) {
        const timestamp = Date.now();
        const event: ReplayEvent = {
            timestamp,
            type,
            namespace,
            payload
        };
        useReplayBufferStore.getState().addEvent(event);
    }

    private checkKeyframe() {
        const now = Date.now();
        if (now - this.lastKeyframeTime >= KEYFRAME_INTERVAL_MS) {
            this.captureKeyframe();
            this.lastKeyframeTime = now;
        }
    }

    private captureKeyframe() {
        const timestamp = Date.now();
        const vitals = useVitalsStore.getState();
        const room = useRoomStore.getState();
        const combat = useCombatStore.getState();

        const keyframe: Keyframe = {
            timestamp,
            index: useReplayBufferStore.getState().events.length,
            snapshot: {
                vitals: {
                    hp: vitals.hp,
                    maxHp: vitals.maxHp,
                    mana: vitals.mana,
                    maxMana: vitals.maxMana,
                    move: vitals.move,
                    maxMove: vitals.maxMove,
                    hpStatus: vitals.hpStatus,
                    inCombat: vitals.inCombat,
                    target: vitals.target,
                },
                room: {
                    roomName: room.roomName,
                    roomDesc: room.roomDesc,
                    exits: room.exits,
                    chars: room.chars,

                    items: room.items,
                },
                combat: {
                    opponentName: combat.opponentName,
                    opponentHealthStatus: combat.opponentHealthStatus,
                    groupMembers: combat.groupMembers,
                }
            }
        };

        useReplayBufferStore.getState().addKeyframe(keyframe);
        console.log(`[ReplayRecorder] Captured keyframe at ${new Date(timestamp).toLocaleTimeString()}`);
    }
}
