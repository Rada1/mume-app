/** @file itemCondition.ts — Shared condition text rendering contracts. */
import type { ItemStateTier } from '../utils/itemTier';

// --- Data Contracts ---
export interface ItemConditionTextProps {
    content: string;
    source?: string;
    offset?: number;
}
export interface ItemConditionSegment {
    text: string;
    state?: ItemStateTier;
}
