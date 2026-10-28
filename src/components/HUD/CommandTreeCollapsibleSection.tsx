/** @file CommandTreeCollapsibleSection.tsx — Expandable section for command menu branches. */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useCommandSectionExpansion } from '../../hooks/useCommandSectionExpansion';
import { CommandTargetMenuContext } from '../../context/CommandTargetMenuContext';

// --- Render Section ---
type SectionProps = {
    label: string;
    children: React.ReactNode;
    ariaLabel?: string;
    className?: string;
};

export const CommandTreeCollapsibleSection = (props: SectionProps) => {
    const flatTargets = React.useContext(CommandTargetMenuContext);
    if (flatTargets) return <section className={`command-tree-section${props.className ? ` ${props.className}` : ''}`}
        aria-label={props.ariaLabel || props.label}>
        <div className="command-tree-section-content">{props.children}</div>
    </section>;
    return <ExpandableSection {...props}/>;
};

// --- Expandable Command and Desktop Section ---
const ExpandableSection = ({label, children, ariaLabel, className = ''}: SectionProps) => {
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
