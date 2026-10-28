/** @file DesktopTargetWorkspace.tsx — Persistent desktop targets and commands using the quick gear menus. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useGame, useUI } from '../../context/GameContext';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useDesktopTargetWorkspace } from '../../hooks/useDesktopTargetWorkspace';
import { useWorkspaceTargetReveal } from '../../hooks/useWorkspaceTargetReveal';
import { useMobileTargetWorkspaceSurface } from '../../hooks/useMobileTargetWorkspaceSurface';
import { useDesktopTargetWorkspaceStore } from '../../stores/useDesktopTargetWorkspaceStore';
import { isDesktopTargetWorkspaceRequest } from '../../utils/popoverPanelUtils';
import { CommandTreeGearQuickMenu } from '../HUD/CommandTreeGearQuickMenu';
import { getEntityHighlightKind } from '../../utils/inlineCategoryAxes';
import type { PopoverState } from '../../types';
import '../HUD/CommandPanelV2.css';
import './DesktopTargetWorkspace.css';

// --- Shared Menu Rendering ---
const clickNavigation = {defer: (action: () => void) => action(), cancelPreview: () => {}};
const DesktopTargetWorkspace = ({request, close}: {request: PopoverState; close: () => void}) => {
 const controller = useCommandTreeController('selected', close, true, {retainPreview: true, followPanelRequests: false});
 const navigation = useDesktopTargetWorkspace(controller, request, close);
 const workspaceRef = useRef<HTMLElement>(null);
 const isMobile = controller.game.viewport.isMobile;
 useMobileTargetWorkspaceSurface(workspaceRef, isMobile);
 useWorkspaceTargetReveal(workspaceRef, navigation.initialTarget?.id, request, navigation.kind);
 const slot = isMobile ? null : document.getElementById('client-panel-inline-actions-slot');
 const target = navigation.initialTarget;
 const [targetMenuOpen, setTargetMenuOpen] = useState(false);
 const targetOptions = useMemo(() => {
  if (navigation.kind === 'Room') {
   const self: typeof controller.entries[number] = {id:'command-panel-self',label:'Self',keyword:'self',context:'self',category:'cat-ally',group:'players',scope:'self'};
   return [self, ...controller.entries.filter(entry => entry.scope === 'room'
    && ['objects','players','npcs'].includes(entry.group) && entry.category !== 'cat-exit')];
  }
  return controller.entries.filter(entry => entry.group === (navigation.kind === 'Inventory' ? 'inventory' : 'worn'));
 }, [controller.entries, navigation.kind]);
 const content = <section ref={workspaceRef} popover={isMobile ? 'manual' : undefined}
  className={`desktop-target-workspace is-commands-only command-tree-v2${slot?'':' is-floating'}${isMobile?' is-mobile-target-workspace':''}`} aria-label="Target commands">
  <header className="desktop-target-workspace-header">
   <button type="button" className="desktop-target-workspace-name target-highlighter is-target"
    data-target-kind={getEntityHighlightKind(target?.category || request.category)} data-targetable="true"
    aria-haspopup="listbox" aria-expanded={targetMenuOpen} onClick={() => setTargetMenuOpen(value => !value)}>
    <span>{target?.label || request.context}</span><ChevronDown size={13} aria-hidden="true" />
   </button>
   {targetMenuOpen && <div className="desktop-target-workspace-target-menu" role="listbox" aria-label={`${navigation.kind} targets`}>
    {targetOptions.map(entry => <button type="button" role="option" aria-selected={entry.id === target?.id} key={entry.id}
     onClick={() => { navigation.select(entry); setTargetMenuOpen(false); }}>
     {entry.label}
    </button>)}
    {!targetOptions.length && <span className="desktop-target-workspace-no-targets">No targets in {navigation.kind.toLowerCase()}.</span>}
   </div>}
   <button type="button" aria-label="Close target commands" title="Close (Escape)" onClick={close}>×</button>
  </header>
  <CommandTreeGearQuickMenu workspace commandsOnly kind={navigation.kind} controller={controller} tree={clickNavigation}
   initialTarget={navigation.initialTarget} onSelect={navigation.select}/>
 </section>;
 return slot ? createPortal(content, slot) : isMobile ? createPortal(content, document.body) : content;
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
  if (isDesktopTargetWorkspaceRequest(ui.popoverState)) open(ui.popoverState);
  else if (isMobile) closeWorkspace();
 }, [ui.popoverState, isMobile, open, closeWorkspace]);
 const close = useCallback(() => {
  closeWorkspace();
  if (isDesktopTargetWorkspaceRequest(ui.popoverState)) ui.setPopoverState(null);
 }, [closeWorkspace, ui.popoverState, ui.setPopoverState]);
 return request ? <DesktopTargetWorkspace request={request} close={close}/> : null;
};
