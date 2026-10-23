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
// --- Render Section ---
export const CommandTreeAccessTargets = ({controller, button, targets}: {
    controller: ReturnType<typeof useCommandTreeController>; button: CustomButton; targets: CommandActionTargetEntry[];
}) => {
    const access = useCommandTreeAccessTargets(controller, targets);
    return <section className="command-tree-branch terminal-inline-popover" aria-label={`Targets for ${button.label}`}>
        <CommandTreeTargetHeader/>
        {access.sections.map(section => {
            if (section.label === 'Doors') {
                const doorNamesByDirection = Object.fromEntries(section.entries.map(entry => [normalizeExitKey(entry.keyword), entry.doorName || entry.label]));
                const entryForDirection = (direction: string | null) => direction
                    ? section.entries.find(entry => normalizeExitKey(entry.keyword) === normalizeExitKey(direction))
                    : undefined;
                return <CommandTreeCollapsibleSection key={section.label} label={section.label}>
                    <MovementPad layout="menu" hideFlee doorSelectionOnly ariaLabel="Door directions"
                        doorNamesByDirection={doorNamesByDirection}
                        onPreviewDirection={direction => {
                            const entry = entryForDirection(direction);
                            if (entry) access.preview(entry);
                            else controller.previewEntity(null);
                        }}
                        onCommand={(direction, event) => {
                            const entry = entryForDirection(direction);
                            if (!entry) return;
                            const action = access.actionFor(entry, button);
                            if (controller.isHelpMode) controller.executeHelp(action.command, action.label);
                            else controller.game.handleButtonClick(action, event.nativeEvent, entry.context, undefined, entry.parentNoun);
                        }}/>
                </CommandTreeCollapsibleSection>;
            }
            return <CommandTreeCollapsibleSection key={section.label} label={section.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
                    {section.entries.map(entry => <div key={entry.id} onMouseEnter={() => access.preview(entry)} onFocus={() => access.preview(entry)}>
                        <CommandTreeAction controller={controller} button={access.actionFor(entry, button)} targetLabel={entry.label} targetGearRow={entry.gearRow} targetState={access.targetState(entry)}/>
                    </div>)}
                </div>
            </CommandTreeCollapsibleSection>;
        })}
        {!access.sections.length && <p className="command-tree-section-empty">No available targets.</p>}
    </section>;
};
