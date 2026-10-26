/**
 * @file RoomEntityPicker.tsx
 * @description Persistent target column for inline action menus.
 */

import React from 'react';
import { Box, ChevronDown, Package, Shield, User, Users } from 'lucide-react';
import type { RoomEntityMenuEntry } from '../../../objects/roomEntityMenuModel';

interface RoomEntityPickerProps {
    entries: RoomEntityMenuEntry[];
    currentEntityId?: string;
    currentContext?: string;
    currentCategory?: string;
    currentTarget?: string | null;
    onSelect: (entry: RoomEntityMenuEntry) => void;
}

const groups = [
    { id: 'characters', label: 'Characters', Icon: Users },
    { id: 'objects', label: 'Room Objects', Icon: Box },
    { id: 'self', label: 'Character', Icon: User },
    { id: 'inventory', label: 'Inventory', Icon: Package },
    { id: 'equipment', label: 'Character Equipment', Icon: Shield }
] as const;

const matchesContext = (entry: RoomEntityMenuEntry, context?: string) => (
    !!context && [entry.context, entry.keyword, entry.label]
        .some(value => value.trim().toLowerCase() === context.trim().toLowerCase())
);

export const RoomEntityPicker: React.FC<RoomEntityPickerProps> = ({
    entries,
    currentEntityId,
    currentContext,
    currentCategory,
    currentTarget,
    onSelect
}) => {
    const exactActiveEntry = currentEntityId
        ? entries.find(entry => entry.id === currentEntityId)
        : undefined;
    const contextActiveEntry = entries.find(entry => matchesContext(entry, currentContext)
        && (!currentCategory || entry.category === currentCategory));
    const activeEntry = exactActiveEntry || contextActiveEntry;
    const categoryGroup = currentCategory === 'cat-worn-object'
        ? 'equipment'
        : currentCategory === 'cat-inventory-object'
            ? 'inventory'
            : currentCategory === 'cat-room-object'
                ? 'objects'
                : currentCategory?.startsWith('cat-') && currentCategory !== 'cat-container-item'
                    ? (currentContext?.trim().toLowerCase() === 'self' ? 'self' : 'characters')
                    : null;
    const initialGroup = exactActiveEntry?.group
        || categoryGroup
        || contextActiveEntry?.group
        || groups.find(group => entries.some(entry => entry.group === group.id))?.id
        || null;
    const [expandedGroup, setExpandedGroup] = React.useState<string | null>(initialGroup);

    React.useEffect(() => {
        setExpandedGroup(initialGroup);
    }, [activeEntry?.id, activeEntry?.context, initialGroup]);

    const isActive = (entry: RoomEntityMenuEntry) => (
        entry === exactActiveEntry
        || (!exactActiveEntry && entry === contextActiveEntry)
    );

    return (
        <aside className="inline-target-pane" aria-label="Choose a target">
            <div className="inline-target-pane-heading">
                <span>Targets</span>
                <span className="inline-target-pane-count">{entries.length}</span>
            </div>
            <div className="inline-target-list" role="listbox" aria-label="Room and personal targets">
                {groups.map(({ id, label, Icon }) => {
                    const groupEntries = entries.filter(entry => entry.group === id);
                    if (!groupEntries.length) return null;
                    const isExpanded = expandedGroup === id;
                    return (
                        <section className="inline-target-group" key={id} role="group" aria-label={label}>
                            <button
                                type="button"
                                className="inline-target-group-heading inline-target-group-toggle"
                                aria-expanded={isExpanded}
                                aria-controls={`inline-target-content-${id}`}
                                data-expanded={isExpanded || undefined}
                                onPointerDown={event => event.stopPropagation()}
                                onClick={event => {
                                    event.stopPropagation();
                                    setExpandedGroup(current => current === id ? null : id);
                                }}
                            >
                                <Icon size={12} aria-hidden="true" />
                                <span>{label}</span>
                                <ChevronDown className="inline-target-group-chevron" size={12} aria-hidden="true" />
                            </button>
                            {isExpanded && <div id={`inline-target-content-${id}`} className="inline-target-group-options">
                                {groupEntries.map(entry => {
                                    const active = isActive(entry);
                                    const selectedTarget = entry.isCurrentTarget
                                        || (!!currentTarget && matchesContext(entry, currentTarget));
                                    return (
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            aria-current={selectedTarget ? 'true' : undefined}
                                            className="inline-target-option"
                                            data-active={active || undefined}
                                            data-current-target={selectedTarget || undefined}
                                            key={`${entry.id}:${entry.context}`}
                                            onPointerDown={event => event.stopPropagation()}
                                            onClick={event => {
                                                event.stopPropagation();
                                                onSelect(entry);
                                            }}
                                            title={entry.isOutOfRoom ? `${entry.label} (current target, not in this room)` : entry.label}
                                        >
                                            <span className="inline-target-option-label">{entry.label}</span>
                                            {selectedTarget && <span className="inline-target-badge">Target</span>}
                                            {active && !selectedTarget && <span className="inline-target-badge">Selected</span>}
                                        </button>
                                    );
                                })}
                            </div>}
                        </section>
                    );
                })}
                {entries.length === 0 && <div className="inline-target-empty">No available targets</div>}
            </div>
        </aside>
    );
};
