/**
 * @file commandActionTargetMatching.ts
 * @description Matches a current command target to an entry in the target picker.
 */
import type { CommandActionTargetEntry } from './commandActionTargetModel';
import { normalizeInlineCategoryId, getInlineCategoryAxes } from '../utils/inlineCategoryAxes';
import { stripAnsiCodes } from '../utils/ansi';

// --- Logic Section ---
const normalizeTargetText = (value?: string): string => stripAnsiCodes(value).trim().replace(/\s+/g, ' ').toLowerCase();

const getIdLeaf = (value?: string): string => value?.split(/[:#]/).filter(Boolean).pop()?.toLowerCase() || '';

const categoriesShareTargetType = (left?: string, right?: string): boolean => {
    if (!left || !right) return false;
    const leftId = normalizeInlineCategoryId(left);
    const rightId = normalizeInlineCategoryId(right);
    if (leftId === rightId) return true;
    const leftAxes = getInlineCategoryAxes(leftId);
    const rightAxes = getInlineCategoryAxes(rightId);
    return leftAxes.family !== 'unknown'
        && leftAxes.family === rightAxes.family
        && leftAxes.location === rightAxes.location;
};

export const isMatchingCommandTarget = (
    entry: CommandActionTargetEntry,
    current: { entityId?: string; category?: string; context?: string; keyword?: string; displayName?: string }
): boolean => {
    if (current.entityId && entry.id === current.entityId) return true;
    if (!categoriesShareTargetType(current.category, entry.category)) return false;
    const currentIdLeaf = getIdLeaf(current.entityId);
    if (currentIdLeaf && currentIdLeaf === getIdLeaf(entry.id)) return true;
    const selectedTerms = [current.context, current.keyword, current.displayName].map(normalizeTargetText).filter(Boolean);
    const entryTerms = [entry.context, entry.keyword, entry.label].map(normalizeTargetText).filter(Boolean);
    return selectedTerms.some(term => entryTerms.includes(term));
};
