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
import { isCommandTreePracticeAction } from '../../utils/commandTreePractice';
import { CommandTreePracticeTargets } from './CommandTreePracticeTargets';
import { CommandTreeReciteTargets } from './CommandTreeReciteTargets';
import { isMobileCommandTargetless } from '../../utils/mobileCommandTiles';
import './CommandTreeHeldTargets.css';
import { CommandTargetMenuContext } from '../../context/CommandTargetMenuContext';
import { isCommandTreeReciteAction } from '../../utils/commandTreeRecite';
import { parseKeyedSpellCommand } from '../../utils/magicKeyUtils';
import { CommandTreeMagicKeyTargets } from './CommandTreeMagicKeyTargets';
import { isCommandTreeSocial } from '../../utils/commandTreeSocial';
import { CommandTreeSocialTargets } from './CommandTreeSocialTargets';

// --- Held Workflow Section ---
const HeldTargetContents = ({controller, tree, button, onCommandExecuted}: {
    controller: ReturnType<typeof useCommandTreeController>;
    tree: ReturnType<typeof useCommandTree>;
    button: CustomButton;
    onCommandExecuted?: () => void;
}) => {
    if (parseKeyedSpellCommand(button.command)) return <CommandTreeMagicKeyTargets controller={controller} button={button} heldMenu onCommandExecuted={onCommandExecuted}/>;
    if (isMobileCommandTargetless(button)) return null;
    const targets = tree.targetsFor(button) ?? [];
    if (isCommandTreePracticeAction(button)) return <CommandTreePracticeTargets controller={controller}/>;
    if (isCommandTreeObservation(button)) return <CommandTreeObservationTargets controller={controller} button={button} targets={targets} heldMenu/>;
    const workflow = isCommandTreeGetAction(button)
        ? <CommandTreeGetTargets controller={controller} button={button} targets={targets} heldMenu/>
        : isCommandTreeReciteAction(button)
        ? <CommandTreeReciteTargets controller={controller} tree={tree} command={button} targets={targets} onCommandExecuted={onCommandExecuted} heldMenu/>
        : isCommandTreeTransfer(button)
        ? <CommandTreeTransferTargets controller={controller} tree={tree} command={button} heldMenu/>
        : isCommandTreeAccess(button)
        ? <CommandTreeAccessTargets controller={controller} button={button} targets={targets} onCommandExecuted={onCommandExecuted} heldMenu/>
        : isCommandTreeSocial(button)
        ? <CommandTreeSocialTargets controller={controller} button={button} targets={targets} onCommandExecuted={onCommandExecuted} heldMenu/>
        : isCommandTreeShopAction(button)
        ? <CommandTreeShopTargets controller={controller} command={button} onCommandExecuted={onCommandExecuted} heldMenu/>
        : null;
    if (!workflow) return <CommandTreeHeldCommandTargets controller={controller} button={button} targets={targets}
        onCommandExecuted={onCommandExecuted}/>;
    return workflow;
};

// --- Mobile Target Presentation Section ---
export const CommandTreeHeldTargets = (props: React.ComponentProps<typeof HeldTargetContents>) =>
    <CommandTargetMenuContext.Provider value={props.controller.game?.viewport?.isMobile === true}>
        <HeldTargetContents {...props}/>
    </CommandTargetMenuContext.Provider>;
