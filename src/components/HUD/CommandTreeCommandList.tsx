/** @file CommandTreeCommandList.tsx — Command rows shared by root branches and nested branches. */
import React from 'react';
import { Crosshair } from 'lucide-react';
import type { CustomButton } from '../../types';
import { useCommandTree } from '../../hooks/useCommandTree';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { isCommandTreeMoveAction } from '../../utils/commandTreeMovement';
import { CommandTreeAction } from './CommandTreeAction';
import { executeDefaultCommandTarget, getDefaultCommandTarget } from '../../hooks/commandDefaultTarget';

// --- Render Section ---
export const CommandTreeCommandList = ({buttons, tree, controller, onCommandExecuted, explicitTargetSelection}: {
    buttons: CustomButton[];
    tree: ReturnType<typeof useCommandTree>;
    controller: ReturnType<typeof useCommandTreeController>;
    onCommandExecuted?: () => void;
    explicitTargetSelection?: boolean;
}) => {
    const isMobile = controller.game?.viewport?.isMobile === true;
    return <>
        {buttons.map(button => {
            const targets = tree.targetsFor?.(button) ?? [];
            const selectTargetOnTap = isMobile && explicitTargetSelection;
            const usesTargetRow = Boolean(/%n/.test(button.command) || isCommandTreeMoveAction(button));

            return usesTargetRow
                ? <button className={`command-tree-row${controller.isHelpMode ? ' is-help-mode' : ''}`} title={button.command}
                    key={button.id} data-menu-item="true" data-command-tree-selection="true"
                    data-help-mode={controller.isHelpMode || undefined}
                    aria-expanded={!controller.isHelpMode && tree.command?.id === button.id}
                    onPointerEnter={event => {if (event.pointerType === 'mouse') tree.defer(() => tree.chooseCommand(button));}}
                    onFocus={() => tree.chooseCommand(button)} onClick={event => {
                        tree.cancelPreview();
                        if (controller.isHelpMode) controller.executeHelp(button.command, button.label);
                        else if (selectTargetOnTap) tree.chooseCommand(button);
                        else if (executeDefaultCommandTarget(controller, button, targets, event)) onCommandExecuted?.();
                        else tree.chooseCommand(button);
                    }}>
                    <span className="command-tree-row-label" style={{color:getCommandTextColor(button.command, button.setId)}}>
                        {button.label.replace(/%n/g,'').trim()}
                    </span>
                    {!selectTargetOnTap && getDefaultCommandTarget(controller, targets, button) && <Crosshair size={14}
                        className="command-tree-target-crosshair" aria-label="Uses current target"/>}
                    <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>
                </button>
                : <div key={button.id} onPointerEnter={event => {if (event.pointerType === 'mouse') tree.chooseCommand(button);}}
                    onFocus={() => tree.chooseCommand(button)}>
                    <CommandTreeAction controller={controller} button={button}/>
                </div>;
        })}
    </>;
};
