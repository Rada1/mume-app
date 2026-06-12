/**
 * @file ShaperDoorCard.tsx
 * @description Collapsible card for door exits, supporting reset state configurations (Close, Lock, No Reset).
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, DoorClosed, Key, EyeOff } from 'lucide-react';
import type { ShaperExitDraft, ShaperCommandNode } from '../model/shaperTypes';

interface ShaperDoorCardProps {
    door: ShaperExitDraft;
    doorCom: ShaperCommandNode | undefined;
    onAddComNode: (roomId: string, type: 'door', parentId: string | null, vnum: string) => void;
    onUpdateComFields: (nodeId: string, patch: Record<string, any>) => void;
    onDeleteComNode: (nodeId: string) => void;
}

export const ShaperDoorCard: React.FC<ShaperDoorCardProps> = ({
    door,
    doorCom,
    onAddComNode,
    onUpdateComFields,
    onDeleteComNode
}) => {
    const [expanded, setExpanded] = useState(false);

    const activeAction = doorCom ? (doorCom.fields.doorAction || 'close') : 'none';

    const handleActionChange = (action: string) => {
        if (action === 'none') {
            if (doorCom) {
                onDeleteComNode(doorCom.id);
            }
        } else {
            if (!doorCom) {
                // Add the node first
                onAddComNode(door.fromRoomId, 'door', null, '');
                // Note: The parent component should handle updating fields when it detects the newly created node,
                // or we can write a wrapper. But we can update if it already exists or construct it.
            } else {
                onUpdateComFields(doorCom.id, {
                    doorAction: action,
                    direction: door.direction
                });
            }
        }
    };

    // Auto-update direction on the node if it doesn't match
    if (doorCom && doorCom.fields.direction !== door.direction) {
        onUpdateComFields(doorCom.id, { direction: door.direction });
    }

    const isLocked = activeAction === 'lock';

    return (
        <div className={`shaper-entity-row door ${expanded ? 'expanded' : ''}`}>
            <div className="shaper-entity-line">
                <button
                    type="button"
                    className="shaper-entity-toggle"
                    onClick={() => setExpanded(!expanded)}
                    title="Toggle door options"
                >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="shaper-entity-vnum font-semibold text-orange-400">
                        {door.direction.toUpperCase()}
                    </span>
                    <span className="shaper-entity-name">
                        {door.doorName || 'door'}
                    </span>
                    <span className={`shaper-entity-reset-badge door-${activeAction}`}>
                        {activeAction === 'none' ? 'NO RESET' : `RESET: ${String(activeAction).toUpperCase()}`}
                    </span>
                </button>
            </div>

            {expanded && (
                <div className="shaper-entity-children font-sans">
                    <div className="shaper-mob-field-zone">
                        {/* Reset Behavior */}
                        <label className="shaper-field">
                            <span>Reset Behavior</span>
                            <select
                                value={activeAction}
                                onChange={e => handleActionChange(e.target.value)}
                            >
                                <option value="none">No Reset / Always Open</option>
                                <option value="close">Close Door</option>
                                <option value="lock">Lock Door</option>
                            </select>
                        </label>

                        {/* If door has a reset command, show additional options */}
                        {doorCom && (
                            <div className="grid gap-2 mt-2 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <DoorClosed size={12} />
                                        <span>Action: {String(doorCom.fields.doorAction || 'close').toUpperCase()}</span>
                                    </div>
                                    {door.keyVnum && (
                                        <div className="flex items-center gap-1">
                                            <Key size={12} />
                                            <span>Key: {door.keyVnum}</span>
                                        </div>
                                    )}
                                    {door.doorFlags && door.doorFlags.includes('hidden') && (
                                        <div className="flex items-center gap-1">
                                            <EyeOff size={12} />
                                            <span>Hidden</span>
                                        </div>
                                    )}
                                </div>

                                {isLocked && (
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <label className="shaper-field mb-0">
                                            <span>Min Lock Diff</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={String(doorCom.fields.minDifficulty || '')}
                                                onChange={e => onUpdateComFields(doorCom.id, { minDifficulty: e.target.value })}
                                            />
                                        </label>
                                        <label className="shaper-field mb-0">
                                            <span>Max Lock Diff</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={String(doorCom.fields.maxDifficulty || '')}
                                                onChange={e => onUpdateComFields(doorCom.id, { maxDifficulty: e.target.value })}
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
