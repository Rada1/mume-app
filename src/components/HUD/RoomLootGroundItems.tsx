/** @file RoomLootGroundItems.tsx — Selection and transfer controls for likely ground loot. */
import React from 'react';
import { X } from 'lucide-react';
import { GearSelectionCheckbox } from '../GearSelectionCheckbox';
import type { GroundLootCandidate } from '../../hooks/useRoomLootCandidates';
import './RoomLootGroundItems.css';

interface RoomLootGroundItemsProps {
    items: GroundLootCandidate[];
    recipientTarget: string;
    recipientLabel: string;
    executeCommand: (command: string) => void;
    onDismiss: (id: string) => void;
}

// --- Logic Section ---
export const RoomLootGroundItems: React.FC<RoomLootGroundItemsProps> = ({
    items, recipientTarget, recipientLabel, executeCommand, onDismiss
}) => {
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
    React.useEffect(() => {
        const visibleIds = new Set(items.map(item => item.id));
        setSelectedIds(current => new Set([...current].filter(id => visibleIds.has(id))));
    }, [items]);

    const selectedItems = items.filter(item => selectedIds.has(item.id));
    const toggleSelected = (id: string) => setSelectedIds(current => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
    const transferSelected = (giveToRecipient: boolean) => {
        if (selectedItems.length === 0) return;
        const getOrdinal = (target: string) => Number(target.match(/^(\d+)\./)?.[1] || 1);
        const getKeyword = (target: string) => target.replace(/^\d+\./, '');
        const orderedItems = [...selectedItems].sort((left, right) => {
            const keywordOrder = getKeyword(left.commandTarget).localeCompare(getKeyword(right.commandTarget));
            return keywordOrder || getOrdinal(right.commandTarget) - getOrdinal(left.commandTarget);
        });
        const commands = orderedItems.flatMap(item => {
            const keyword = getKeyword(item.commandTarget);
            return giveToRecipient
                ? [`get ${item.commandTarget}`, `give ${keyword} ${recipientTarget}`]
                : [`get ${item.commandTarget}`];
        });
        executeCommand(commands.join('; '));
        setSelectedIds(new Set());
    };

    if (items.length === 0) return null;
    return (
        <section className="room-loot-ground" aria-label="Likely items on the ground">
            <header>
                <strong>On the ground</strong><span>{items.length}</span>
                <button type="button" onClick={() => executeCommand('get all')}>Get all</button>
            </header>
            <div className="room-loot-ground-list">
                {items.map(item => (
                    <div className="room-loot-ground-row" key={item.id}>
                        <div className="room-loot-ground-item">
                            <GearSelectionCheckbox checked={selectedIds.has(item.id)} label={`Select ${item.label}`}
                                onChange={() => toggleSelected(item.id)} />
                            <span title={item.label}>{item.label}</span>
                        </div>
                        <button type="button" onClick={() => executeCommand(`get ${item.commandTarget}`)}>Get</button>
                        <button className="room-loot-ground-dismiss" type="button" aria-label={`Hide ${item.label}`}
                            onClick={() => onDismiss(item.id)}><X size={14} /></button>
                    </div>
                ))}
            </div>
            {selectedItems.length > 0 && (
                <footer className="room-loot-ground-selection">
                    <span>{selectedItems.length} selected</span>
                    <button type="button" onClick={() => transferSelected(false)}>Take selected</button>
                    <button type="button" onClick={() => transferSelected(true)}>Give to {recipientLabel}</button>
                </footer>
            )}
        </section>
    );
};
