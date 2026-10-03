/** @file RoomLootCorpseContents.tsx — Selectable contents and transfer actions for one corpse. */
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { DrawerLine } from '../../types';
import { getDrawerObjectKeyword } from '../../objects/objectTargetModel';
import './RoomLootCorpseContents.css';

interface LootItemRow {
    id: string;
    label: string;
    commandTarget: string;
}

interface RoomLootCorpseContentsProps {
    corpseId: string;
    corpseLabel: string;
    corpseTarget: string;
    contents?: DrawerLine[];
    recipientTarget: string;
    recipientLabel: string;
    onLookInside: () => void;
    executeCommand: (command: string) => void;
}

// --- Logic Section ---
export const RoomLootCorpseContents: React.FC<RoomLootCorpseContentsProps> = ({
    corpseId, corpseLabel, corpseTarget, contents, recipientTarget, recipientLabel, onLookInside, executeCommand
}) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());

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

    React.useEffect(() => {
        if (contents !== undefined) setIsLoading(false);
    }, [contents]);

    const toggleExpanded = () => {
        if (!isExpanded && contents === undefined) {
            setIsLoading(true);
            onLookInside();
        }
        setIsExpanded(current => !current);
    };

    const toggleSelected = (id: string) => {
        setSelectedIds(current => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectedRows = rows.filter(row => selectedIds.has(row.id));
    const runTransfer = (giveToRecipient: boolean) => {
        if (!selectedRows.length) return;
        const commands = selectedRows.flatMap(row => {
            const getCommand = `get ${row.commandTarget} ${corpseTarget}`;
            return giveToRecipient
                ? [getCommand, `give ${row.commandTarget} ${recipientTarget}`]
                : [getCommand];
        });
        executeCommand(commands.join('; '));
        setSelectedIds(new Set());
    };

    const takeOne = (row: LootItemRow) => {
        executeCommand(`get ${row.commandTarget} ${corpseTarget}`);
        setSelectedIds(current => {
            const next = new Set(current);
            next.delete(row.id);
            return next;
        });
    };

    return (
        <section className="room-loot-corpse" aria-label={`Contents of ${corpseLabel}`}>
            <button className="room-loot-corpse-toggle" type="button" onClick={toggleExpanded} aria-expanded={isExpanded}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{isExpanded ? 'Hide contents' : contents === undefined ? 'Examine contents' : 'Show contents'}</span>
                {isLoading && <span className="room-loot-loading">loading</span>}
            </button>
            {isExpanded && (
                <div className="room-loot-corpse-body">
                    {contents === undefined ? <span className="room-loot-empty">Waiting for corpse contents…</span>
                        : rows.length === 0 ? <span className="room-loot-empty">Nothing visible inside.</span>
                            : rows.map(row => (
                                <div className="room-loot-item-row" key={`${corpseId}:${row.id}`}>
                                    <label>
                                        <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} />
                                        <span>{row.label}</span>
                                    </label>
                                    <button type="button" onClick={() => takeOne(row)}>Take</button>
                                </div>
                            ))}
                    {selectedRows.length > 0 && (
                        <div className="room-loot-selection-bar">
                            <span>{selectedRows.length} selected</span>
                            <button type="button" onClick={() => runTransfer(false)}>Take selected</button>
                            <button type="button" onClick={() => runTransfer(true)}>Give to {recipientLabel}</button>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};
