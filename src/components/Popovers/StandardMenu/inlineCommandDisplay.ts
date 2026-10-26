/** @file inlineCommandDisplay.ts — Inline command text split around optional argument controls. */

import type { ReactNode } from 'react';

// --- Type Section ---
export interface InlineCommandDisplayParts {
    prefix: string;
    middle?: ReactNode;
    suffix: string;
}
