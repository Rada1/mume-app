/** @file CommandTreeMovement.tsx — Inline directional pad for the Movement section. */
import React from 'react';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeMovement } from '../../hooks/useCommandTreeMovement';
import { MovementPad } from './MovementPad';
import './CommandTreeMovement.css';
// --- Render Section ---
export const CommandTreeMovement = ({controller, onCommandExecuted, onDirectionHold, onDirectionRelease, heldDirection, showMountShortcut, onMountHold, onMountRelease, mountHeld}: {controller: ReturnType<typeof useCommandTreeController>; onCommandExecuted?: () => void; onDirectionHold?: (direction: string) => void; onDirectionRelease?: (direction: string) => void; heldDirection?: string | null; showMountShortcut?: boolean; onMountHold?: () => void; onMountRelease?: () => void; mountHeld?: boolean}) => {
    const movement = useCommandTreeMovement(controller);
    return <div className="command-tree-movement-pad" aria-label="Movement directions">
        <MovementPad layout="menu" onPreviewDirection={direction => controller.game.setCommandPreview?.(direction || 'move')}
            onCommand={command => {movement.move(command); onCommandExecuted?.();}} disabled={movement.disabled}
            onDirectionHold={onDirectionHold} onDirectionRelease={onDirectionRelease} heldDirection={heldDirection}
            showMountButton={showMountShortcut} onMountHold={onMountHold} onMountRelease={onMountRelease} mountHeld={mountHeld}/>
    </div>;
};
