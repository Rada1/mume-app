/** @file DesktopMapMovementMenu.tsx — Shared mobile direction actions and Follow targets beside the desktop pad. */
import React from 'react';
import { useDesktopMapMovementActions } from '../../hooks/useDesktopMapMovementActions';
import { CommandTreeHeldDirectionActions } from '../HUD/CommandTreeHeldDirectionActions';
import { CommandTreeHeldCommandTargets } from '../HUD/CommandTreeHeldCommandTargets';
import { COMMAND_TREE_FOLLOW_BUTTON } from '../../utils/commandTreeMovement';
import { CommandTargetMenuContext } from '../../context/CommandTargetMenuContext';

// --- Reuse the existing action and target workflows ---
export const DesktopMapMovementMenu = ({direction, onExecuted}: {direction: string; onExecuted: () => void}) => {
    const {controller, tree} = useDesktopMapMovementActions(onExecuted);
    return <CommandTargetMenuContext.Provider value={true}>
        {direction === 'follow'
            ? <CommandTreeHeldCommandTargets controller={controller} button={COMMAND_TREE_FOLLOW_BUTTON}
                targets={tree.targetsFor(COMMAND_TREE_FOLLOW_BUTTON)} onCommandExecuted={onExecuted}/>
            : <CommandTreeHeldDirectionActions controller={controller} tree={tree} direction={direction} onCommandExecuted={onExecuted}/>}
    </CommandTargetMenuContext.Provider>;
};
