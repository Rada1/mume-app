/** @file DesktopTargetWorkspace.tsx — Compact actions for a selected log target on desktop and mobile. */
import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../../context/GameContext';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useDesktopTargetWorkspace } from '../../hooks/useDesktopTargetWorkspace';
import { useMobileTargetWorkspaceSurface } from '../../hooks/useMobileTargetWorkspaceSurface';
import { useMobileTargetPopoverPosition } from '../../hooks/useMobileTargetPopoverPosition';
import { useDesktopTargetWorkspaceStore } from '../../stores/useDesktopTargetWorkspaceStore';
import { isDesktopTargetWorkspaceRequest } from '../../utils/popoverPanelUtils';
import { MobileQuickTargetPopover } from './MobileQuickTargetPopover';
import { getEntityHighlightKind } from '../../utils/inlineCategoryAxes';
import type { PopoverState } from '../../types';
import '../HUD/CommandPanelV2.css';
import './DesktopTargetWorkspace.css';
import './MobileTargetPopover.css';

// --- Shared floating menu ---
const DesktopTargetWorkspace = ({request, close}: {request: PopoverState; close: () => void}) => {
 const controller = useCommandTreeController('selected', close, false, {retainPreview: true, followPanelRequests: false});
 const navigation = useDesktopTargetWorkspace(controller, request, close);
 const workspaceRef = useRef<HTMLElement>(null);
 useMobileTargetWorkspaceSurface(workspaceRef, true);
 useMobileTargetPopoverPosition(workspaceRef, true, request);
 const target = navigation.initialTarget;
 return createPortal(<section ref={workspaceRef} popover="manual"
  className="desktop-target-workspace is-commands-only command-tree-v2 is-floating is-mobile-target-workspace is-inline-target-popover" aria-label="Target commands">
  <header className="desktop-target-workspace-header">
   <div className="desktop-target-workspace-name target-highlighter is-target"
    data-target-kind={getEntityHighlightKind(target?.category || request.category)} data-targetable="true">
    <span>{target?.label || request.context}</span>
   </div>
   <button type="button" aria-label="Close target commands" title="Close (Escape)" onClick={close}>×</button>
  </header>
  {target && <MobileQuickTargetPopover entry={target} controller={controller} close={close}/>}
 </section>, document.body);
};

// --- Popover lifetime ---
export const DesktopTargetWorkspaceHost = () => {
 const ui = useUI();
 const request = useDesktopTargetWorkspaceStore(state => state.request);
 const open = useDesktopTargetWorkspaceStore(state => state.open);
 const closeWorkspace = useDesktopTargetWorkspaceStore(state => state.close);
 useEffect(() => {
  if (isDesktopTargetWorkspaceRequest(ui.popoverState)) open(ui.popoverState);
  else closeWorkspace();
 }, [ui.popoverState, open, closeWorkspace]);
 const close = useCallback(() => {
  closeWorkspace();
  if (isDesktopTargetWorkspaceRequest(ui.popoverState)) ui.setPopoverState(null);
 }, [closeWorkspace, ui.popoverState, ui.setPopoverState]);
 return request ? <DesktopTargetWorkspace request={request} close={close}/> : null;
};
