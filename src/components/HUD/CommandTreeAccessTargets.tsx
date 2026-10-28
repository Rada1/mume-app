/** @file CommandTreeAccessTargets.tsx — Doors and local containers grouped in the access submenu. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeAccessTargets } from '../../hooks/useCommandTreeAccessTargets';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { getCommandActionTargetDisplayLabel } from '../../utils/commandTreeTargetSections';
import { getCommandTreeTargetPreview } from '../../utils/commandTreePreview';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { heldTargetPreviewRef } from '../../utils/heldTargetPreview';
// --- Render Section ---
export const CommandTreeAccessTargets = ({controller, button, targets, onCommandExecuted, padOnly = false, heldMenu = false}: {
    controller: ReturnType<typeof useCommandTreeController>; button: CustomButton; targets: CommandActionTargetEntry[]; onCommandExecuted?: () => void; padOnly?: boolean; heldMenu?: boolean;
}) => {
    const access = useCommandTreeAccessTargets(controller, targets);
    const touchActivation = useSecondaryTouchActivation();
    const renderedSections = access.sections.map(section => (
        <CommandTreeCollapsibleSection key={section.label} label={section.label}>
            <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
                {section.entries.map(entry => {
                    const action = access.actionFor(entry, button);
                    const preview = () => {
                        controller.game.setCommandPreview?.(getCommandTreeTargetPreview(action.command, entry.context, entry.parentNoun));
                        access.preview(entry);
                    };
                    return <div key={entry.id} ref={heldTargetPreviewRef(preview)} onClick={() => onCommandExecuted?.()}
                        onPointerEnter={event => { if (event.pointerType === 'mouse') preview(); }}
                        onFocus={event => { if (event.target instanceof Element && event.target.matches(':focus-visible')) preview(); }}>
                        <CommandTreeAction controller={controller} button={action} targetLabel={getCommandActionTargetDisplayLabel(entry)} targetGearRow={entry.gearRow} targetState={access.targetState(entry)}/>
                    </div>;
                })}
            </div>
        </CommandTreeCollapsibleSection>
    ));
    if (padOnly) return <div className="command-tree-ability-door-pad" aria-label={`Door directions for ${button.label}`}>
        {renderedSections.length ? renderedSections : <p className="command-tree-section-empty">No available doors.</p>}
    </div>;
    return <section className={`command-tree-branch terminal-inline-popover is-access-target-menu${heldMenu ? ' is-ability-side-branch command-tree-held-command-targets' : ''}`} aria-label={`Targets for ${button.label}`} {...touchActivation}>
        <CommandTreeTargetHeader/>
        {renderedSections}
        {!access.sections.length && <p className="command-tree-section-empty">No available targets.</p>}
    </section>;
};

