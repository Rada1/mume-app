/**
 * @file commandTargetMemory.ts
 * @description Session-scoped global and per-command target selection.
 */

// --- Logic Section ---
import { useRoomStore } from '../stores/useRoomStore';
import { getMountTargetSuggestions, getRoomTargetSuggestions } from './commandSuggestionUtils';
import { getCommandTargetMenuKind } from './commandTargetUtils';

type GlobalTargetKind = 'room-entity' | 'mount' | 'room-object' | 'corpse' | 'exit' | 'self';
interface CommandTargetEntry {
    target: string;
    revision: number;
}

const targetsByCommand = new Map<string, CommandTargetEntry>();
let globalTarget: { target: string; kind: GlobalTargetKind; revision: number } | null = null;
let revision = 0;

export const getCommandTargetKey = (command: string): string | null => {
    const trimmed = command.trim().toLowerCase();
    if (!trimmed) return null;

    const spell = trimmed.match(/^(?:cast|c|commune)\s+['"]([^'"]+)['"]/i);
    if (spell) return `spell:${spell[1].trim().toLowerCase()}`;

    return trimmed.split(/\s+/, 1)[0] || null;
};

const normalizeTarget = (target: string): string => target.trim().toLowerCase().replace(/\s+/g, ' ');

const classifyGlobalTarget = (target: string): GlobalTargetKind => {
    const normalized = normalizeTarget(target);
    if (normalized === 'self') return 'self';
    if (normalized === 'exit') return 'exit';
    if (normalized === 'mount') return 'mount';

    const room = useRoomStore.getState();
    const chars = Object.values(room.chars);
    const charSuggestions = getRoomTargetSuggestions(chars, [], 'characters');
    const matchingChar = charSuggestions.some(suggestion => normalizeTarget(suggestion.value) === normalized);
    if (matchingChar) {
        const mountSuggestions = getMountTargetSuggestions(chars);
        return mountSuggestions.some(suggestion => normalizeTarget(suggestion.value) === normalized)
            ? 'mount'
            : 'room-entity';
    }

    const objectSuggestions = getRoomTargetSuggestions([], room.items, 'objects');
    const matchingObject = objectSuggestions.find(suggestion => normalizeTarget(suggestion.value) === normalized);
    if (matchingObject) {
        return /corpse/i.test(matchingObject.label) ? 'corpse' : 'room-object';
    }

    // Typed global targets are usually room characters that are not in the
    // current room snapshot, so treat unrecognized names as room entities.
    return 'room-entity';
};

const isGlobalTargetCompatible = (command: string, kind: GlobalTargetKind): boolean => {
    const menuKind = getCommandTargetMenuKind(command);
    if (!menuKind) return false;

    if (kind === 'self') return menuKind === 'self-room';
    if (kind === 'mount') return [
        'room', 'room-spell', 'room-spell-with-extras', 'self-room', 'bash', 'mounts'
    ].includes(menuKind);
    if (kind === 'exit') return [
        'containers', 'bash', 'pick', 'room-spell-with-extras'
    ].includes(menuKind);
    if (kind === 'room-object') return menuKind === 'pick';
    if (kind === 'corpse') return [
        'room', 'room-corpses', 'pick'
    ].includes(menuKind);

    return [
        'room', 'room-spell', 'room-spell-with-extras', 'self-room', 'bash', 'who'
    ].includes(menuKind);
};

export const isCompatibleGlobalTarget = (command: string, target: string | null): boolean =>
    !!target?.trim() && isGlobalTargetCompatible(command, classifyGlobalTarget(target));

/** Sets the global target; compatible commands inherit it until retargeted individually. */
export const setGlobalCommandTarget = (target: string | null): void => {
    revision += 1;
    globalTarget = target?.trim()
        ? { target: target.trim(), kind: classifyGlobalTarget(target), revision }
        : null;
};

export const getRememberedCommandTarget = (command: string): string | null => {
    const key = getCommandTargetKey(command);
    if (!key) return null;
    const commandTarget = targetsByCommand.get(key);
    const globalApplies = globalTarget && isGlobalTargetCompatible(command, globalTarget.kind);
    if (globalApplies && (!commandTarget || globalTarget.revision > commandTarget.revision)) {
        return globalTarget.target;
    }
    return commandTarget?.target || null;
};

export const rememberCommandTarget = (command: string, target: string | null): void => {
    const key = getCommandTargetKey(command);
    if (!key) return;
    revision += 1;
    if (target?.trim()) targetsByCommand.set(key, { target: target.trim(), revision });
    else targetsByCommand.delete(key);
};

export const clearCommandTargetMemory = (): void => {
    targetsByCommand.clear();
    globalTarget = null;
    revision = 0;
};
