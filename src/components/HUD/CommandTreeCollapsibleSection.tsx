/** @file CommandTreeCollapsibleSection.tsx — Expandable section for command menu branches. */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useCommandSectionExpansion } from '../../hooks/useCommandSectionExpansion';

// --- Render Section ---
export const CommandTreeCollapsibleSection = ({label, children, ariaLabel, className = ''}: {
    label: string;
    children: React.ReactNode;
    ariaLabel?: string;
    className?: string;
}) => {
    const { sectionRef, open, toggle } = useCommandSectionExpansion(ariaLabel || label);
    const contentId = React.useId();
    return <section ref={sectionRef} className={`command-tree-section${className ? ` ${className}` : ''}`} aria-label={ariaLabel || label}>
        <button type="button" className="command-tree-section-heading" aria-expanded={open}
            aria-controls={contentId} onClick={toggle}>
            <span className="command-tree-section-heading-label">{label}</span>
            <ChevronDown size={12} aria-hidden="true" className={`command-tree-section-chevron${open ? ' is-open' : ''}`}/>
        </button>
        <div id={contentId} className="command-tree-section-content" hidden={!open}>
            {children}
        </div>
    </section>;
};
