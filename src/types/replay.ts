/**
 * @file replay.ts
 * @description Type definitions for the DVR-Replay system.
 */

export type ReplayEventType = 'gmcp' | 'text' | 'ui' | 'sys';

export interface ReplayEvent {
    id?: string;
    timestamp: number;
    type: ReplayEventType;
    namespace?: string;
    payload?: any;
    data?: any;
}

export interface Keyframe {
    timestamp: number;
    index?: number;
    snapshot: {
        vitals: any;
        room: any;
        combat: any;
    };
}
