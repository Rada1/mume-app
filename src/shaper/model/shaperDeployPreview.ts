/**
 * @file shaperDeployPreview.ts
 * @description Builds preview-only in-game command scripts for Shaper room deployment.
 */

import { listShaperComTree } from './shaperComCommands';
import { hasShaperExitClimb, hasShaperExitDoor } from './shaperExitFlags';
import { buildShaperLibraryCommands } from './shaperLibraries';
import type { ShaperCommandNode, ShaperExitDraft, ShaperLibraryInstall, ShaperRoomDraft, ShaperRoomId } from './shaperTypes';

export interface ShaperDeployPreview {
    commands: string[];
    warnings: string[];
}

// --- Command Section ---
const wrapAt = (roomNumber: string, command: string): string => `/at ${roomNumber} ${command}`;
const editorBlock = (roomNumber: string, command: string, text: string): string[] => {
    const body = text.trim();
    if (!body) return [];
    return [
        wrapAt(roomNumber, command),
        ...body.split(/\r?\n/).map(line => `  ${line}`),
        '  [save editor]'
    ];
};

const buildRoomCommands = (room: ShaperRoomDraft): string[] => {
    const commands: string[] = [];
    const name = room.name.trim();
    if (name) {
        const preposition = room.preposition.trim() || 'in';
        commands.push(wrapAt(room.roomNumber, `/room name ${preposition}@${name}`));
    }
    if (room.sector) {
        commands.push(wrapAt(room.roomNumber, `/room sector ${room.sector}`));
    }
    if (room.flags.length > 0) {
        commands.push(wrapAt(room.roomNumber, `/room flag @${room.flags.join(' ')}`));
    }
    commands.push(...editorBlock(room.roomNumber, '/room desc', room.description));
    room.keywords.forEach(keyword => {
        const keys = keyword.keywords.map(item => item.trim()).filter(Boolean);
        if (keys.length === 0) return;
        commands.push(wrapAt(room.roomNumber, `/room kadd ${keys.join(' ')}`));
        commands.push(...editorBlock(room.roomNumber, `/room kdescription ${keys[0]}`, keyword.description));
    });
    const owner = room.owner.trim();
    if (owner && owner.toLowerCase() !== 'none') {
        commands.push(wrapAt(room.roomNumber, `/room owner ${owner}`));
    }
    return commands;
};

const buildComCommands = (
    room: ShaperRoomDraft,
    commandNodes: Record<string, ShaperCommandNode>
): string[] => {
    const nodes = listShaperComTree(commandNodes, room.id);
    if (nodes.length === 0) return [];
    return [
        wrapAt(room.roomNumber, '/com kill all'),
        ...nodes.map(node => wrapAt(room.roomNumber, node.command))
    ];
};

const doorKeyArg = (exit: ShaperExitDraft): string => {
    if (exit.keyMode === 'latch') return ' latch';
    if (exit.keyMode === 'no_keyhole') return ' no_keyhole';
    if (exit.keyMode === 'none') return ' none';
    if (exit.keyVnum?.trim()) return ` ${exit.keyVnum.trim()}`;
    return '';
};

const buildExitCommands = (
    room: ShaperRoomDraft,
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>
): string[] => {
    const commands: string[] = [];
    const outgoing = Object.values(exits)
        .filter(exit => exit.fromRoomId === room.id && exit.toRoomId)
        .sort((a, b) => a.direction.localeCompare(b.direction));

    outgoing.forEach(exit => {
        const target = exit.toRoomId ? rooms[exit.toRoomId] : null;
        if (!target) return;
        const dir = exit.direction;
        commands.push(wrapAt(room.roomNumber, `/room exit ${dir} ${target.roomNumber}`));

        if (exit.doorFlags && exit.doorFlags.length > 0) {
            commands.push(wrapAt(room.roomNumber, `/room dset ${dir} @${exit.doorFlags.join(' ')}`));
        }
        if (hasShaperExitDoor(exit) && exit.doorName?.trim()) {
            commands.push(wrapAt(room.roomNumber, `/room dadd ${dir} ${exit.doorName.trim()}${doorKeyArg(exit)}`));
        }
        if (exit.doorWeight !== undefined) {
            commands.push(wrapAt(room.roomNumber, `/room dweight ${dir} ${exit.doorWeight}`));
        }
        if (hasShaperExitClimb(exit)) {
            commands.push(wrapAt(room.roomNumber, `/room cliset ${dir} ${exit.climbDifficulty ?? 0} ${exit.climbDamage ?? 0}`));
        }
        commands.push(...editorBlock(room.roomNumber, `/room edescription ${dir}`, exit.exitDescription || ''));
    });
    return commands;
};

const buildRoomLibraryCommands = (
    room: ShaperRoomDraft,
    commandNodes: Record<string, ShaperCommandNode>,
    libraries: Record<string, ShaperLibraryInstall>
): string[] => {
    const roomNodeIds = new Set(Object.values(commandNodes)
        .filter(node => node.roomId === room.id)
        .map(node => node.id));
    const installs = Object.values(libraries)
        .filter(install => install.targetId === room.id || roomNodeIds.has(install.targetId))
        .sort((a, b) => {
            const aNode = commandNodes[a.targetId]?.order ?? -1;
            const bNode = commandNodes[b.targetId]?.order ?? -1;
            return aNode - bNode || a.name.localeCompare(b.name);
        });
    return buildShaperLibraryCommands(installs, 'room', room.roomNumber);
};

const buildSaveCommands = (room: ShaperRoomDraft, commandCount: number): string[] =>
    commandCount > 0 ? [wrapAt(room.roomNumber, '/room save')] : [];

// --- Preview Section ---
export const buildSelectedRoomDeployPreview = (
    room: ShaperRoomDraft,
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    commandNodes: Record<string, ShaperCommandNode>,
    libraries: Record<string, ShaperLibraryInstall> = {}
): ShaperDeployPreview => {
    const draftCommands = [
        ...buildRoomCommands(room),
        ...buildExitCommands(room, rooms, exits),
        ...buildComCommands(room, commandNodes),
        ...buildRoomLibraryCommands(room, commandNodes, libraries)
    ];
    const commands = [
        ...draftCommands,
        ...buildSaveCommands(room, draftCommands.length)
    ];
    const warnings: string[] = [];
    const roomComCount = Object.values(commandNodes).filter(node => node.roomId === room.id).length;
    const outgoing = Object.values(exits).filter(exit => exit.fromRoomId === room.id);

    if (roomComCount > 0) {
        warnings.push('/com kill all clears this room reset tree before replaying the previewed /com commands.');
    }
    if (room.description.trim() || room.keywords.some(keyword => keyword.description.trim())) {
        warnings.push('Description and keyword description previews require an editor-save deployment step.');
    }
    outgoing.forEach(exit => {
        if (hasShaperExitDoor(exit) && !exit.doorName?.trim()) {
            warnings.push(`Exit ${exit.direction.toUpperCase()} is marked as a door but has no door keywords.`);
        }
        if (exit.exitDescription?.trim()) {
            warnings.push(`Exit ${exit.direction.toUpperCase()} description preview requires an editor-save deployment step.`);
        }
        if (exit.exitType?.trim()) {
            warnings.push(`Exit ${exit.direction.toUpperCase()} type note is not a direct /room command yet.`);
        }
        if (exit.climbDirection) {
            warnings.push(`Exit ${exit.direction.toUpperCase()} climb direction is noted for review; /room cliset uses the exit direction.`);
        }
    });
    const roomNodeIds = new Set(Object.values(commandNodes)
        .filter(node => node.roomId === room.id)
        .map(node => node.id));
    const deployLibraries = Object.values(libraries)
        .filter(install => install.targetId === room.id || roomNodeIds.has(install.targetId));
    if (deployLibraries.some(install => install.requiresSupervisorReview)) {
        warnings.push('One or more room libraries require supervisor review before deploy.');
    }
    if (deployLibraries.length > 0) {
        warnings.push('Library /lib set positions are previewed in install order; confirm against /lib room ... list.');
    }
    if (commands.length === 0) {
        warnings.push('Select or edit a room with deployable fields to generate commands.');
    }

    return { commands, warnings };
};

// Shared multi-room folding: each room's command script, in room-number order,
// folded into one paced run. Rooms with nothing deployable are skipped. Per-room
// warnings are aggregated and de-duplicated. `emptyWarning` is surfaced when no
// room in the set has deployable fields.
const buildRoomSetDeployPreview = (
    targetRooms: ShaperRoomDraft[],
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    commandNodes: Record<string, ShaperCommandNode>,
    libraries: Record<string, ShaperLibraryInstall>,
    emptyWarning: string
): ShaperDeployPreview => {
    const orderedRooms = [...targetRooms]
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
    const commands: string[] = [];
    const warnings = new Set<string>();
    let deployableRooms = 0;

    orderedRooms.forEach(room => {
        const preview = buildSelectedRoomDeployPreview(room, rooms, exits, commandNodes, libraries);
        if (preview.commands.length === 0) return;
        deployableRooms += 1;
        commands.push(...preview.commands);
        preview.warnings
            .filter(warning => warning !== 'Select or edit a room with deployable fields to generate commands.')
            .forEach(warning => warnings.add(warning));
    });

    if (deployableRooms === 0) {
        warnings.add(emptyWarning);
    }

    return { commands, warnings: [...warnings] };
};

// Multi-select deploy: the command scripts for an explicit set of rooms (e.g. a
// canvas multi-selection), folded into one paced run.
export const buildMultiRoomDeployPreview = (
    roomIds: Iterable<ShaperRoomId>,
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    commandNodes: Record<string, ShaperCommandNode>,
    libraries: Record<string, ShaperLibraryInstall> = {}
): ShaperDeployPreview => {
    const targetRooms = [...roomIds]
        .map(id => rooms[id])
        .filter((room): room is ShaperRoomDraft => !!room);
    return buildRoomSetDeployPreview(
        targetRooms, rooms, exits, commandNodes, libraries,
        'No selected rooms have deployable fields yet.'
    );
};

// Whole-zone deploy: every room's command script, in room-number order, folded
// into one paced run.
export const buildZoneDeployPreview = (
    rooms: Record<ShaperRoomId, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>,
    commandNodes: Record<string, ShaperCommandNode>,
    libraries: Record<string, ShaperLibraryInstall> = {}
): ShaperDeployPreview =>
    buildRoomSetDeployPreview(
        Object.values(rooms), rooms, exits, commandNodes, libraries,
        'No rooms have deployable fields yet.'
    );
