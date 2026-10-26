/** @file CommandTreeHeldMountActions.tsx — Mount commands for the held Mount shortcut. */
import React from 'react';
import { NPC_BUTTONS } from '../../constants/buttons/inline/npcs';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { commandTreeMountSection } from '../../utils/commandTreeGroups';
import { isCurrentCommandTarget } from '../../utils/currentCommandTarget';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';

// --- Mount Command Section ---
export const CommandTreeHeldMountActions = ({controller, tree}: {
    controller: ReturnType<typeof useCommandTreeController>;
    tree: ReturnType<typeof useCommandTree>;
}) => {
    const touchActivation = useSecondaryTouchActivation();
    const commandOrder = ['ride', 'lead', 'dismount', 'abandon'];
    const actions = NPC_BUTTONS.filter(button => commandTreeMountSection(button) === 'Mounts')
        .sort((left, right) => commandOrder.indexOf(left.command.trim().split(/\s+/, 1)[0].toLowerCase())
            - commandOrder.indexOf(right.command.trim().split(/\s+/, 1)[0].toLowerCase()));

    const execute = (button: (typeof actions)[number], event: React.MouseEvent<HTMLButtonElement>) => {
        const targetEntries = tree.targetsFor(button) ?? [];
        const selectedTarget = controller.vitals.target;
        const target = targetEntries.find(entry => entry.scope === 'room'
            && isCurrentCommandTarget({category:entry.category, context:entry.context, keyword:entry.keyword}, selectedTarget))
            || targetEntries.find(entry => entry.category === 'cat-mount')
            || targetEntries[0];
        const context = target?.context || 'mount';
        const command = button.command.replace(/%n(?:\|[^\s]+)?/g, context).replace(/%p/g, target?.parentNoun || '').trim();
        if (controller.isHelpMode) controller.executeHelp(command, button.label);
        else {
            controller.game.handleButtonClick(button, event, context, undefined, target?.parentNoun);
            controller.game.setCommandPreview?.(null);
        }
    };

    return <section className="command-tree-branch terminal-inline-popover command-tree-main-branch command-tree-held-mount-actions"
        aria-label="Mount actions" {...touchActivation}>
        <CommandTreeTargetHeader title="MOUNTS"/>
        <div className="command-tree-section-commands" role="group" aria-label="Mount commands" tabIndex={0}>
            {actions.map(button => <button type="button" key={button.id} data-menu-item="true" className="command-tree-row"
                title={button.command.replace(/%n(?:\|[^\s]+)?/g, 'mount')}
                onClick={event => execute(button, event)}>
                <span className="command-tree-row-label" style={{color:getCommandTextColor(button.command, button.setId)}}>
                    {button.label.replace(/%n/g, '').trim()}
                </span>
            </button>)}
            {!actions.length && <p className="command-tree-section-empty">No mount actions available here.</p>}
        </div>
    </section>;
};
