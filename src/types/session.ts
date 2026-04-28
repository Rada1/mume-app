/**
 * @file session.ts
 * @description Logging and session management.
 */

export type SessionSlot = 'user' | 'spectate';
export type SessionMode = 'live' | 'replay' | 'scrubbing';

export type LogEntryType = 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys' | 'flag';
export type FlagKind = 'death_self' | 'death_enemy_player';

export interface LogEntry {
    t: number;
    typ: LogEntryType;
    d: any;
}

export interface FlagEntry {
    t: number;
    typ: 'flag';
    d: { kind: FlagKind; name?: string };
}

export interface SessionLog {
    version: number;
    startTime: string;
    log: (LogEntry | FlagEntry)[];
    metadata: {
        client: string;
        version: string;
        character?: string;
        type: 'user' | 'spectate';
        spectatedCharacter?: string;
    };
}
