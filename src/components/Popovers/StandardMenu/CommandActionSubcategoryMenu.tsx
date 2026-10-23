/**
 * @file CommandActionSubcategoryMenu.tsx
 * @description Horizontal, hoverable subcategories shared by target groups.
 */
import React from 'react';

// --- Type Section ---
export interface CommandActionSubcategory {
    id: string;
    label: string;
    count?: number;
    showWhenEmpty?: boolean;
    content: React.ReactNode;
    actions?: React.ReactNode;
    dropProps?: {
        'data-object-drop-row'?: 'room' | 'worn' | 'inventory';
        'data-drop-active'?: boolean;
    };
}

interface SubcategoryRequest {
    id: string;
    requestId: number;
}

interface CommandActionSubcategoryMenuProps {
    label: string;
    sections: CommandActionSubcategory[];
    onActiveSectionChange?: (sectionId: string | null) => void;
    request?: SubcategoryRequest | null;
}

// --- Component Section ---
export const CommandActionSubcategoryMenu: React.FC<CommandActionSubcategoryMenuProps> = ({ label, sections, onActiveSectionChange, request }) => {
    const [hoveredSection, setHoveredSection] = React.useState<string | null>(null);
    const [pinnedSection, setPinnedSection] = React.useState<string | null>(null);
    const handledRequestId = React.useRef(0);
    const visibleSections = sections.filter(section => section.count !== 0 || section.showWhenEmpty);
    const requestedSection = hoveredSection ?? pinnedSection;
    const activeSection = visibleSections.find(section => section.id === requestedSection) ?? visibleSections[0];
    const idPrefix = React.useId();

    // --- Logic Section ---
    React.useEffect(() => {
        if (!request || handledRequestId.current === request.requestId) return;
        handledRequestId.current = request.requestId;
        setHoveredSection(null);
        setPinnedSection(request.id);
    }, [request]);

    React.useEffect(() => {
        onActiveSectionChange?.(activeSection?.id ?? null);
    }, [activeSection?.id, onActiveSectionChange]);

    if (!visibleSections.length) return null;
    return <div className="command-action-subcategory-menu">
        <nav className="command-action-target-nav command-action-subcategory-nav" aria-label={label} role="tablist">
            {visibleSections.map(section => {
                const isActive = activeSection?.id === section.id;
                const isPinned = pinnedSection === section.id;
                const tabId = `target-tab-${idPrefix}-${section.id}`;
                return <button key={section.id} id={tabId} type="button" role="tab"
                    className={`command-action-target-tab command-action-subcategory-tab${isActive ? ' is-active' : ''}${isPinned ? ' is-pinned' : ''}`}
                    data-active={isActive || undefined} data-pinned={isPinned || undefined}
                    aria-label={section.label} aria-selected={isActive}
                    aria-controls={`target-panel-${idPrefix}-${section.id}`}
                    title={isPinned ? `${section.label} (Pinned - click to unpin)` : `${section.label} (Click to pin)`}
                    {...section.dropProps}
                    onMouseEnter={() => setHoveredSection(section.id)}
                    onClick={() => setPinnedSection(current => current === section.id ? null : section.id)}>
                    <span>{section.label}</span>
                    {section.count !== undefined && <small>{section.count}</small>}
                </button>;
            })}
        </nav>
        {visibleSections.map(section => {
            const isActive = activeSection?.id === section.id;
            return <section key={section.id} id={`target-panel-${idPrefix}-${section.id}`}
                className="command-action-subcategory-panel" data-section={section.id}
                role="tabpanel" aria-labelledby={`target-tab-${idPrefix}-${section.id}`}
                hidden={!isActive} {...section.dropProps}>
                <div className="command-action-subcategory-heading">
                    <span>{section.label}</span>{section.actions}
                </div>
                {section.content}
            </section>;
        })}
    </div>;
};
