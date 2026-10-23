/**
 * @file CommandActionYouContents.tsx
 * @description Selectable You row with hoverable inventory, equipment, and practice contents.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Pin } from 'lucide-react';
import { CommandActionSubcategoryMenu, type CommandActionSubcategory } from './CommandActionSubcategoryMenu';
import { getBelowPopoverPlacement } from '../../../utils/belowPopoverPosition';

// --- Type Section ---
interface CommandActionYouContentsProps {
    target: React.ReactNode;
    sections: CommandActionSubcategory[];
    onActiveSectionChange: (sectionId: string | null) => void;
    onOpenChange: (open: boolean) => void;
    request?: { id: string; requestId: number } | null;
}

// --- Component Section ---
export const CommandActionYouContents: React.FC<CommandActionYouContentsProps> = ({
    target, sections, onActiveSectionChange, onOpenChange, request
}) => {
    const targetRef = React.useRef<HTMLDivElement>(null);
    const toggleRef = React.useRef<HTMLButtonElement>(null);
    const popoverRef = React.useRef<HTMLDivElement>(null);
    const handledRequestId = React.useRef(0);
    const hoverOpenTimer = React.useRef<number | null>(null);
    const hoverCloseTimer = React.useRef<number | null>(null);
    const [hovered, setHovered] = React.useState(false);
    const [pinned, setPinned] = React.useState(false);
    const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties>({});
    const isOpen = hovered || pinned;
    const sectionSignature = sections.map(section => `${section.id}:${section.count ?? ''}`).join('|');
    const portalRoot = targetRef.current?.closest('.app-container') ?? (typeof document === 'undefined' ? null : document.body);

    // --- Logic Section ---
    const clearHoverOpenTimer = () => {
        if (hoverOpenTimer.current) window.clearTimeout(hoverOpenTimer.current);
        hoverOpenTimer.current = null;
    };
    const clearHoverCloseTimer = () => {
        if (hoverCloseTimer.current) window.clearTimeout(hoverCloseTimer.current);
        hoverCloseTimer.current = null;
    };
    React.useEffect(() => {
        return () => {
            clearHoverOpenTimer();
            clearHoverCloseTimer();
        };
    }, []);

    React.useEffect(() => {
        if (!request || handledRequestId.current === request.requestId) return;
        handledRequestId.current = request.requestId;
        clearHoverOpenTimer();
        clearHoverCloseTimer();
        setPinned(true);
        onOpenChange(true);
    }, [onOpenChange, request]);

    React.useLayoutEffect(() => {
        const targetElement = targetRef.current;
        const popover = popoverRef.current;
        if (!isOpen || !targetElement || !popover) return;

        const updatePlacement = () => {
            const targetRect = targetElement.getBoundingClientRect();
            const toggleElement = toggleRef.current;
            if (!toggleElement) return;
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
            setPopoverStyle(getBelowPopoverPlacement(toggleElement.getBoundingClientRect(), popover.getBoundingClientRect(),
                viewportWidth, viewportHeight));
        };

        updatePlacement();
        window.addEventListener('resize', updatePlacement);
        window.addEventListener('scroll', updatePlacement, true);
        return () => {
            window.removeEventListener('resize', updatePlacement);
            window.removeEventListener('scroll', updatePlacement, true);
        };
    }, [isOpen, sectionSignature]);

    const handlePopoverMouseEnter = () => {
        clearHoverOpenTimer();
        clearHoverCloseTimer();
        setHovered(true);
        onOpenChange(true);
    };
    const handleTargetMouseEnter = () => {
        clearHoverCloseTimer();
        clearHoverOpenTimer();
        if (isOpen) {
            setHovered(true);
            onOpenChange(true);
            return;
        }
        hoverOpenTimer.current = window.setTimeout(() => {
            hoverOpenTimer.current = null;
            setHovered(true);
            onOpenChange(true);
        }, 150);
    };
    const scheduleClose = () => {
        clearHoverOpenTimer();
        clearHoverCloseTimer();
        if (!hovered) return;
        hoverCloseTimer.current = window.setTimeout(() => {
            hoverCloseTimer.current = null;
            setHovered(false);
            if (!pinned) onOpenChange(false);
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
            onOpenChange(true);
        };
        const handleCommandColumnLeave = (event: MouseEvent) => {
            if (event.relatedTarget instanceof Node
                && (popoverRef.current?.contains(event.relatedTarget) || targetRef.current?.contains(event.relatedTarget))) return;
            scheduleClose();
        };
        commandColumn.addEventListener('mouseenter', handleCommandColumnEnter);
        commandColumn.addEventListener('mouseleave', handleCommandColumnLeave);
        return () => {
            commandColumn.removeEventListener('mouseenter', handleCommandColumnEnter);
            commandColumn.removeEventListener('mouseleave', handleCommandColumnLeave);
        };
    }, [isOpen, onOpenChange]);
    const handleTargetMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (event.relatedTarget instanceof Node && popoverRef.current?.contains(event.relatedTarget)) return;
        scheduleClose();
    };
    const handlePopoverMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.relatedTarget instanceof Node && toggleRef.current?.contains(event.relatedTarget)) return;
        scheduleClose();
    };
    const openFromToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        clearHoverOpenTimer();
        clearHoverCloseTimer();
        setHovered(true);
        onOpenChange(true);
    };
    const togglePinned = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        clearHoverCloseTimer();
        const nextPinned = !pinned;
        setPinned(nextPinned);
        onOpenChange(nextPinned || hovered);
    };

    return <div ref={targetRef} className="command-action-you-target">
        <div className="command-action-you-heading">
            {target}
            <button ref={toggleRef} type="button" className="command-mount-contents-toggle command-action-you-toggle"
                aria-label={isOpen ? 'You inventory and equipment menu' : 'Open You inventory and equipment'}
                aria-expanded={isOpen} data-pinned={pinned || undefined}
                title="Hover to preview You inventory and equipment"
                onMouseEnter={handleTargetMouseEnter} onMouseLeave={handleTargetMouseLeave} onClick={openFromToggle}
                onPointerDown={event => event.stopPropagation()}>
                <ChevronRight size={11} aria-hidden="true" />
            </button>
        </div>
        {isOpen && portalRoot && createPortal(
            <div ref={popoverRef} className="command-action-you-popover"
                style={popoverStyle} aria-label="You inventory and equipment"
                onMouseEnter={handlePopoverMouseEnter} onMouseLeave={handlePopoverMouseLeave}>
                <div className="command-submenu-toolbar">
                    <button type="button" className="command-submenu-pin-toggle" aria-label={pinned ? 'Unpin menu open' : 'Pin menu open'}
                        aria-pressed={pinned} data-pinned={pinned || undefined}
                        title={pinned ? 'Unpin menu open' : 'Pin menu open'} onClick={togglePinned}
                        onPointerDown={event => event.stopPropagation()}>
                        <Pin size={13} aria-hidden="true" />
                    </button>
                </div>
                <CommandActionSubcategoryMenu label="Your inventory and equipment" sections={sections}
                    onActiveSectionChange={onActiveSectionChange} request={request} />
            </div>, portalRoot
        )}
    </div>;
};
