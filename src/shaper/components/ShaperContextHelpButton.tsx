/**
 * @file ShaperContextHelpButton.tsx
 * @description Inline contextual guide popover for Shaper editor controls.
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import { getShaperContextHelp, type ShaperContextHelpTopic } from '../model/shaperContextHelp';
import './ShaperContextHelpButton.css';

interface ShaperContextHelpButtonProps {
    topic: ShaperContextHelpTopic;
    label?: string;
}

interface HelpPopoverPosition {
    left: number;
    top: number;
    width: number;
    maxHeight: number;
}

const viewportMargin = 12;
const popoverGap = 6;
const preferredPopoverWidth = 520;

const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

// --- Component Section ---
export const ShaperContextHelpButton: React.FC<ShaperContextHelpButtonProps> = ({
    topic,
    label = 'Help'
}) => {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<HelpPopoverPosition | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const help = useMemo(() => getShaperContextHelp(topic), [topic]);
    const popoverStyle: CSSProperties | undefined = position
        ? {
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight
        }
        : undefined;

    useLayoutEffect(() => {
        if (!open) return;

        const updatePosition = () => {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const width = Math.min(preferredPopoverWidth, viewportWidth - viewportMargin * 2);
            const spaceBelow = viewportHeight - rect.bottom - viewportMargin;
            const spaceAbove = rect.top - viewportMargin;
            const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(180, placeAbove ? spaceAbove - popoverGap : spaceBelow - popoverGap);
            const top = placeAbove
                ? Math.max(viewportMargin, rect.top - popoverGap - maxHeight)
                : Math.min(rect.bottom + popoverGap, viewportHeight - viewportMargin - maxHeight);
            const left = clamp(rect.left, viewportMargin, viewportWidth - viewportMargin - width);

            setPosition({ left, top, width, maxHeight });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open]);

    const popover = open && position ? createPortal(
        <span
            className="shaper-context-help-popover"
            role="dialog"
            aria-label={help.title}
            style={popoverStyle}
            onClick={event => event.stopPropagation()}
        >
            <span className="shaper-context-help-head">
                <strong>{help.title}</strong>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close help">
                    <X size={14} />
                </button>
            </span>
            <pre>{help.body}</pre>
        </span>,
        document.body
    ) : null;

    return (
        <span className="shaper-context-help">
            <button
                ref={triggerRef}
                type="button"
                className="shaper-context-help-trigger"
                onClick={event => {
                    event.stopPropagation();
                    setOpen(value => !value);
                }}
                title={`Show ${help.title} help`}
                aria-expanded={open}
            >
                <HelpCircle size={14} />
                <span>{label}</span>
            </button>
            {popover}
        </span>
    );
};
