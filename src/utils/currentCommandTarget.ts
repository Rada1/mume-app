/** @file currentCommandTarget.ts — Match a combat target without matching objects that share its name. */
import { canSetTargetChipFromCategory } from './inlineCategoryAxes';
// --- Matching Section ---
export function isCurrentCommandTarget(entry: { category?: string; context?: string; keyword?: string }, target: string | null | undefined) {
    if (!target || !canSetTargetChipFromCategory(entry.category)) return false;
    const normalized = target.trim().toLowerCase();
    return [entry.context, entry.keyword].some(value => value?.trim().toLowerCase() === normalized);
}
