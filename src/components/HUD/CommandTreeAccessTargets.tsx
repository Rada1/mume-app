/** @file CommandTreeAccessTargets.tsx — Doors and local containers grouped in the access submenu. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeAccessTargets } from '../../hooks/useCommandTreeAccessTargets';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { MovementPad } from './MovementPad';
import { normalizeExitKey } from '../../utils/gmcpExitUtils';
import { getCommandActionTargetDisplayLabel } from '../../utils/commandTreeTargetSections';
import { getCommandTreeBasePreview, getCommandTreeTargetPreview } from '../../utils/commandTreePreview';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
// --- Render Section ---
export const CommandTreeAccessTargets = ({controller, button, targets, onCommandExecuted, padOnly = false, heldMenu = false}: {
    controller: ReturnType<typeof useCommandTreeController>; button: CustomButton; targets: CommandActionTargetEntry[]; onCommandExecuted?: () => void; padOnly?: boolean; heldMenu?: boolean;
}) => {
    const access = useCommandTreeAccessTargets(controller, targets);
    const touchActivation = useSecondaryTouchActivation();
    const hasDoors = access.sections.some(s => s.label === 'Doors');
    const renderDoorPad = (section: typeof access.sections[number]) => {
        const doorNamesByDirection = Object.fromEntries(section.entries.map(entry => [normalizeExitKey(entry.keyword), entry.doorName || entry.label]));
        const entryForDirection = (direction: string | null) => direction
            ? section.entries.find(entry => normalizeExitKey(entry.keyword) === normalizeExitKey(direction))
            : undefined;
        return <MovementPad key={section.label} layout="menu" hideFlee doorSelectionOnly ariaLabel="Door directions"
                    doorNamesByDirection={doorNamesByDirection}
                    onPreviewDirection={direction => {
                        const entry = entryForDirection(direction);
                        if (entry) {
                            const action = access.actionFor(entry, button);
                            controller.game.setCommandPreview?.(getCommandTreeTargetPreview(action.command, entry.context, entry.parentNoun));
                            access.preview(entry);
                        }
                        else {
                            controller.game.setCommandPreview?.(getCommandTreeBasePreview(button.command));
                            controller.previewEntity(null);
                        }
                    }}
                    onCommand={(direction, event) => {
                        const entry = entryForDirection(direction);
                        if (!entry) return;
                        const action = access.actionFor(entry, button);
                        if (controller.isHelpMode) controller.executeHelp(action.command, action.label);
                        else controller.game.handleButtonClick(action, event, entry.context, undefined, entry.parentNoun);
                        onCommandExecuted?.();
                    }}/>;
    };
    const renderedSections = access.sections.map(section => {
            if (section.label === 'Doors') return renderDoorPad(section);
            return <CommandTreeCollapsibleSection key={section.label} label={section.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
                    {section.entries.map(entry => {
                        const action = access.actionFor(entry, button);
                        const preview = () => {
                            controller.game.setCommandPreview?.(getCommandTreeTargetPreview(action.command, entry.context, entry.parentNoun));
                            access.preview(entry);
                        };
                        return <div key={entry.id} onPointerEnter={event => { if (event.pointerType === 'mouse') preview(); }}
                            onFocus={event => { if (event.target instanceof Element && event.target.matches(':focus-visible')) preview(); }}>
                            <CommandTreeAction controller={controller} button={action} targetLabel={getCommandActionTargetDisplayLabel(entry)} targetGearRow={entry.gearRow} targetState={access.targetState(entry)}/>
                        </div>;
                    })}
                </div>
            </CommandTreeCollapsibleSection>;
        });
    if (padOnly) return <div className="command-tree-ability-door-pad" aria-label={`Door directions for ${button.label}`}>
        {renderedSections.length ? renderedSections : <p className="command-tree-section-empty">No available doors.</p>}
    </div>;
    return <section className={`command-tree-branch terminal-inline-popover${heldMenu ? ' command-tree-held-command-targets' : hasDoors ? ' is-movement-branch' : ''}`} aria-label={`Targets for ${button.label}`} {...touchActivation}>
        <CommandTreeTargetHeader/>
        {renderedSections}
        {!access.sections.length && <p className="command-tree-section-empty">No available targets.</p>}
    </section>;
};
