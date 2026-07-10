/**
 * @file ShaperContextHelpButton.tsx
 * @description Inline contextual guide popover for Shaper editor controls.
 */

import { useMemo, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { getShaperContextHelp, type ShaperContextHelpTopic } from '../model/shaperContextHelp';
import './ShaperContextHelpButton.css';

interface ShaperContextHelpButtonProps {
    topic: ShaperContextHelpTopic;
    label?: string;
}

// --- Component Section ---
export const ShaperContextHelpButton: React.FC<ShaperContextHelpButtonProps> = ({
    topic,
    label = 'Help'
}) => {
    const [open, setOpen] = useState(false);
    const help = useMemo(() => getShaperContextHelp(topic), [topic]);

    return (
        <span className="shaper-context-help">
            <button
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
            {open && (
                <span
                    className="shaper-context-help-popover"
                    role="dialog"
                    aria-label={help.title}
                    onClick={event => event.stopPropagation()}
                >
                    <span className="shaper-context-help-head">
                        <strong>{help.title}</strong>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close help">
                            <X size={14} />
                        </button>
                    </span>
                    <pre>{help.body}</pre>
                </span>
            )}
        </span>
    );
};
