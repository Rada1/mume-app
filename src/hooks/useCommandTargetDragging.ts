/** @file useCommandTargetDragging.ts — Adapts command targets to shared gear drag commands. */

import type React from 'react';
import { useGame } from '../context/GameContext';
import { useUIStore } from '../stores/useUIStore';
import { useObjectDragCommands } from './useObjectDragCommands';
import { getObjectTraits } from '../objects/objectTargetModel';
import type { useCommandTargetSelection } from './useCommandTargetSelection';
import { toObjectDragItem } from '../utils/gearSelectionUtils';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';

// --- Logic Section ---
export const useCommandTargetDragging = (selection: ReturnType<typeof useCommandTargetSelection>) => {
    const game = useGame();
    const dragState = useUIStore(state => state.objectDragState);
    const startDrag = useObjectDragCommands({
        executeCommand: game.executeCommand,
        triggerHaptic: game.triggerHaptic,
        mouseDragOnMove: true,
        touchDragOnMove: true,
        touchDragOnHorizontalMove: false,
        onDrop: () => selection.clear()
    });
    const entryProps = (entry: CommandActionTargetEntry) => {
        const isObject = ['objects', 'worn', 'inventory'].includes(entry.group);
        const item = selection.itemFor(entry);
        const itemId = item?.row.line.id || entry.id;
        const isContainer = item?.row.isContainer || (isObject && getObjectTraits(entry.label).includes('trait-container'));
        const target = dragState?.target;
        const isDropTarget = target?.type === 'entity' ? target.entityId === entry.id
            : target?.type === 'container' && target.containerId === itemId;
        return {
            'data-object-drop-entity': !isObject && entry.scope === 'room' ? entry.id : undefined,
            'data-object-drop-container': isContainer ? itemId : undefined,
            'data-object-drop-noun': entry.context,
            'data-object-drop-label': entry.label,
            'data-object-draggable': isObject || undefined,
            'data-drop-active': isDropTarget || undefined,
            onPointerDown: isObject ? (event: React.PointerEvent<HTMLElement>) => startDrag(event, {
                row: entry.group === 'worn' ? 'worn' : entry.group === 'inventory' ? 'inventory' : 'room',
                noun: entry.context,
                label: item?.row.name || entry.label,
                itemId,
                selectedItems: selection.isSelected(item?.id || '') ? selection.items.map(toObjectDragItem) : undefined,
                sourceLevelItemIds: selection.isSelected(item?.id || '') ? selection.selection?.sourceLevelItemIds : undefined
            }) : undefined
        };
    };
    const categoryProps = (row: 'room' | 'worn' | 'inventory') => ({
        'data-object-drop-row': row,
        'data-drop-active': dragState?.target?.type === 'row' && dragState.target.row === row || undefined
    });
    return { entryProps, categoryProps };
};
