/** @file RoomLootGroundItems.tsx — Selection and transfer controls for likely ground loot. */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { GearSelectionCheckbox } from '../GearSelectionCheckbox';
import type { GroundLootCandidate } from '../../hooks/useRoomLootCandidates';
import { useLootSelection } from '../../hooks/useLootSelection';
import './RoomLootGroundItems.css';

interface RoomLootGroundItemsProps {
    items: GroundLootCandidate[];
    corpses?: GroundLootCandidate[];
    children?: (selection: { selectedIds: ReadonlySet<string>; toggleSelected: (id: string) => void }) => React.ReactNode;
    recipientTarget: string;
    giveToMount: boolean;
    recipientLabel: string;
    executeCommand: (command: string) => void;
}

// --- Logic Section ---
export const RoomLootGroundItems: React.FC<RoomLootGroundItemsProps> = ({
    items, corpses = [], children, recipientTarget, giveToMount, recipientLabel, executeCommand
}) => {
    const rows = React.useMemo(() => [...corpses, ...items], [corpses, items]);
    const { selectedIds, selected: selectedItems, toggle: toggleSelected, transfer: transferSelected, getRowCommand } = useLootSelection(rows, recipientTarget, executeCommand);
    const selectedItemCount = selectedItems.filter(item => item.kind !== 'corpse').length;
    const selectedCorpseCount = selectedItems.length - selectedItemCount;
    const selectedActionLabel = giveToMount && selectedCorpseCount > 0
        ? selectedItemCount > 0 ? 'get selected & give items' : 'get selected'
        : giveToMount ? 'get & give selected' : 'get selected';
    const selectedActionHint = selectedItems.length === 1
        ? `<${getRowCommand(selectedItems[0])}>`
        : giveToMount && selectedItemCount > 0
            ? `${selectedItemCount} ${selectedItemCount === 1 ? 'item' : 'items'} → ${recipientLabel}`
            : `${selectedItems.length} ${selectedCorpseCount === selectedItems.length ? 'corpses' : 'items'}`;

    if (rows.length === 0) return null;
    return (
        <details className="room-loot-ground" aria-label="On the ground" open>
            <summary className="room-loot-section-heading"><span>On the ground</span><small>{rows.length}</small><ChevronDown size={12} /></summary>
            <button type="button" className="room-loot-command" onClick={() => executeCommand('get all')}><span>get all</span><small>&lt;get all&gt;</small></button>
            <div className="room-loot-ground-list">
                {children?.({ selectedIds, toggleSelected })}
                {items.map(item => (
                    <div className="room-loot-ground-row" key={item.id} data-selected={selectedIds.has(item.id) || undefined}>
                        <button type="button" className="room-loot-ground-item" onClick={() => toggleSelected(item.id)} aria-pressed={selectedIds.has(item.id)}>
                            <span title={item.label}>{item.label}</span><small>&lt;{item.commandTarget}&gt;</small>
                        </button>
                        <GearSelectionCheckbox checked={selectedIds.has(item.id)} label={`Select ${item.label}`} onChange={() => toggleSelected(item.id)} />

                    </div>
                ))}
            </div>
            {selectedItems.length > 0 && <div className="room-loot-actions">
                    <button type="button" className="room-loot-command" onClick={() => transferSelected(giveToMount)}>
                        <span>{selectedActionLabel}</span>
                        <small>{selectedActionHint}</small>
                    </button>
            </div>}
        </details>
    );
};
