/**
 * @file shaperLibraries.ts
 * @description Install/remove/parameter operations and command serialization
 *              for /lib behaviour libraries on rooms, mobiles, and objects.
 */

import { createShaperRoomId } from './shaperDocument';
import { findShaperLibraryEntry } from './shaperLibraryCatalog';
import type {
    ShaperLibraryInstall,
    ShaperLibraryTargetType,
    ShaperWorkspaceDoc
} from './shaperTypes';

// --- Read Section ---
export const listShaperLibraries = (
    doc: ShaperWorkspaceDoc,
    targetType: ShaperLibraryTargetType,
    targetId: string
): ShaperLibraryInstall[] =>
    Object.values(doc.libraries)
        .filter(install => install.targetType === targetType && install.targetId === targetId)
        .sort((a, b) => a.name.localeCompare(b.name));

// --- Write Section ---
export const addShaperLibrary = (
    doc: ShaperWorkspaceDoc,
    targetType: ShaperLibraryTargetType,
    targetId: string,
    name: string
): ShaperWorkspaceDoc => {
    const trimmed = name.trim();
    if (!trimmed || !targetId.trim()) return doc;
    const exists = Object.values(doc.libraries).some(install =>
        install.targetType === targetType && install.targetId === targetId && install.name === trimmed);
    if (exists) return doc;

    const entry = findShaperLibraryEntry(targetType, trimmed);
    const node = doc.commandNodes[targetId];
    const vnum = String(node?.fields.vnum ?? '').trim();
    const parameters = vnum && trimmed === 'redress-obj'
        ? { object: vnum }
        : vnum && (trimmed === 'redress-mob' || trimmed === 'redress-corpse')
            ? { mobile: vnum }
            : {};
    const id = createShaperRoomId();
    const install: ShaperLibraryInstall = {
        id,
        targetType,
        targetId,
        name: trimmed,
        parameters,
        requiresSupervisorReview: entry?.supervisorReview ?? false,
        requiresLoad: true,
        notes: ''
    };
    return { ...doc, libraries: { ...doc.libraries, [id]: install } };
};

export const removeShaperLibrary = (doc: ShaperWorkspaceDoc, id: string): ShaperWorkspaceDoc => {
    if (!doc.libraries[id]) return doc;
    const libraries = { ...doc.libraries };
    delete libraries[id];
    return { ...doc, libraries };
};

export const setShaperLibraryParam = (
    doc: ShaperWorkspaceDoc,
    id: string,
    key: string,
    value: string
): ShaperWorkspaceDoc => {
    const install = doc.libraries[id];
    const trimmedKey = key.trim();
    if (!install || !trimmedKey) return doc;
    return {
        ...doc,
        libraries: {
            ...doc.libraries,
            [id]: { ...install, parameters: { ...install.parameters, [trimmedKey]: value } }
        }
    };
};

export const removeShaperLibraryParam = (
    doc: ShaperWorkspaceDoc,
    id: string,
    key: string
): ShaperWorkspaceDoc => {
    const install = doc.libraries[id];
    if (!install || !(key in install.parameters)) return doc;
    const parameters = { ...install.parameters };
    delete parameters[key];
    return { ...doc, libraries: { ...doc.libraries, [id]: { ...install, parameters } } };
};

export const toggleShaperLibraryLoad = (doc: ShaperWorkspaceDoc, id: string): ShaperWorkspaceDoc => {
    const install = doc.libraries[id];
    if (!install) return doc;
    return {
        ...doc,
        libraries: { ...doc.libraries, [id]: { ...install, requiresLoad: !install.requiresLoad } }
    };
};

export const updateShaperLibraryNotes = (
    doc: ShaperWorkspaceDoc,
    id: string,
    notes: string
): ShaperWorkspaceDoc => {
    const install = doc.libraries[id];
    if (!install) return doc;
    return { ...doc, libraries: { ...doc.libraries, [id]: { ...install, notes } } };
};

// --- Serialization Section ---
// Builds the /lib commands for one target's installs. Positions mirror the
// install order so `set` lines line up with what /lib ... list would report.
export const buildShaperLibraryCommands = (
    installs: ShaperLibraryInstall[],
    targetType: ShaperLibraryTargetType,
    targetNumber: string
): string[] => {
    const commands: string[] = [];
    installs.forEach((install, index) => {
        const position = index + 1;
        commands.push(`/lib ${targetType} ${targetNumber} add ${install.name}`);
        Object.entries(install.parameters).forEach(([key, value]) => {
            commands.push(`/lib ${targetType} ${targetNumber} set ${position} ${key} ${value}`);
        });
    });
    if (installs.some(install => install.requiresLoad)) {
        commands.push(`/lib ${targetType} ${targetNumber} load`);
    }
    return commands;
};
