/**
 * @file InlineTraitActionGroup.tsx
 * @description Renders one inline-action trait and its optional class subdivisions.
 */

import React from 'react';
import { CustomButton } from '../../../types';
import { getInlineTraitTextColor, getSwipeCommandTextColor } from '../../../utils/swipeCommandColors';
import { InlineLookAction } from './InlineLookAction';
import { InlineGroupAction } from './InlineGroupAction';
import type { InlineCommandDisplayParts } from './inlineCommandDisplay';

// --- Logic Section ---

interface InlineTraitActionGroupProps {
    section: { key: string; label: string };
    buttons: CustomButton[];
    inspectionCommands: Array<'look' | 'consider'>;
    requestInspection: (kind: 'look' | 'consider', lookIn?: boolean) => void;
    lookInAvailable?: boolean;
    lookInSelected?: boolean;
    onToggleLookIn?: () => void;
    transferSelected?: boolean;
    onToggleTransfer?: () => void;
    targetContext?: string;
    renderButton: (button: CustomButton, displayParts?: InlineCommandDisplayParts) => React.ReactNode;
}

const FAMILY_TRAITS = new Set([
    'trait-combat', 'trait-mage', 'trait-warrior', 'trait-ranger', 'trait-thief', 'trait-cleric',
    'trait-offense', 'trait-retreat', 'trait-control', 'trait-buffs', 'trait-healing',
    'trait-support', 'trait-utility', 'trait-door-actions', 'trait-object-magic', 'trait-resurrection', 'trait-mount', 'trait-social', 'trait-communication'
]);
const CLASS_TRAITS = new Set(['trait-mage', 'trait-warrior', 'trait-ranger', 'trait-thief', 'trait-cleric']);

export const InlineTraitActionGroup: React.FC<InlineTraitActionGroupProps> = ({
    section,
    buttons,
    inspectionCommands,
    requestInspection,
    lookInAvailable = false,
    lookInSelected = false,
    onToggleLookIn,
    transferSelected = false,
    onToggleTransfer,
    targetContext,
    renderButton
}) => {
    const actionCount = buttons.length + inspectionCommands.length;
    const shouldStartCollapsed = actionCount > 6 && section.key !== 'trait-communication';
    const [isCollapsed, setIsCollapsed] = React.useState(shouldStartCollapsed);
    const hasUserToggledCollapse = React.useRef(false);
    const contentId = `inline-trait-actions-${React.useId().replace(/:/g, '')}`;
    const traitColor = getInlineTraitTextColor(section.key);
    const hasSubgroups = !CLASS_TRAITS.has(section.key) && buttons.some(button => button.inlineSubgroup);
    const groupButton = section.key === 'trait-group' ? buttons.find(button => button.id === 'btn-group') : undefined;
    const subgroupMap = new Map<string, CustomButton[]>();

    React.useEffect(() => {
        if (!hasUserToggledCollapse.current) setIsCollapsed(shouldStartCollapsed);
    }, [shouldStartCollapsed]);

    buttons.forEach(button => {
        if (section.key === 'trait-group' && (button.id === 'btn-group' || button.id === 'btn-group-transfer')) return;
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
                {groupButton && targetContext && onToggleTransfer && <div className="inline-action-subgroup">
                    <InlineGroupAction button={groupButton} transferSelected={transferSelected}
                        targetContext={targetContext} onToggleTransfer={onToggleTransfer}
                        renderButton={renderButton} />
                </div>}
                {inspectionCommands.length > 0 && <div className={`inline-action-subgroup inline-action-inspection-subgroup${lookInAvailable ? ' has-look-modifier' : ''}`}>
                    {inspectionCommands.map(kind => (
                        kind === 'look' && lookInAvailable && targetContext && onToggleLookIn
                            ? <InlineLookAction key={`inspect-${kind}`} targetContext={targetContext}
                                lookInSelected={lookInSelected} onToggleLookIn={onToggleLookIn}
                                onLook={lookIn => requestInspection('look', lookIn)} />
                            : <button key={`inspect-${kind}`} type="button" className="terminal-inspect-row"
                                title={`${kind} ${targetContext || ''}`.trim()}
                                onPointerDown={event => event.stopPropagation()}
                                onClick={event => { event.stopPropagation(); requestInspection(kind); }}>
                                <span style={{ color: getSwipeCommandTextColor(kind) || traitColor }}>{kind}</span>
                                {targetContext && <span>{targetContext}</span>}
                            </button>
                    ))}
                </div>}
                {Array.from(subgroupMap.entries()).map(([label, groupButtons]) => (
                    <div className="inline-action-subgroup" key={label || section.key}>
                        {hasSubgroups && <span className="inline-action-subgroup-label">{label}</span>}
                        {groupButtons.map(button => renderButton(button))}
                    </div>
                ))}
            </div>
        </div>
    );
};
