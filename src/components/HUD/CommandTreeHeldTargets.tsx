/** @file CommandTreeHeldTargets.tsx — Specialized held targets retain their staged column layouts. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandTree } from '../../hooks/useCommandTree';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { isCommandTreeObservation } from '../../utils/commandTreeObservation';
import { isCommandTreeGetAction } from '../../utils/commandTreeGet';
import { isCommandTreeTransfer } from '../../utils/commandTreeTransfer';
import { isCommandTreeAccess } from '../../utils/commandTreeAccess';
import { isCommandTreeShopAction } from '../../utils/commandTreeShop';
import { CommandTreeObservationTargets } from './CommandTreeObservationTargets';
import { CommandTreeHeldCommandTargets } from './CommandTreeHeldCommandTargets';
import { CommandTreeGetTargets } from './CommandTreeGetTargets';
import { CommandTreeTransferTargets } from './CommandTreeTransferTargets';
import { CommandTreeAccessTargets } from './CommandTreeAccessTargets';
import { CommandTreeShopTargets } from './CommandTreeShopTargets';
import './CommandTreeHeldTargets.css';

// --- Held Workflow Section ---
export const CommandTreeHeldTargets = ({controller, tree, button, onCommandExecuted}: {
    controller: ReturnType<typeof useCommandTreeController>;
    tree: ReturnType<typeof useCommandTree>;
    button: CustomButton;
    onCommandExecuted?: () => void;
}) => {
    const targets = tree.targetsFor(button) ?? [];
    if (isCommandTreeObservation(button)) return <CommandTreeObservationTargets controller={controller} button={button} targets={targets} heldMenu/>;
    const workflow = isCommandTreeGetAction(button)
        ? <CommandTreeGetTargets controller={controller} button={button} targets={targets} heldMenu/>
        : isCommandTreeTransfer(button)
        ? <CommandTreeTransferTargets controller={controller} tree={tree} command={button} heldMenu/>
        : isCommandTreeAccess(button)
        ? <CommandTreeAccessTargets controller={controller} button={button} targets={targets} onCommandExecuted={onCommandExecuted} heldMenu/>
        : isCommandTreeShopAction(button)
        ? <CommandTreeShopTargets controller={controller} command={button} onCommandExecuted={onCommandExecuted} heldMenu/>
        : null;
    if (!workflow) return <CommandTreeHeldCommandTargets controller={controller} button={button} targets={targets}
        onCommandExecuted={onCommandExecuted}/>;
    return workflow;
};
