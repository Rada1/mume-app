/** @file useLootSelection.ts — Shared loot selection and ordered transfer commands. */
import { useEffect, useState } from 'react';
import type { GroundLootCandidate } from './useRoomLootCandidates';

// --- Logic Section ---
export const useLootSelection = (rows: GroundLootCandidate[], recipient: string, executeCommand: (command: string) => void, corpseTarget?: string) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    useEffect(() => {
        const visible = new Set(rows.map(row => row.id));
        setSelectedIds(current => {
            const retained = new Set([...current].filter(id => visible.has(id)));
            return retained.size === current.size ? current : retained;
        });
    }, [rows]);
    const selected = rows.filter(row => selectedIds.has(row.id));
    const toggle = (id: string) => setSelectedIds(current => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const getCommand = (target: string) => `get ${target}${corpseTarget ? ` ${corpseTarget}` : ''}`;
    const getRowCommand = (row: GroundLootCandidate) => row.kind === 'corpse'
        ? `get ${row.commandTarget}`
        : getCommand(row.commandTarget);
    const transfer = (give: boolean) => {
        if (!selected.length) return;
        const keyword = (target: string) => target.replace(/^\d+\./, '');
        const ordinal = (target: string) => Number(target.match(/^(\d+)\./)?.[1] || 1);
        const ordered = [...selected].sort((a, b) => keyword(a.commandTarget).localeCompare(keyword(b.commandTarget)) || ordinal(b.commandTarget) - ordinal(a.commandTarget));
        executeCommand(ordered.flatMap(row => {
            const get = getRowCommand(row);
            return give && row.kind !== 'corpse'
                ? [get, `give ${corpseTarget ? row.commandTarget : keyword(row.commandTarget)} ${recipient}`]
                : [get];
        }).join('; '));
        setSelectedIds(new Set());
    };
    return { selectedIds, selected, toggle, transfer, getCommand, getRowCommand };
};
