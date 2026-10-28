/** @file CommandTreeCommandList.tsx — Command rows shared by root branches and nested branches. */
import React from 'react';
import { Crosshair } from 'lucide-react';
import type { CustomButton } from '../../types';
import { useCommandTree } from '../../hooks/useCommandTree';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { isCommandTreeMoveAction } from '../../utils/commandTreeMovement';
import { isCommandTreeObservationCommand } from '../../utils/commandTreeGroups';
import { CommandTreeAction } from './CommandTreeAction';
import { executeDefaultCommandTarget, executeUntargetedTransferCommand, getDefaultCommandTarget } from '../../hooks/commandDefaultTarget';
import { isCommandTreeTransfer } from '../../utils/commandTreeTransfer';
import { usePressAndHold } from '../../hooks/usePressAndHold';
import { isMobileCommandHoldGroup } from '../../utils/commandTreeMobileGestures';
import { isCommandTreeSocial } from '../../utils/commandTreeSocial';

// --- Render Section ---
export const CommandTreeCommandList = ({buttons, tree, controller, onCommandExecuted, explicitTargetSelection, onTouchHoldStart, onTouchHoldEnd, beforeChooseCommand, renderCommandRow}: {
    buttons: CustomButton[];
    tree: ReturnType<typeof useCommandTree>;
    controller: ReturnType<typeof useCommandTreeController>;
    onCommandExecuted?: () => void;
    explicitTargetSelection?: boolean;
    onTouchHoldStart?: (button: CustomButton) => void;
    onTouchHoldEnd?: (button: CustomButton) => void;
    beforeChooseCommand?: (button: CustomButton) => void;
    renderCommandRow?: (button: CustomButton, row: React.ReactNode) => React.ReactNode;
}) => {
    const isMobile = controller.game?.viewport?.isMobile === true;
    const touchHold = usePressAndHold(onTouchHoldStart ?? (() => undefined), onTouchHoldEnd ?? (() => undefined), Boolean(onTouchHoldStart && onTouchHoldEnd));
    const chooseCommand = (button:CustomButton) => {beforeChooseCommand?.(button);tree.chooseCommand(button);};
    return <>
        {buttons.map(button => {
            const targets = tree.targetsFor?.(button) ?? [];
            const isObservationCommand = isCommandTreeObservationCommand(button);
            const hasHoldTargetMenu = Boolean(onTouchHoldStart && isMobileCommandHoldGroup(tree.group));
            const selectTargetOnTap = isMobile && explicitTargetSelection && !hasHoldTargetMenu;
            const isSocialCommand = isCommandTreeSocial(button);
            const usesTargetRow = Boolean(/%n/.test(button.command) || isCommandTreeMoveAction(button) || isSocialCommand
                || (hasHoldTargetMenu && isObservationCommand));

            const row = usesTargetRow
                ? <button className={`command-tree-row${controller.isHelpMode ? ' is-help-mode' : ''}${hasHoldTargetMenu ? ' is-touch-hold-enabled' : ''}`} title={button.command}
                    key={button.id} data-menu-item="true" data-command-tree-selection="true"
                    data-help-mode={controller.isHelpMode || undefined}
                    aria-expanded={!controller.isHelpMode && tree.command?.id === button.id}
                    onPointerDown={event => {if (hasHoldTargetMenu) touchHold.onPointerDown(button,event);}}
                    onPointerMove={touchHold.onPointerMove}
                    onPointerUp={touchHold.onPointerUp}
                    onPointerCancel={touchHold.onPointerCancel}
                    onPointerEnter={event => {if (event.pointerType === 'mouse') tree.defer(() => chooseCommand(button));}}
                    onFocus={event => {if (!isMobile && event.target.matches(':focus-visible')) chooseCommand(button);}} onClick={event => {
                        if (touchHold.shouldSuppressClick(button)) { event.preventDefault(); event.stopPropagation(); return; }
                        tree.cancelPreview();
                        if (controller.isHelpMode) controller.executeHelp(button.command, button.label);
                        else if (isSocialCommand) chooseCommand(button);
                        else if (hasHoldTargetMenu) {
                            if (isCommandTreeTransfer(button)) executeUntargetedTransferCommand(controller, button, event);
                            else if (isObservationCommand) {
                                const command = button.command.replace(/%n(?:\|[^\s]+)?/g, '').replace(/\s+/g, ' ').trim();
                                controller.game.handleButtonClick({...button, command}, event);
                            } else if (/^(?:assist|ass)(?:\s|$)/i.test(button.command.trim())) {
                                const command = button.command.replace(/%n(?:\|[^\s]+)?/g, '').replace(/\s+/g, ' ').trim();
                                controller.game.handleButtonClick({...button, command}, event);
                            } else if (!executeDefaultCommandTarget(controller, button, targets, event)) {
                                if (button.setId === 'trait-communication') {
                                    controller.communication.handleCommand(button.command.replace(/%n(?:\|[^\s]+)?/g, '').replace(/\s+/g, ' ').trim());
                                } else controller.game.handleButtonClick(button, event);
                            }
                            onCommandExecuted?.();
                        }
                        else if (selectTargetOnTap) chooseCommand(button);
                        else if (executeDefaultCommandTarget(controller, button, targets, event)) onCommandExecuted?.();
                        else chooseCommand(button);
                    }}>
                    <span className="command-tree-row-label" style={{color:getCommandTextColor(button.command, button.setId)}}>
                        {button.label.replace(/%n/g,'').trim()}
                    </span>
                    {!selectTargetOnTap && !isSocialCommand && getDefaultCommandTarget(controller, targets, button) && <Crosshair size={14}
                        className="command-tree-target-crosshair" aria-label="Uses current target"/>}
                    <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>
                </button>
                : <div key={button.id} onPointerEnter={event => {if (event.pointerType === 'mouse') chooseCommand(button);}}
                    onFocus={event => {if (!isMobile && event.target instanceof Element && event.target.matches(':focus-visible')) chooseCommand(button);}}>
                    <CommandTreeAction controller={controller} button={button}/>
                </div>;
            return renderCommandRow ? renderCommandRow(button, row) : row;
        })}
    </>;
};
