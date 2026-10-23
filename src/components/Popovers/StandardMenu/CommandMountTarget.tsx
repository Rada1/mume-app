/** @file CommandMountTarget.tsx — Adds an independent cargo disclosure beside a selectable mount. */
import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Pin } from 'lucide-react';
import type { GearSelectionCheckboxProps } from '../../../types';
import type { CommandActionTargetEntry } from '../../../objects/commandActionTargetModel';
import { useCommandMountContents } from '../../../hooks/useCommandMountContents';
import { GearItemLabel } from '../../GearItemLabel';
import { GearSelectionCheckbox } from '../../GearSelectionCheckbox';
import { CommandTargetKeyword } from './CommandTargetKeyword';
import { getBelowPopoverPlacement } from '../../../utils/belowPopoverPosition';

// --- Mount Row ---
interface CommandMountTargetProps {
    entry: CommandActionTargetEntry;
    children: React.ReactNode;
    currentEntityId?: string;
    onSelect: (entry: CommandActionTargetEntry) => void;
    onPreviewTarget?: (entry: CommandActionTargetEntry | null) => void;
    checkboxPropsForEntry: (entry: CommandActionTargetEntry, peers: CommandActionTargetEntry[]) => GearSelectionCheckboxProps | null;
    levelCheckboxPropsForEntries: (entries: CommandActionTargetEntry[], label: string, scope?: {
        section: 'room'; parentId?: string; parentNoun?: string;
    }) => GearSelectionCheckboxProps | null;
}
export const CommandMountTarget: React.FC<CommandMountTargetProps> = ({ entry, children, currentEntityId, onSelect, onPreviewTarget, checkboxPropsForEntry, levelCheckboxPropsForEntries }) => {
    const contents = useCommandMountContents(entry);
    const contentsId = React.useId();
    const pendingSelectAll = React.useRef(false);
    const toggleRef = React.useRef<HTMLButtonElement>(null);
    const hoverOpenTimer = React.useRef<number | null>(null);
    const hoverCloseTimer = React.useRef<number | null>(null);
    const [pinned, setPinned] = React.useState(false);
    const [hovered, setHovered] = React.useState(false);
    const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties>({});
    const targetRef = React.useRef<HTMLDivElement>(null);
    const popoverRef = React.useRef<HTMLDivElement>(null);
    const isOpen = pinned || hovered || contents.open;
    const portalRoot = targetRef.current?.closest('.app-container') ?? (typeof document === 'undefined' ? null : document.body);
    const cargoScope = { section: 'room' as const, parentId: contents.containerId, parentNoun: entry.context };
    const cargoLabel = `${entry.label} contents`;
    const selectAllProps = levelCheckboxPropsForEntries(contents.targets, cargoLabel, cargoScope);
    // --- Logic Section ---
    const clearHoverCloseTimer = () => {
        if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
        hoverCloseTimer.current = null;
    };
    const clearHoverOpenTimer = () => {
        if (hoverOpenTimer.current) window.clearTimeout(hoverOpenTimer.current);
        hoverOpenTimer.current = null;
    };
    const keepOpenOnHover = () => {
        clearHoverOpenTimer();
        clearHoverCloseTimer();
        setHovered(true);
        if (!contents.open) contents.toggle();
    };
    const scheduleHoverOpen = () => {
        clearHoverCloseTimer();
        clearHoverOpenTimer();
        if (isOpen) {
            setHovered(true);
            if (!contents.open) contents.toggle();
            return;
        }
        hoverOpenTimer.current = window.setTimeout(() => {
            hoverOpenTimer.current = null;
            setHovered(true);
            if (!contents.open) contents.toggle();
        }, 150);
    };
    const scheduleHoverClose = () => {
        clearHoverOpenTimer();
        clearHoverCloseTimer();
        if (!hovered) return;
        hoverCloseTimer.current = window.setTimeout(() => {
            hoverCloseTimer.current = null;
            setHovered(false);
            if (!pinned && contents.open) contents.toggle();
        }, 180);
    };
    React.useEffect(() => {
        if (!isOpen) return;
        const commandColumn = targetRef.current?.closest<HTMLElement>('.unified-command-panel')
            ?.querySelector<HTMLElement>('.unified-command-column');
        if (!commandColumn) return;
        const handleCommandColumnEnter = () => {
            clearHoverCloseTimer();
            setHovered(true);
        };
        const handleCommandColumnLeave = (event: MouseEvent) => {
            if (event.relatedTarget instanceof Node
                && (popoverRef.current?.contains(event.relatedTarget) || targetRef.current?.contains(event.relatedTarget))) return;
            scheduleHoverClose();
        };
        commandColumn.addEventListener('mouseenter', handleCommandColumnEnter);
        commandColumn.addEventListener('mouseleave', handleCommandColumnLeave);
        return () => {
            commandColumn.removeEventListener('mouseenter', handleCommandColumnEnter);
            commandColumn.removeEventListener('mouseleave', handleCommandColumnLeave);
        };
    }, [isOpen]);
    const handleTargetMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (event.relatedTarget instanceof Node && popoverRef.current?.contains(event.relatedTarget)) return;
        scheduleHoverClose();
    };
    const handlePopoverMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.relatedTarget instanceof Node && toggleRef.current?.contains(event.relatedTarget)) return;
        scheduleHoverClose();
    };
    const openFromToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        clearHoverOpenTimer();
        clearHoverCloseTimer();
        setHovered(true);
        if (!contents.open) contents.toggle();
    };
    const togglePinned = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        clearHoverCloseTimer();
        setPinned(current => !current);
    };
    React.useEffect(() => () => {
        clearHoverOpenTimer();
        clearHoverCloseTimer();
    }, []);
    React.useEffect(() => {
        if (!pendingSelectAll.current || contents.loading) return;
        pendingSelectAll.current = false;
        if (contents.targets.length && selectAllProps && !selectAllProps.disabled) selectAllProps.onChange();
    }, [contents.loading, contents.targets, selectAllProps]);
    React.useEffect(() => { pendingSelectAll.current = false; }, [entry.id, entry.context, contents.containerId]);
    React.useLayoutEffect(() => {
        const target = targetRef.current;
        const popover = popoverRef.current;
        if (!isOpen || !target || !popover) return;

        const updatePlacement = () => {
            const targetRect = target.getBoundingClientRect();
            const toggle = toggleRef.current;
            if (!toggle) return;
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
            setPopoverStyle(getBelowPopoverPlacement(toggle.getBoundingClientRect(), popover.getBoundingClientRect(),
                viewportWidth, viewportHeight));
        };

        updatePlacement();
        window.addEventListener('resize', updatePlacement);
        window.addEventListener('scroll', updatePlacement, true);
        return () => {
            window.removeEventListener('resize', updatePlacement);
            window.removeEventListener('scroll', updatePlacement, true);
        };
    }, [contents.loading, contents.targets.length, isOpen]);
    if (!contents.isMount) {
        const reserveChevronSpace = entry.scope === 'room' && entry.group !== 'objects';
        if (reserveChevronSpace && React.isValidElement<{ className?: string }>(children)) {
            return React.cloneElement(children, {
                className: `${children.props.className ?? ''} command-action-target-row--reserve-chevron`.trim()
            });
        }
        return <>{children}</>;
    }
    const mountCheckboxProps: GearSelectionCheckboxProps = selectAllProps && contents.targets.length
        ? selectAllProps
        : {
            checked: false,
            disabled: Boolean(selectAllProps?.disabled) || !contents.loading,
            label: `Select all ${cargoLabel}`,
            onChange: () => {
                if (!contents.loading || selectAllProps?.disabled) return;
                pendingSelectAll.current = true;
                if (!contents.open) contents.toggle();
            }
        };
    return <div ref={targetRef} className="command-mount-target">
        <div className="command-mount-target-heading">
            {children}
            <button ref={toggleRef} type="button" className="command-mount-contents-toggle"
                aria-label={`Show ${entry.label} contents`}
                aria-expanded={isOpen} aria-controls={contentsId}
                data-pinned={pinned || undefined}
                title={`Hover to preview ${entry.label} contents`}
                onMouseEnter={scheduleHoverOpen} onMouseLeave={handleTargetMouseLeave}
                onClick={openFromToggle}
                onPointerDown={event => event.stopPropagation()}>
                <ChevronRight size={11} aria-hidden="true" />
            </button>
        </div>
        {isOpen && portalRoot && createPortal(
            <div ref={popoverRef} id={contentsId} className="command-mount-contents command-mount-popover"
            style={popoverStyle}
            aria-label={`${entry.label} contents`} aria-busy={contents.loading}
            onMouseEnter={keepOpenOnHover} onMouseLeave={handlePopoverMouseLeave}>
            <div className="command-submenu-toolbar">
                <button type="button" className="command-submenu-pin-toggle" aria-label={pinned ? 'Unpin menu open' : 'Pin menu open'}
                    aria-pressed={pinned} data-pinned={pinned || undefined}
                    title={pinned ? 'Unpin menu open' : 'Pin menu open'} onClick={togglePinned}
                    onPointerDown={event => event.stopPropagation()}>
                    <Pin size={13} aria-hidden="true" />
                </button>
            </div>
            {(contents.loading || contents.targets.length > 0) && <div className="command-mount-select-all-row">
                <span>Select all</span>
                <GearSelectionCheckbox {...mountCheckboxProps} />
            </div>}
            {contents.loading ? <p className="command-action-target-empty">Loading contents…</p>
                : contents.targets.length ? contents.targets.map(item => {
                    const checkbox = checkboxPropsForEntry(item, contents.targets);
                    return <div key={item.id} className="command-action-target-row command-mount-content-row"
                        data-selected={checkbox?.checked || undefined}>
                        <button type="button" className="command-action-target-option command-mount-content-item"
                            aria-current={item.id === currentEntityId ? 'true' : undefined}
                            onMouseEnter={() => onPreviewTarget?.(item)}
                            onPointerDown={event => event.stopPropagation()} onClick={() => onSelect(item)}>
                            {item.gearRow && <><GearItemLabel row={item.gearRow} category={item.category} /><CommandTargetKeyword keyword={item.keyword} /></>}
                        </button>
                        {checkbox && <GearSelectionCheckbox {...checkbox} />}
                    </div>;
                }) : <p className="command-action-target-empty">Nothing carried.</p>}
        </div>, portalRoot
        )}
    </div>;
};
