/**
 * @file inlineActionDeckModel.ts
 * @description Shared data shape for grouped inline actions.
 */

import type { CustomButton } from '../types';

// --- Logic Section ---

export interface InlineActionDeckGroup {
    section: { key: string; label: string };
    buttons: CustomButton[];
    inspectionCommands: Array<'look' | 'consider'>;
}
