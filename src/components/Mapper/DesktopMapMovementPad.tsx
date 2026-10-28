/** @file DesktopMapMovementPad.tsx — Shared movement controls beside desktop command categories. */
import React from 'react';
import { createPortal } from 'react-dom';
import { MovementPad } from '../HUD/MovementPad';
import { useDesktopMapMovement } from '../../hooks/useDesktopMapMovement';
import '../HUD/CommandTreeMovement.css';
import './DesktopMapMovementPad.css';
import { useDesktopMapMovementMenu } from '../../hooks/useDesktopMapMovementMenu';
import { DesktopMapMovementMenu } from './DesktopMapMovementMenu';
import { useDesktopMovementDock } from '../../hooks/useDesktopMovementDock';

// --- Movement Controls Section ---
export const DesktopMapMovementPad = () => {
    const movement = useDesktopMapMovement();
    const menu = useDesktopMapMovementMenu(() => movement.preview(null));
    const dock = useDesktopMovementDock();
    if (!movement.visible) return null;
    const pad = <div className={`desktop-map-movement-pad${dock ? ' is-docked' : ''}`} onMouseLeave={menu.scheduleClose} onMouseEnter={menu.cancelClose}>
        <MovementPad layout="menu" onCommand={command => {movement.move(command); menu.close();}} onPreviewDirection={movement.preview}
            onDirectionHover={menu.show} onFollowHover={element => {movement.preview('follow'); menu.show('follow', element);}}
            onFollowClick={event => {movement.follow(event); menu.close();}} ariaLabel="Desktop map movement"/>
    </div>;
    return <>{dock ? createPortal(pad, dock) : pad}
    {menu.menu && createPortal(<div className="desktop-map-movement-menu command-tree-v2" style={menu.menu.style}
        onMouseEnter={menu.cancelClose} onMouseLeave={menu.scheduleClose}>
        <DesktopMapMovementMenu direction={menu.menu.direction} onExecuted={menu.close}/>
    </div>, document.body)}</>;
};
