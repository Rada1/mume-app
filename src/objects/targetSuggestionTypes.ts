/**
 * @file targetSuggestionTypes.ts
 * @description Shared data contract for target menu entries.
 */

import type { ObjectLocation } from './objectTargetModel';

// --- Target Suggestion Types ---

export interface CommandTargetSuggestion {
    key: string;
    label: string;
    value: string;
    meta: string;
    customLabel?: string;
    details?: Array<{ label: string; value: string }>;
    wornLocation?: string;
    expiresAt?: number;
    isFavorite?: boolean;
    containerId?: string;
    containerCommand?: string;
    objectId?: string;
    objectLocation?: ObjectLocation;
    objectTraits?: string[];
}

// --- Suggestion Factory ---

export const makeCommandTargetSuggestion = (
    label: string,
    value: string,
    meta: string
): CommandTargetSuggestion => ({
    key: `${meta}-${value.toLowerCase().replace(/\s+/g, '-')}`,
    label,
    value,
    meta
});
