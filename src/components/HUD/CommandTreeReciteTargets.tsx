/** @file CommandTreeReciteTargets.tsx — Scroll → room entity target cascade for Recite. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { useCommandTreeRecite } from '../../hooks/useCommandTreeRecite';
import { getCommandActionTargetDisplayLabel } from '../../utils/commandTreeTargetSections';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { heldTargetPreviewRef } from '../../utils/heldTargetPreview';

// --- Recite Target Columns ---
export const CommandTreeReciteTargets = ({controller, tree, command, targets, onCommandExecuted, heldMenu = false}: {
    controller: ReturnType<typeof useCommandTreeController>;
    tree: ReturnType<typeof useCommandTree>;
    command: CustomButton;
    targets: CommandActionTargetEntry[];
    onCommandExecuted?: () => void;
    heldMenu?: boolean;
}) => {
    const workflow = useCommandTreeRecite(controller, command, targets, onCommandExecuted);
    const touchActivation = useSecondaryTouchActivation();
    const branchClass = `command-tree-branch terminal-inline-popover${heldMenu ? ' command-tree-held-command-targets' : ''}`;
    const sourceLabel = (entry: CommandActionTargetEntry) => workflow.scrollArgument(entry);

    return <>
        <section className={branchClass} aria-label="Recite scrolls" {...touchActivation}>
            <CommandTreeTargetHeader/>
            <CommandTreeCollapsibleSection label="Inventory">
                <div className="command-tree-section-commands" role="group" aria-label="Recite scrolls in inventory" tabIndex={0}>
                    {workflow.scrolls.map(entry => <button key={entry.id} type="button" data-menu-item="true"
                        className="command-tree-row" aria-expanded={workflow.selectedScroll?.id === entry.id}
                        title={entry.label} onPointerEnter={event => { if (event.pointerType === 'mouse') tree.defer(() => workflow.chooseScroll(entry)); }}
                        onMouseLeave={tree.cancelPreview}
                        onFocus={event => { if (event.currentTarget.matches(':focus-visible')) workflow.chooseScroll(entry); }}
                        onClick={() => workflow.chooseScroll(entry)}>
                        <span className="command-tree-row-label">{sourceLabel(entry)}</span>
                        <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>
                    </button>)}
                    {!workflow.scrolls.length && <p className="command-tree-section-empty">No eligible scrolls in inventory.</p>}
                </div>
            </CommandTreeCollapsibleSection>
        </section>
        {workflow.selectedScroll && <section className={branchClass} aria-label="Recite room entity" {...touchActivation}>
            <CommandTreeTargetHeader/>
            <CommandTreeCollapsibleSection label="Room Entities">
                <div className="command-tree-section-commands" role="group" aria-label="Recite targets in the room" tabIndex={0}>
                    {workflow.roomEntities.map(entry => <button key={entry.id} type="button" data-menu-item="true"
                        ref={heldTargetPreviewRef(() => workflow.previewTarget(entry))}
                        className="command-tree-row" title={entry.label}
                        onPointerEnter={event => { if (event.pointerType === 'mouse') tree.defer(() => workflow.previewTarget(entry)); }}
                        onMouseLeave={tree.cancelPreview}
                        onFocus={event => { if (event.currentTarget.matches(':focus-visible')) workflow.previewTarget(entry); }}
                        onClick={event => workflow.recite(entry, event)}>
                        <span className="command-tree-row-label">{entry.id === 'command-panel-self' ? 'Self' : getCommandActionTargetDisplayLabel(entry)}</span>
                    </button>)}
                    {!workflow.roomEntities.length && <p className="command-tree-section-empty">No room entities available.</p>}
                </div>
            </CommandTreeCollapsibleSection>
        </section>}
    </>;
};
