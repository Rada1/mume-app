/** @file DesktopTargetWorkspace.tsx — Persistent desktop targets and commands using the quick gear menus. */
import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame, useUI } from '../../context/GameContext';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useDesktopTargetWorkspace } from '../../hooks/useDesktopTargetWorkspace';
import { useDesktopTargetWorkspaceStore } from '../../stores/useDesktopTargetWorkspaceStore';
import { isDesktopTargetWorkspaceRequest } from '../../utils/popoverPanelUtils';
import { CommandTreeGearQuickMenu } from '../HUD/CommandTreeGearQuickMenu';
import type { PopoverState } from '../../types';
import '../HUD/CommandPanelV2.css';
import './DesktopTargetWorkspace.css';

// --- Shared Menu Rendering ---
const clickNavigation = {defer: (action: () => void) => action(), cancelPreview: () => {}};
const DesktopTargetWorkspace = ({request, close}: {request: PopoverState; close: () => void}) => {
 const controller = useCommandTreeController('selected', close, true, {retainPreview: true, followPanelRequests: false});
 const navigation = useDesktopTargetWorkspace(controller, request, close);
 const slot = document.getElementById('client-panel-inline-actions-slot');
 const content = <section className={`desktop-target-workspace command-tree-v2${slot?'':' is-floating'}`} aria-label="Target commands">
  <header className="desktop-target-workspace-header">
   <nav aria-label="Target locations">
    {(['Room','Inventory','Equipment'] as const).map(kind => <button key={kind} type="button"
     aria-pressed={navigation.kind === kind} onClick={() => navigation.setKind(kind)}>
     {kind === 'Equipment' ? 'Equipped' : kind}
    </button>)}
   </nav>
   <button type="button" aria-label="Close target commands" title="Close (Escape)" onClick={close}>×</button>
  </header>
  <CommandTreeGearQuickMenu workspace kind={navigation.kind} controller={controller} tree={clickNavigation}
   initialTarget={navigation.initialTarget} onSelect={navigation.select}/>
 </section>;
 return slot ? createPortal(content, slot) : content;
};

// --- Persistent Host ---
export const DesktopTargetWorkspaceHost = () => {
 const game = useGame();
 const ui = useUI();
 const request = useDesktopTargetWorkspaceStore(state => state.request);
 const open = useDesktopTargetWorkspaceStore(state => state.open);
 const closeWorkspace = useDesktopTargetWorkspaceStore(state => state.close);
 const isMobile = game.viewport.isMobile;
 useEffect(() => {
  if (!isMobile && isDesktopTargetWorkspaceRequest(ui.popoverState)) open(ui.popoverState);
  if (isMobile) closeWorkspace();
 }, [ui.popoverState, isMobile, open, closeWorkspace]);
 const close = useCallback(() => {
  closeWorkspace();
  if (isDesktopTargetWorkspaceRequest(ui.popoverState)) ui.setPopoverState(null);
 }, [closeWorkspace, ui.popoverState, ui.setPopoverState]);
 return !isMobile && request ? <DesktopTargetWorkspace request={request} close={close}/> : null;
};
