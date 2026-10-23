/** @file RoomLootCorpseContents.tsx — Selectable contents and transfer actions for one corpse. */
import React from 'react';
import { GearSelectionCheckbox } from '../GearSelectionCheckbox';
import type { DrawerLine } from '../../types';
import { getDrawerObjectKeyword } from '../../objects/objectTargetModel';
import { useLootSelection } from '../../hooks/useLootSelection';
import './RoomLootCorpseContents.css';

interface LootItemRow {
    id: string;
    label: string;
    commandTarget: string;
}

interface RoomLootCorpseContentsProps {
    isBusy?: boolean;
    corpseId: string;
    corpseLabel: string;
    corpseTarget: string;
    contents?: DrawerLine[];
    recipientTarget: string;
    giveToMount: boolean;
    recipientLabel: string;
    executeCommand: (command: string) => void;
}

// --- Logic Section ---
export const RoomLootCorpseContents: React.FC<RoomLootCorpseContentsProps> = ({
    isBusy, corpseId, corpseLabel, corpseTarget, contents, recipientTarget, giveToMount, recipientLabel, executeCommand
}) => {

    const rows = React.useMemo(() => {
        const itemLines = (contents || []).filter(line => line.isItem && !line.isHeader);
        const candidates = itemLines.map((line, index) => ({
            line,
            index,
            commandTarget: getDrawerObjectKeyword(line)
        })).filter(item => item.commandTarget);
        const totals = new Map<string, number>();
        candidates.forEach(item => totals.set(item.commandTarget, (totals.get(item.commandTarget) || 0) + 1));
        const seen = new Map<string, number>();
        return candidates.map(({ line, index, commandTarget }): LootItemRow => {
            const ordinal = (seen.get(commandTarget) || 0) + 1;
            seen.set(commandTarget, ordinal);
            const total = totals.get(commandTarget) || 0;
            return {
                id: `${line.stableId || line.entityId || line.id || index}`,
                label: line.text.replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]*>/g, '').trim(),
                commandTarget: total > 1 ? `${ordinal}.${commandTarget}` : commandTarget
            };
        });
    }, [contents]);

    const { selectedIds, selected: selectedRows, toggle: toggleSelected, transfer: runTransfer, getCommand } = useLootSelection(rows, recipientTarget, executeCommand, corpseTarget);

    return (
        <section className="room-loot-corpse" aria-label={`Contents of ${corpseLabel}`}>
                <div className="room-loot-corpse-body">
                    {contents === undefined ? <span className="room-loot-empty">Waiting for corpse contents…</span>
                        : rows.length === 0 ? <span className="room-loot-empty">Nothing visible inside.</span>
                            : rows.map(row => (
                                <div className="room-loot-item-row" key={`${corpseId}:${row.id}`} data-selected={selectedIds.has(row.id) || undefined}>
                                    <button type="button" className="room-loot-item-label" onClick={() => toggleSelected(row.id)} aria-pressed={selectedIds.has(row.id)}>
                                        <span title={row.label}>{row.label}</span><small>&lt;{row.commandTarget}&gt;</small>
                                    </button>
                                    <GearSelectionCheckbox checked={selectedIds.has(row.id)} label={`Select ${row.label}`} onChange={() => toggleSelected(row.id)} />
                                </div>
                            ))}
                    {selectedRows.length > 0 && (
                        <div className="room-loot-actions">
                            <div className="room-loot-section-heading"><span>Actions</span></div>
                            <button type="button" className="room-loot-command" disabled={isBusy} onClick={() => runTransfer(giveToMount)}>
                                <span>{giveToMount ? 'get & give selected' : 'get selected'}</span>
                                <small>{giveToMount ? `→ ${recipientLabel}` : selectedRows.length === 1 ? `<${getCommand(selectedRows[0].commandTarget)}>` : `${selectedRows.length} items`}</small>
                            </button>
                        </div>
                    )}
                </div>
        </section>
    );
};
