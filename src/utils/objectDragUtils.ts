/** @file objectDragUtils.ts — Drop target and command rules for gear dragging. */

import type { ObjectDragItem, ObjectDragSource, ObjectDropTarget } from '../types';

// --- Logic Section ---

export const getObjectDropTarget = (el: Element | null): ObjectDropTarget | null => {
    const node = el as HTMLElement | null;
    const containerEl = node?.closest<HTMLElement>('[data-object-drop-container]');
    const rowEl = node?.closest<HTMLElement>('[data-object-drop-row]');
    const entityEl = node?.closest<HTMLElement>('[data-object-drop-entity]');

    if (containerEl) {
        const noun = containerEl.dataset.objectDropNoun;
        const containerId = containerEl.dataset.objectDropContainer;
        if (noun && containerId) return {
            type: 'container', containerId, noun,
            label: containerEl.dataset.objectDropLabel || noun
        };
    }

    if (entityEl) {
        const noun = entityEl.dataset.objectDropNoun;
        const entityId = entityEl.dataset.objectDropEntity;
        if (!noun || !entityId) return null;
        return {
            type: 'entity', entityId, noun,
            label: entityEl.dataset.objectDropLabel || noun
        };
    }

    const row = rowEl?.dataset.objectDropRow;
    if (row === 'inventory' || row === 'worn' || row === 'room') {
        return { type: 'row', row, slot: rowEl.dataset.objectDropSlot };
    }
    return null;
};

const isSameRow = (source: ObjectDragSource, target: ObjectDropTarget): boolean => (
    target.type === 'row' && source.row === target.row
);

export const isValidObjectDragTarget = (source: ObjectDragSource, target: ObjectDropTarget | null): target is ObjectDropTarget => {
    if (!target) return false;
    if (source.selectedItems?.length) {
        return source.selectedItems.every(item => isValidSingleObjectDragTarget(item, target));
    }
    return isValidSingleObjectDragTarget(source, target);
};

const isValidSingleObjectDragTarget = (source: ObjectDragItem, target: ObjectDropTarget | null): target is ObjectDropTarget => {
    if (!target) return false;
    if (target.type === 'container') return source.row === 'inventory'
        && !source.parentContainerNoun && source.itemId !== target.containerId;
    if (source.parentContainerNoun) return target.type === 'row' && target.row === 'inventory';
    if (isSameRow(source, target)) return false;
    if (target.type === 'entity') return source.row === 'inventory';
    if (source.row === 'inventory') return target.row === 'worn' || target.row === 'room';
    if (source.row === 'worn') return target.row === 'inventory';
    if (source.row === 'room') return target.row === 'inventory';
    return false;
};

export const getValidObjectDropTarget = (source: ObjectDragSource, element: Element | null): ObjectDropTarget | null => {
    const target = getObjectDropTarget(element);
    if (isValidObjectDragTarget(source, target)) return target;
    const section = element?.closest('[data-object-drop-row]') ?? null;
    const sectionTarget = getObjectDropTarget(section);
    return isValidObjectDragTarget(source, sectionTarget) ? sectionTarget : null;
};

const getSingleObjectDragCommand = (source: ObjectDragItem, target: ObjectDropTarget): string | null => {
    if (target.type === 'container') return source.row === 'inventory' && !source.parentContainerNoun
        && source.itemId !== target.containerId ? `put ${source.noun} ${target.noun}` : null;
    if (source.parentContainerNoun) return target.type === 'row' && target.row === 'inventory'
        ? `get ${source.noun} ${source.parentContainerNoun}` : null;
    if (target.type === 'entity') return `give ${source.noun} ${target.noun}`;
    if (source.row === 'inventory' && target.row === 'worn' && target.slot === 'wielded') {
        return `wield ${source.noun}`;
    }
    if (source.row === 'inventory' && target.row === 'worn') return `wear ${source.noun}`;
    if (source.row === 'worn' && target.row === 'inventory') return `remove ${source.noun}`;
    if (source.row === 'inventory' && target.row === 'room') return `drop ${source.noun}`;
    if (source.row === 'room' && target.row === 'inventory') return `get ${source.noun}`;
    return null;
};

const isCompleteSourceLevel = (items: ObjectDragItem[], sourceLevelItemIds?: string[]): boolean => {
    if (!sourceLevelItemIds?.length || items.length !== sourceLevelItemIds.length) return false;
    const selectedIds = new Set(items.map(item => item.itemId).filter((id): id is string => Boolean(id)));
    return selectedIds.size === sourceLevelItemIds.length && sourceLevelItemIds.every(id => selectedIds.has(id));
};

export const getObjectDragCommands = (source: ObjectDragSource, target: ObjectDropTarget): string[] | null => {
    const items = source.selectedItems?.length ? source.selectedItems : [source];
    if (!items.every(item => isValidSingleObjectDragTarget(item, target))) return null;

    if (isCompleteSourceLevel(items, source.sourceLevelItemIds)) {
        if (target.type === 'row' && target.row === 'inventory'
            && items.every(item => item.row === 'room' && !item.parentContainerNoun)) return ['get all'];
        if (target.type === 'row' && target.row === 'inventory'
            && items.every(item => item.row === 'worn' && !item.parentContainerNoun)) return ['remove all'];
        if (target.type === 'row' && target.row === 'room'
            && items.every(item => item.row === 'inventory' && !item.parentContainerNoun)) return ['drop all'];
        if (target.type === 'row' && target.row === 'worn' && !target.slot
            && items.every(item => item.row === 'inventory' && !item.parentContainerNoun)) return ['wear all'];
    }

    if (target.type === 'row' && target.row === 'inventory' && items.every(item => item.parentContainerNoun)) {
        const containerNoun = items[0]?.parentContainerNoun;
        const containerId = items[0]?.parentContainerId;
        const sameContainer = Boolean(containerNoun) && items.every(item =>
            item.parentContainerNoun === containerNoun && item.parentContainerId === containerId);
        if (sameContainer && isCompleteSourceLevel(items, source.sourceLevelItemIds)) return [`get all ${containerNoun}`];
    }

    if (target.type === 'container' && items.every(item => item.row === 'inventory' && !item.parentContainerNoun)
        && isCompleteSourceLevel(items, source.sourceLevelItemIds)) {
        return [`put all ${target.noun}`];
    }

    return items.map(item => getSingleObjectDragCommand(item, target)).filter((command): command is string => Boolean(command));
};

export const getObjectDragCommand = (source: ObjectDragSource, target: ObjectDropTarget): string | null => {
    const commands = getObjectDragCommands(source, target);
    if (!commands?.length) return null;
    if (commands.length === 1) return commands[0]!;
    return `move ${commands.length} items`;
};
