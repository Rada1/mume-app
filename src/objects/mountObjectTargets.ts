/** @file mountObjectTargets.ts — Builds individually selectable cargo targets bound to their mount. */
import type { GearRow } from '../types';
import type { CommandActionTargetEntry } from './commandActionTargetModel';

// --- Cargo Targets ---
export const getMountObjectTargets = (
    mount: CommandActionTargetEntry, rows: GearRow[], containerId: string
): CommandActionTargetEntry[] => {
    const totals = new Map<string, number>();
    const seen = new Map<string, number>();
    rows.forEach(row => totals.set(row.noun, (totals.get(row.noun) || 0) + 1));
    return rows.map((row, index) => {
        const ordinal = (seen.get(row.noun) || 0) + 1;
        seen.set(row.noun, ordinal);
        const target = (totals.get(row.noun) || 0) > 1 && !/^\d+\./.test(row.noun)
            ? `${ordinal}.${row.noun}` : row.noun;
        return {
            id: `${containerId}:cargo:${row.line.id}:${index}`, label: row.name,
            keyword: target, context: target, parentNoun: mount.context, parentId: containerId,
            category: 'cat-mount-object', group: 'objects', scope: 'room', gearRow: row
        };
    });
};
