/**
 * @file InlineTraitActionGroup.tsx
 * @description Renders one inline-action trait and its optional class subdivisions.
 */

import React from 'react';
import { CustomButton } from '../../../types';
import { getInlineTraitTextColor, getSwipeCommandTextColor } from '../../../utils/swipeCommandColors';

// --- Logic Section ---

interface InlineTraitActionGroupProps {
    section: { key: string; label: string };
    buttons: CustomButton[];
    inspectionCommands: Array<'look' | 'consider'>;
    targetContext: string | null;
    requestInspection: (kind: 'look' | 'consider') => void;
    renderButton: (button: CustomButton) => React.ReactNode;
}

const FAMILY_TRAITS = new Set([
    'trait-offense', 'trait-retreat', 'trait-control', 'trait-buffs', 'trait-healing',
    'trait-support', 'trait-utility', 'trait-door-actions', 'trait-object-magic', 'trait-resurrection', 'trait-mount', 'trait-social', 'trait-communication'
]);

export const InlineTraitActionGroup: React.FC<InlineTraitActionGroupProps> = ({
    section,
    buttons,
    inspectionCommands,
    targetContext,
    requestInspection,
    renderButton
}) => {
    const actionCount = buttons.length + inspectionCommands.length;
    const shouldStartCollapsed = actionCount > 6 && section.key !== 'trait-communication';
    const [isCollapsed, setIsCollapsed] = React.useState(shouldStartCollapsed);
    const hasUserToggledCollapse = React.useRef(false);
    const contentId = `inline-trait-actions-${React.useId().replace(/:/g, '')}`;
    const traitColor = getInlineTraitTextColor(section.key);
    const hasSubgroups = buttons.some(button => button.inlineSubgroup);
    const subgroupMap = new Map<string, CustomButton[]>();

    React.useEffect(() => {
        if (!hasUserToggledCollapse.current) setIsCollapsed(shouldStartCollapsed);
    }, [shouldStartCollapsed]);

    buttons.forEach(button => {
        const label = hasSubgroups ? button.inlineSubgroup || 'General' : '';
        subgroupMap.set(label, [...(subgroupMap.get(label) || []), button]);
    });

    return (
        <div
            className={`inline-action-group is-trait-group${FAMILY_TRAITS.has(section.key) ? ' is-action-family' : ''}`}
            style={{ '--inline-trait-color': traitColor } as React.CSSProperties}
        >
            <button
                type="button"
                className="inline-action-group-toggle"
                aria-expanded={!isCollapsed}
                aria-controls={contentId}
                onPointerDown={event => event.stopPropagation()}
                onClick={event => {
                    event.stopPropagation();
                    hasUserToggledCollapse.current = true;
                    setIsCollapsed(collapsed => !collapsed);
                }}
            >
                <span className="inline-action-group-label">{section.label}</span>
                <span className="inline-action-group-count" aria-label={`${actionCount} actions`}>{actionCount}</span>
                <span className={`inline-action-group-chevron${isCollapsed ? ' is-collapsed' : ''}`} aria-hidden="true">⌄</span>
            </button>
            <div className="inline-action-list" id={contentId} hidden={isCollapsed}>
                {inspectionCommands.map(kind => (
                    <button
                        key={`inspect-${kind}`}
                        type="button"
                        className="terminal-inspect-row"
                        onPointerDown={event => event.stopPropagation()}
                        onClick={() => requestInspection(kind)}
                    >
                        <span style={{ color: getSwipeCommandTextColor(kind) || traitColor }}>{kind}</span>
                        <span>&lt;{kind === 'look' ? 'look' : 'con'} {targetContext}&gt;</span>
                    </button>
                ))}
                {Array.from(subgroupMap.entries()).map(([label, groupButtons]) => (
                    <div className="inline-action-subgroup" key={label || section.key}>
                        {hasSubgroups && <span className="inline-action-subgroup-label">{label}</span>}
                        {groupButtons.map(renderButton)}
                    </div>
                ))}
            </div>
        </div>
    );
};
