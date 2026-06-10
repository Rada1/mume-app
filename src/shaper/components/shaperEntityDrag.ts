/**
 * @file shaperEntityDrag.ts
 * @description Drag payload helpers for moving mobs/objects from the reference
 *              database panels into a room (or onto a mob) in the inspector.
 */

import type { DragEvent } from 'react';

// --- Types Section ---
export const SHAPER_ENTITY_MIME = 'application/x-shaper-entity';
// Kind-specific marker types let dragover handlers tell mob vs object drags
// apart (the JSON payload is unreadable during dragover for security reasons).
const KIND_MIME: Record<'mob' | 'object', string> = {
    mob: 'application/x-shaper-mob',
    object: 'application/x-shaper-object'
};

export interface ShaperEntityDragData {
    kind: 'mob' | 'object';
    vnum: string;
    name: string;
}

// --- Helpers Section ---
export const setEntityDragData = (e: DragEvent, data: ShaperEntityDragData): void => {
    e.dataTransfer.setData(SHAPER_ENTITY_MIME, JSON.stringify(data));
    e.dataTransfer.setData(KIND_MIME[data.kind], '1');
    e.dataTransfer.effectAllowed = 'copy';
};

export const getEntityDragData = (e: DragEvent): ShaperEntityDragData | null => {
    try {
        const raw = e.dataTransfer.getData(SHAPER_ENTITY_MIME);
        return raw ? (JSON.parse(raw) as ShaperEntityDragData) : null;
    } catch {
        return null;
    }
};

// True when the active drag carries an entity of the given kind.
export const hasEntityKind = (e: DragEvent, kind: 'mob' | 'object'): boolean =>
    e.dataTransfer.types.includes(KIND_MIME[kind]);
