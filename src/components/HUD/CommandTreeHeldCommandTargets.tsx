/** @file CommandTreeHeldCommandTargets.tsx — Temporary target pane for a held command. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { getCommandActionTargetDisplayLabel, getCommandTargetSections, getObjectTargetSections } from '../../utils/commandTreeTargetSections';
import { getCommandTreeTargetPreview } from '../../utils/commandTreePreview';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { OnlineCommandTargets } from '../Popovers/StandardMenu/OnlineCommandTargets';

// --- Target Branch Section ---
export const CommandTreeHeldCommandTargets = ({controller, button, targets, onCommandExecuted}: {
    controller: ReturnType<typeof useCommandTreeController>;
    button: CustomButton;
    targets: CommandActionTargetEntry[];
    onCommandExecuted?: () => void;
}) => {
    const touchActivation = useSecondaryTouchActivation();
    const tell = /^tell\b/i.test(button.command.trim());
    const objectSections = targets.length && targets.every(entry => ['objects', 'inventory', 'worn'].includes(entry.group))
        ? getObjectTargetSections(targets) : [];
    const sections = objectSections.length ? objectSections : getCommandTargetSections(targets);
    const previewTarget = (entry: CommandActionTargetEntry) => {
        controller.game.setCommandPreview?.(getCommandTreeTargetPreview(button.command, entry.context, entry.parentNoun));
        if (entry.id === 'command-panel-self') controller.previewTargetContext('self');
        else if (entry.id === 'command-panel-room') controller.previewTargetContext('room');
        else controller.previewEntity(entry);
    };
    const renderTarget = (entry: CommandActionTargetEntry) => {
        const label = entry.id === 'command-panel-self' ? 'Self' : getCommandActionTargetDisplayLabel(entry);
        return <HeldCommandTarget key={entry.id} controller={controller} button={button} entry={entry} label={label}
            onPreview={() => previewTarget(entry)}/>;
    };

    return <section className="command-tree-branch terminal-inline-popover is-ability-side-branch command-tree-held-command-targets"
        aria-label={`Targets for ${button.label}`} {...touchActivation}>
        <CommandTreeTargetHeader/>
        {!tell && sections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label}>
            <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
                {section.entries.map(renderTarget)}
            </div>
        </CommandTreeCollapsibleSection>)}
        {tell && <>
            {Boolean(controller.game.groupMembers?.length) && <CommandTreeCollapsibleSection label="Group">
                <button type="button" data-menu-item="true" className="command-tree-row" onClick={() => {
                    controller.communication.handleCommand('tell group'); onCommandExecuted?.();
                }}>Group</button>
            </CommandTreeCollapsibleSection>}
            <CommandTreeCollapsibleSection label="Online Players">
                <OnlineCommandTargets hideHeader open namesOnly excludedNames={[controller.game.characterName || '']}
                    onPreviewTarget={entry => previewTarget(entry)} onSelect={entry => {
                        controller.communication.handleCommand(`tell ${entry.context}`); onCommandExecuted?.();
                    }}/>
            </CommandTreeCollapsibleSection>
        </>}
        {!tell && !targets.length && <p className="command-tree-section-empty">No available targets.</p>}
    </section>;
};

// --- Target Row Section ---
const HeldCommandTarget = ({controller, button, entry, label, onPreview}: {
    controller: ReturnType<typeof useCommandTreeController>;
    button: CustomButton;
    entry: CommandActionTargetEntry;
    label: string;
    onPreview: () => void;
}) => {
    return <div
            onPointerEnter={event => { if (event.pointerType === 'mouse') onPreview(); }}
            onFocus={event => { if (event.target instanceof Element && event.target.matches(':focus-visible')) onPreview(); }}>
            <CommandTreeAction controller={controller} button={button} targetLabel={label} targetGearRow={entry.gearRow}
                targetState={{x:0,y:0,type:'menu',setId:entry.category,category:entry.category,context:entry.context,keyword:entry.keyword,
                    displayName:entry.group === 'objects' && entry.scope === 'room' ? entry.label : label,
                    entityId:entry.id,parentNoun:entry.parentNoun,hasDoor:entry.hasDoor}}/>
    </div>;
};
