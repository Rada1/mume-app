/**
 * @file shaperProjectFiles.ts
 * @description JSON import/export helpers for portable Shaper project files.
 */

import type { ShaperWorkspaceDoc } from './shaperTypes';

// --- Type Guards Section ---
const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const isWorkspaceDoc = (value: unknown): value is ShaperWorkspaceDoc => {
    if (!isRecord(value)) return false;
    return typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.zoneNumber === 'number' &&
        typeof value.updatedAt === 'number' &&
        typeof value.selectedRoomId === 'string' &&
        isRecord(value.rooms) &&
        isRecord(value.exits) &&
        isRecord(value.commandNodes) &&
        isRecord(value.libraries);
};

// --- Import Section ---
export const parseShaperProjectFile = (text: string): ShaperWorkspaceDoc => {
    const parsed = JSON.parse(text) as unknown;
    if (!isWorkspaceDoc(parsed)) {
        throw new Error('File is not a valid Shaper project export.');
    }
    return {
        ...parsed,
        zoneInfoKeywords: parsed.zoneInfoKeywords ?? {},
        shared: false,
        updatedAt: Date.now()
    };
};

// --- Export Section ---
const safeFilePart = (value: string): string =>
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'shaper-project';

export const buildShaperProjectFilename = (doc: ShaperWorkspaceDoc): string =>
    `${safeFilePart(doc.name)}-zone-${doc.zoneNumber}.shaper.json`;

export const downloadShaperProjectFile = (doc: ShaperWorkspaceDoc): void => {
    const payload = JSON.stringify({ ...doc, shared: false }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildShaperProjectFilename(doc);
    link.click();
    URL.revokeObjectURL(url);
};
