/** @file CommandTreeMovement.tsx — Inline directional pad for the Movement section. */
import React from 'react';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeMovement } from '../../hooks/useCommandTreeMovement';
import { MovementPad } from './MovementPad';
import './CommandTreeMovement.css';
// --- Render Section ---
export const CommandTreeMovement = ({controller}: {controller: ReturnType<typeof useCommandTreeController>}) => {
    const movement = useCommandTreeMovement(controller);
    return <div className="command-tree-movement-pad" aria-label="Movement directions">
        <MovementPad layout="menu" onCommand={movement.move} disabled={movement.disabled}/>
    </div>;
};
