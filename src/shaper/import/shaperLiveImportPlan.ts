/**
 * @file shaperLiveImportPlan.ts
 * @description Builds phased MUME command plans for reading live zones into Shaper.
 */

export type ShaperLiveReadPhase = 'zone-discovery' | 'zone-info' | 'room-scan';
export type ShaperLiveReadScope = 'zone' | 'zone-info' | 'room';

export interface ShaperLiveReadCommand {
    id: string;
    phase: ShaperLiveReadPhase;
    scope: ShaperLiveReadScope;
    command: string;
    target?: string;
}

export interface ShaperLiveReadPlanOptions {
    zoneNumber: number;
    roomNumbers?: string[];
    zoneInfoKeywords?: string[];
    includeGridRooms?: boolean;
}

export interface ShaperLiveReadPlan {
    zoneNumber: number;
    commands: ShaperLiveReadCommand[];
}

// --- Room Section ---
const gridRoomNumbers = (zoneNumber: number): string[] =>
    Array.from({ length: 100 }, (_, index) => {
        const y = Math.floor(index / 10);
        const x = index % 10;
        return `${zoneNumber}:${x}${y}`;
    });

const unique = (values: string[]): string[] =>
    Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

const commandId = (phase: ShaperLiveReadPhase, target: string, index: number): string =>
    `${phase}:${target}:${index}`;

// --- Builder Section ---
export const buildShaperZoneDiscoveryCommands = (zoneNumber: number): ShaperLiveReadCommand[] => [
    { id: 'zone-discovery:stat-zone:0', phase: 'zone-discovery', scope: 'zone', target: String(zoneNumber), command: `/stat zone ${zoneNumber}` },
    { id: 'zone-discovery:zone-list:1', phase: 'zone-discovery', scope: 'zone', target: String(zoneNumber), command: `/zone ${zoneNumber} list` },
    { id: 'zone-discovery:info-zone-list:2', phase: 'zone-discovery', scope: 'zone-info', target: String(zoneNumber), command: `/info zone ${zoneNumber} list` }
];

export const buildShaperZoneInfoReadCommands = (
    zoneNumber: number,
    keywords: string[]
): ShaperLiveReadCommand[] =>
    unique(keywords).map((keyword, index) => ({
        id: commandId('zone-info', keyword, index),
        phase: 'zone-info',
        scope: 'zone-info',
        target: keyword,
        command: `/info zone ${zoneNumber} ${keyword} read`
    }));

export const buildShaperRoomReadCommands = (roomNumber: string): ShaperLiveReadCommand[] => [
    { id: commandId('room-scan', roomNumber, 0), phase: 'room-scan', scope: 'room', target: roomNumber, command: `/at ${roomNumber} /stat room full` },
    { id: commandId('room-scan', roomNumber, 1), phase: 'room-scan', scope: 'room', target: roomNumber, command: `/at ${roomNumber} /com list -commands` },
    { id: commandId('room-scan', roomNumber, 2), phase: 'room-scan', scope: 'room', target: roomNumber, command: `/lib room ${roomNumber} list` }
];

export const buildShaperLiveReadPlan = ({
    zoneNumber,
    roomNumbers = [],
    zoneInfoKeywords = [],
    includeGridRooms = false
}: ShaperLiveReadPlanOptions): ShaperLiveReadPlan => {
    const rooms = unique([
        ...(includeGridRooms ? gridRoomNumbers(zoneNumber) : []),
        ...roomNumbers
    ]);
    return {
        zoneNumber,
        commands: [
            ...buildShaperZoneDiscoveryCommands(zoneNumber),
            ...buildShaperZoneInfoReadCommands(zoneNumber, zoneInfoKeywords),
            ...rooms.flatMap(buildShaperRoomReadCommands)
        ]
    };
};
