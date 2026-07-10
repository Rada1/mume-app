/**
 * @file shaperComDisplay.ts
 * @description Display labels for Shaper /com command rows.
 */

import type { ShaperCommandNode } from './shaperTypes';

const textField = (node: ShaperCommandNode, key: string): string =>
    String(node.fields[key] ?? '').trim();

// --- Label Section ---
export const shaperComDisplayName = (node: ShaperCommandNode): string => textField(node, 'name');

export const shaperComEntityLabel = (node: ShaperCommandNode): string => {
    const vnum = textField(node, 'vnum');
    const name = shaperComDisplayName(node);
    if (vnum && name) return `${vnum} (${name})`;
    return vnum || name || node.type;
};

