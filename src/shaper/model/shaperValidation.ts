/**
 * @file shaperValidation.ts
 * @description Validation rules for Shaper concept drafts, derived from the
 *              room_help.md / com_help.md builder contracts.
 */

import type {
    ShaperCommandNode,
    ShaperCommandType,
    ShaperDirection,
    ShaperExitDraft,
    ShaperLibraryInstall,
    ShaperRoomDraft,
    ShaperRoomFlag,
    ShaperSector,
    ShaperValidationIssue,
    ShaperWorkspaceDoc
} from './shaperTypes';
import { hasShaperExitClimb, hasShaperExitDoor } from './shaperExitFlags';

// --- Constants Section ---
const forcedActionPattern = /\b(you feel|you think|you sneeze|you gasp|you shiver|you notice|you see)\b/i;
const waterSectors: ShaperSector[] = ['water', 'rapids', 'underwater', 'shallows'];
const oppositeDirection: Record<ShaperDirection, ShaperDirection> = {
    n: 's', s: 'n', e: 'w', w: 'e', u: 'd', d: 'u'
};
const vnumRequiredTypes: ShaperCommandType[] = [
    'mobile', 'follow', 'object', 'equip', 'give', 'put', 'hide', 'container', 'find'
];

// --- Helpers Section ---
const maxLineLength = (text: string): number =>
    text.split(/\r?\n/).reduce((max, line) => Math.max(max, line.length), 0);

const issue = (
    id: string,
    severity: ShaperValidationIssue['severity'],
    targetId: string,
    roomId: string,
    message: string
): ShaperValidationIssue => ({ id, severity, targetId, roomId, message });

// --- Room Rules Section ---
const validateRoom = (room: ShaperRoomDraft): ShaperValidationIssue[] => {
    const issues: ShaperValidationIssue[] = [];
    const flags = room.flags ?? [];
    const has = (flag: ShaperRoomFlag) => flags.includes(flag);
    const name = room.name ?? '';
    const description = room.description ?? '';
    const notes = room.notes ?? '';
    const mobs = room.mobs ?? [];

    if (!name.trim()) {
        issues.push(issue(`${room.id}-missing-name`, 'error', room.id, room.id, 'Room name is required.'));
    }
    if (!description.trim()) {
        issues.push(issue(`${room.id}-missing-description`, 'warning', room.id, room.id, 'Room description is empty.'));
    }
    if (maxLineLength(description) > 80) {
        issues.push(issue(`${room.id}-description-width`, 'warning', room.id, room.id, 'Description has lines longer than 80 characters.'));
    }
    if (forcedActionPattern.test(description)) {
        issues.push(issue(`${room.id}-forced-action`, 'warning', room.id, room.id, 'Description may force player perception or action.'));
    }
    if (!room.sector) {
        issues.push(issue(`${room.id}-missing-sector`, 'warning', room.id, room.id, 'Sector type is not set.'));
    }
    if (room.sector === 'building' && !has('indoors')) {
        issues.push(issue(`${room.id}-building-indoors`, 'warning', room.id, room.id, 'A building sector usually also needs the indoors flag.'));
    }
    if (room.sector && waterSectors.includes(room.sector) && !has('water')) {
        issues.push(issue(`${room.id}-water-flag`, 'warning', room.id, room.id, `A ${room.sector} sector usually also needs the water room flag.`));
    }
    if (has('sunlit') && !has('dark') && !has('indoors')) {
        issues.push(issue(`${room.id}-sunlit-meaningless`, 'warning', room.id, room.id, 'The sunlit flag is meaningless without dark or indoors.'));
    }
    if (has('random_exits') && mobs.length > 0) {
        issues.push(issue(`${room.id}-random-exits-mobs`, 'warning', room.id, room.id, 'random_exits with placed mobs can scatter them; verify mob movement plans.'));
    }
    if (has('death') && !notes.toLowerCase().includes('edesc')) {
        issues.push(issue(`${room.id}-deathtrap-edesc`, 'warning', room.id, room.id, 'Deathtrap rooms should document exit descriptions.'));
    }

    return issues;
};

// --- Exit Rules Section ---
const validateExit = (
    exit: ShaperExitDraft,
    rooms: Record<string, ShaperRoomDraft>,
    exits: Record<string, ShaperExitDraft>
): ShaperValidationIssue[] => {
    const issues: ShaperValidationIssue[] = [];
    const fromRoom = rooms[exit.fromRoomId];
    const toRoom = exit.toRoomId ? rooms[exit.toRoomId] : null;
    const dir = exit.direction.toUpperCase();

    const hasDoor = hasShaperExitDoor(exit);
    const hasClimb = hasShaperExitClimb(exit);

    if (hasDoor && hasClimb) {
        issues.push(issue(`${exit.id}-door-climb`, 'error', exit.id, exit.fromRoomId, `Exit ${dir} cannot be both a door and a climb.`));
    }
    if (hasClimb && (exit.climbDifficulty === undefined || exit.climbDifficulty <= 0)) {
        issues.push(issue(`${exit.id}-climb-difficulty`, 'warning', exit.id, exit.fromRoomId, `Climb exit ${dir} needs a positive difficulty (skill requirement).`));
    }
    if (hasClimb && exit.climbDamage !== undefined && exit.climbDamage < 0) {
        issues.push(issue(`${exit.id}-climb-damage`, 'warning', exit.id, exit.fromRoomId, `Climb exit ${dir} has negative damage.`));
    }
    if (exit.doorFlags?.includes('stream') && (!fromRoom?.sector || !waterSectors.includes(fromRoom.sector))) {
        issues.push(issue(`${exit.id}-stream-water`, 'warning', exit.id, exit.fromRoomId, `Exit ${dir} has the stream flag but the room is not a water sector.`));
    }
    if (toRoom?.flags.includes('death') && !exit.exitDescription?.trim()) {
        issues.push(issue(`${exit.id}-deathtrap-edesc`, 'warning', exit.id, exit.fromRoomId, `Exit ${dir} leads to a deathtrap and should have an exit description.`));
    }
    if (toRoom) {
        const returnKey = `${exit.toRoomId}:${oppositeDirection[exit.direction]}`;
        const returnExit = exits[returnKey];
        if (!returnExit || returnExit.toRoomId !== exit.fromRoomId) {
            issues.push(issue(`${exit.id}-no-return`, 'warning', exit.id, exit.fromRoomId, `Exit ${dir} has no matching return exit; confirm it is intentionally one-way.`));
        }
    }

    return issues;
};

// --- Reset Command Rules Section ---
const validateCommandNode = (
    node: ShaperCommandNode,
    nodes: Record<string, ShaperCommandNode>
): ShaperValidationIssue[] => {
    const issues: ShaperValidationIssue[] = [];
    const label = `${node.type} node`;

    if (vnumRequiredTypes.includes(node.type) && !String(node.fields.vnum ?? '').trim()) {
        issues.push(issue(`${node.id}-missing-vnum`, 'error', node.id, node.roomId, `${label} is missing a vnum.`));
    }
    if (node.parentId && !nodes[node.parentId]) {
        issues.push(issue(`${node.id}-bad-parent`, 'error', node.id, node.roomId, `${label} references a parent that no longer exists.`));
    }
    if (node.limit && !/^\d+$/.test(node.limit.raw)) {
        issues.push(issue(`${node.id}-bad-limit`, 'error', node.id, node.roomId, `${label} has an invalid limit string.`));
    }
    // MUME requires at least one of world/zone/room cap; any single one satisfies it.
    if (node.type === 'mobile' || node.type === 'object') {
        const hasCap = !!node.limit && (
            (node.limit.world ?? 0) > 0 || (node.limit.zone ?? 0) > 0 || (node.limit.room ?? 0) > 0
        );
        if (!hasCap) {
            issues.push(issue(`${node.id}-no-cap`, 'warning', node.id, node.roomId, `${label} has no world/zone/room spawn cap.`));
        }
    }

    return issues;
};

// --- Library Rules Section ---
const validateLibrary = (install: ShaperLibraryInstall): ShaperValidationIssue[] => {
    const issues: ShaperValidationIssue[] = [];
    const roomId = install.targetType === 'room' ? install.targetId : undefined;
    if (install.requiresSupervisorReview) {
        issues.push({
            id: `${install.id}-supervisor-review`,
            severity: 'warning',
            targetId: install.id,
            roomId,
            message: `Library ${install.name} requires supervisor review before deploy.`
        });
    }
    return issues;
};

// --- Document Validation Section ---
export const validateShaperDocument = (doc: ShaperWorkspaceDoc): ShaperValidationIssue[] => [
    ...Object.values(doc.rooms).flatMap(validateRoom),
    ...Object.values(doc.exits).flatMap(exit => validateExit(exit, doc.rooms, doc.exits)),
    ...Object.values(doc.commandNodes).flatMap(node => validateCommandNode(node, doc.commandNodes)),
    ...Object.values(doc.libraries).flatMap(validateLibrary)
];
