/**
 * @file RoomEntityPicker.tsx
 * @description Compact picker for switching the active action context or room entity.
 */

import React from 'react';
import { Box, ChevronDown, Users } from 'lucide-react';
import type { RoomEntityMenuEntry } from '../../../objects/roomEntityMenuModel';

interface RoomEntityPickerProps {
    entries: RoomEntityMenuEntry[];
    contexts?: Array<{ id: 'room' | 'self'; label: string }>;
    currentContextId?: 'room' | 'self' | 'selected';
    currentEntityId?: string;
    currentContext?: string;
    currentLabel: string;
    prefix?: string;
    forceShow?: boolean;
    onSelectContext?: (context: 'room' | 'self') => void;
    onSelect: (entry: RoomEntityMenuEntry) => void;
}

export const RoomEntityPicker: React.FC<RoomEntityPickerProps> = ({
    entries,
    contexts = [],
    currentContextId,
    currentEntityId,
    currentContext,
    currentLabel,
    prefix,
    forceShow = false,
    onSelectContext,
    onSelect
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const menuId = `room-entity-menu-${React.useId().replace(/:/g, '')}`;
    const groups = [
        { id: 'characters', label: 'Characters', Icon: Users },
        { id: 'objects', label: 'Objects', Icon: Box }
    ] as const;

    React.useEffect(() => {
        if (!isOpen) return undefined;
        const closeOnOutsidePointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener('pointerdown', closeOnOutsidePointer);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePointer);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isOpen]);

    if (contexts.length === 0 && entries.length < (forceShow ? 1 : 2)) return <span className="room-entity-picker-current">{currentLabel}</span>;

    const isCurrent = (entry: RoomEntityMenuEntry) => (
        (currentEntityId && entry.id === currentEntityId)
        || (!currentEntityId && currentContext && entry.context.toLowerCase() === currentContext.toLowerCase())
    );

    return (
        <div className="room-entity-picker" ref={rootRef}>
            <span className="room-entity-picker-mobile-current">{prefix ? `${prefix}: ` : ''}{currentLabel}</span>
            <button
                ref={triggerRef}
                type="button"
                className="room-entity-picker-trigger"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={menuId}
                aria-label={`Current action target: ${currentLabel}. Switch action target or context`}
                title="Switch to Room, You, or another character or object"
                onPointerDown={event => event.stopPropagation()}
                onClick={event => {
                    event.stopPropagation();
                    setIsOpen(open => !open);
                }}
            >
                {prefix && <span className="room-entity-picker-prefix">{prefix}</span>}
                <span className="room-entity-picker-current">{currentLabel}</span>
                <span className="room-entity-picker-count">{entries.length}</span>
                <ChevronDown size={13} aria-hidden="true" />
            </button>
            {isOpen && (
                <div className="room-entity-picker-menu" id={menuId} role="listbox" aria-label="Action target">
                    {contexts.length > 0 && <div className="room-entity-picker-group" role="group" aria-label="Context">
                        <div className="room-entity-picker-group-label"><span>Context</span></div>
                        {contexts.map(context => {
                            const selected = currentContextId === context.id;
                            return <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className="room-entity-picker-option"
                                key={context.id}
                                onPointerDown={event => event.stopPropagation()}
                                onClick={event => {
                                    event.stopPropagation();
                                    setIsOpen(false);
                                    onSelectContext?.(context.id);
                                    triggerRef.current?.focus();
                                }}
                            >
                                <span>{context.label}</span>
                                {selected && <span className="room-entity-picker-selected">current</span>}
                            </button>;
                        })}
                    </div>}
                    {groups.map(({ id, label, Icon }) => {
                        const groupEntries = entries.filter(entry => entry.group === id);
                        if (groupEntries.length === 0) return null;
                        return (
                            <div className="room-entity-picker-group" key={id} role="group" aria-label={label}>
                                <div className="room-entity-picker-group-label">
                                    <Icon size={12} aria-hidden="true" />
                                    <span>{label}</span>
                                    <span className="room-entity-picker-group-count">{groupEntries.length}</span>
                                </div>
                                {groupEntries.map(entry => (
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={!!isCurrent(entry)}
                                        className="room-entity-picker-option"
                                        key={`${entry.id}:${entry.context}`}
                                        onPointerDown={event => event.stopPropagation()}
                                        onClick={event => {
                                            event.stopPropagation();
                                            setIsOpen(false);
                                            onSelect(entry);
                                            triggerRef.current?.focus();
                                        }}
                                    >
                                        <span>{entry.label}</span>
                                        {isCurrent(entry) && <span className="room-entity-picker-selected">current</span>}
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
