/**
 * @file session.ts
 * @description Logging and session management.
 */

export type SessionSlot = 'user' | 'spectate';
export type SessionMode = 'live' | 'replay' | 'scrubbing';

export type LogEntryType = 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys';

export interface LogEntry {
    t: number; 
    typ: LogEntryType;
    d: any; 
}

export interface SessionLog {
    version: number;
    startTime: string;
    log: LogEntry[];
    metadata: {
        client: string;
        version: string;
        character?: string;
    };
}
