/** @file CommandPanelV2.tsx — Minimal command-first branching menu workspace. */
// @refresh reset
import React from 'react';
import { UiProfiler, withUiProfiler } from '../Utility/UiProfiler';
import { uiPerformance } from '../../utils/uiPerformance';
import { createPortal } from 'react-dom';
import { ChevronUp } from 'lucide-react';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTree } from '../../hooks/useCommandTree';
import type { UnifiedCommandActionScope } from '../../hooks/useUnifiedCommandActions';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeOutputs } from './CommandTreeOutputs';
import { CommandTreeGearQuickMenu } from './CommandTreeGearQuickMenu';
import { CommandPanelYouSummary } from './CommandPanelYouSummary';
import { CommandTreeMenuHeader } from './CommandTreeMenuHeader';
import { DesktopCommandCategoryNav } from './DesktopCommandCategoryNav';
import { useModeStore } from '../../stores/useModeStore';
import { CommandPanelV2Branches } from './CommandPanelV2Branches';
import { useDesktopCommandCategoryNavigation } from '../../hooks/useDesktopCommandCategoryNavigation';
import './UnifiedCommandPanel.css';
import './CommandPanelV2.css';
import './CommandPanelFlatDock.css';
import './CommandDockStrip.css';
import './CommandDockStripMobile.css';
import './CommandDockMobileFocus.css';
import './CommandDockMobileReadabilityMenus.css';
import './MobileCommandTargets.css';
import './MobileCommandTargetSections.css';
import './DesktopCommandCategories.css';
import './DesktopCommandTargets.css';
import './DesktopControlSystem.css';
import './DesktopDockPanels.css';
import { useDesktopDockPanels } from '../../hooks/useDesktopDockPanels';
import { useCommandDockPosition } from '../../hooks/useCommandDockPosition';
import { useQuickStateMenuPosition } from '../../hooks/useQuickStateMenuPosition';
import { useQuickStateMenuGesture } from '../../hooks/useQuickStateMenuGesture';
import { useUpwardCommandBranches } from '../../hooks/useUpwardCommandBranches';
import { useMobileReadabilityMenuBounds } from '../../hooks/useMobileReadabilityMenuBounds';
import { useMobileCommandTileLayout } from '../../hooks/useMobileCommandTileLayout';
import type { PopoverState } from '../../types';
// --- Render Section ---

const isInlineEntityPopover = (state: PopoverState | null | undefined): boolean => Boolean(
 state?.entityId && !state.commandPanelCapture && !['command-panel-room', 'command-panel-self'].includes(state.entityId)
 && (!state.type || state.type === 'menu') && state.menuDisplay !== 'dial'
);

export const CommandPanelV2 = withUiProfiler('Commands', ({initialScope, onClose}: {initialScope?: UnifiedCommandActionScope; onClose?: () => void}) => {
 const [gearMenu, setGearMenu] = React.useState<'Inventory'|'Equipment'|'Room'|null>(null);
 // V2 builds its own command tree; the legacy action groups are only needed by gear quick menus.
 const controller = useCommandTreeController(initialScope, onClose, gearMenu !== null);
 const finishTree = uiPerformance.startWork('Target tree');
 const tree = useCommandTree(controller);
 finishTree();
 const {game} = controller;
 const activeView = useModeStore(state=>state.activeView);
 const spectateTarget = useModeStore(state=>state.spectateTarget);
 const viewingSpectateTarget = game.isSpectateMode && activeView === 'target';
 const summaryCharacterName = controller.vitals?.characterInfo?.name || game.characterName || '';
 const summaryScopeKey = game.isSpectateMode
  ? `spectate:${viewingSpectateTarget ? spectateTarget || '' : 'self'}`
  : `player:${summaryCharacterName}`;
 const stanceValue = ['riding','mounted'].includes((game.playerPosition || '').toLowerCase()) ? 'standing' : game.playerPosition;
 const [gearMenuMaxWidth, setGearMenuMaxWidth] = React.useState<number|null>(null);
 const gearMenuButtonRef = React.useRef<HTMLElement|null>(null);
 const isMobile = game.viewport?.isMobile === true;
 const dockPanels = useDesktopDockPanels();
 const quickMenuPlacement = useQuickStateMenuPosition(tree.quick,true);
 const mobileCommandFocus = isMobile;
 const atShop = controller.shop.atShop ?? controller.shop.available;
 const menuDismissTimerRef = React.useRef<number|null>(null);
 const menuStateRef = React.useRef({group:tree.group,help:controller.isHelpMode});
 menuStateRef.current = {group:tree.group,help:controller.isHelpMode};
 const cancelScheduledMenuClose = () => {
  if (menuDismissTimerRef.current !== null) window.clearTimeout(menuDismissTimerRef.current);
  menuDismissTimerRef.current = null;
 };
 const closeSubmenu = () => {
  cancelScheduledMenuClose();
  if (tree.group !== null) tree.chooseGroup(tree.group);
  if (controller.isHelpMode) controller.toggleHelpMode();
 };
 const closeMenuAfterAction = () => {
  // Mobile command tiles stay in place after execution.
 };
 const closeSubmenuRef = React.useRef(closeSubmenu);
 closeSubmenuRef.current = closeSubmenu;
 const dismissMenuOnPointerLeave = (pointerType: string) => {
  if (pointerType === 'touch') return;
  cancelScheduledMenuClose();
  const leavingMenu = menuStateRef.current;
  if (leavingMenu.group === null && !leavingMenu.help) return;
  menuDismissTimerRef.current = window.setTimeout(() => {
   menuDismissTimerRef.current = null;
   const currentMenu = menuStateRef.current;
   if (currentMenu.group !== leavingMenu.group || currentMenu.help !== leavingMenu.help) return;
   closeSubmenuRef.current();
  }, 220);
 };
 const openCommandGroup = (index:number) => {
  cancelScheduledMenuClose();
  if (gearMenu) closeGearMenu();
  const replacingInlinePopover = dismissReadabilityInlinePopover();
  if (replacingInlinePopover) {
   tree.setQuick(null);
   closeGearMenu();
  }
  if (tree.group === index) return;
  tree.chooseGroup(index);
 };
 React.useEffect(() => () => {
  if (menuDismissTimerRef.current !== null) window.clearTimeout(menuDismissTimerRef.current);
 }, []);
 const updateGearMenuPosition = React.useCallback(() => {
  const button = gearMenuButtonRef.current;
  if (!button) return;
  const rect = button.getBoundingClientRect();
  setGearMenuMaxWidth(Math.max(0, rect.right - 8));
 }, []);
 const openGearMenu = (label: 'Inventory'|'Equipment'|'Room', button: HTMLElement) => {
  if (isMobile) return;
  dismissReadabilityInlinePopover();
  if (tree.group !== null || controller.isHelpMode) closeSubmenu();
  tree.setQuick(null);
  gearMenuButtonRef.current = button;
  updateGearMenuPosition();
  setGearMenu(label);
 };
 const closeGearMenu = () => {setGearMenu(null); setGearMenuMaxWidth(null); controller.previewEntity(null);};
 const isRotatedLandscape = game.viewport?.isRotatedLandscape === true;
 const landscapeSummaryOverlay = Boolean(isMobile && game.viewport?.isLandscape && !isRotatedLandscape);
 const [dockSlots, setDockSlots] = React.useState<{summary:HTMLElement;controls:HTMLElement;actions:HTMLElement;menu:HTMLElement;app:HTMLElement}|null>(null);
 const mobileReadabilitySplit = Boolean(isMobile && dockSlots && !isRotatedLandscape);
 useMobileCommandTileLayout(isMobile,dockSlots?.app);
 const readabilityInlinePopoverOpen = mobileReadabilitySplit && isInlineEntityPopover(controller.ui.popoverState);
 const dismissReadabilityInlinePopover = () => {
  if (!readabilityInlinePopoverOpen) return false;
  controller.ui.setPopoverState(null);
  return true;
 };
 const {position:dockPopupPosition, anchorRef:dockPopupButtonRef, update:updateDockPopupPosition} = useCommandDockPosition(isMobile, tree.group !== null && !mobileCommandFocus, tree.group);
 const openQuickMenu = (label: string, button: HTMLElement) => {
  dismissReadabilityInlinePopover();
  closeGearMenu();
  quickMenuPlacement.anchorRef.current = button;
  tree.setQuick(label);
 };
 const quickGesture = useQuickStateMenuGesture(isMobile && !game.isSpectateMode, openQuickMenu,
  () => tree.setQuick(null), game.triggerHaptic);
 React.useLayoutEffect(() => {
  if (isRotatedLandscape || typeof document === 'undefined') {setDockSlots(null);return;}
  const summary = document.getElementById('command-dock-summary');
  const controls = document.getElementById('command-dock-controls');
  const actions = document.getElementById('command-dock-actions');
  const menu = document.getElementById('command-dock-menu');
  const app = document.querySelector<HTMLElement>('.app-container');
  if (summary && controls && actions && menu && app) setDockSlots({summary,controls,actions,menu,app});
  else setDockSlots(null);
 }, [isMobile, isRotatedLandscape, landscapeSummaryOverlay]);
 useMobileReadabilityMenuBounds(mobileReadabilitySplit || landscapeSummaryOverlay, dockSlots);
 React.useEffect(() => {
  if (!gearMenu) return;
  window.addEventListener('resize', updateGearMenuPosition);
  const onScroll = (event: Event) => {
   const target = event.target;
   if (!(target instanceof Element) || target.contains(gearMenuButtonRef.current)) updateGearMenuPosition();
  };
  window.addEventListener('scroll', onScroll, true);
  return () => {
   window.removeEventListener('resize', updateGearMenuPosition);
   window.removeEventListener('scroll', onScroll, true);
  };
 }, [gearMenu, updateGearMenuPosition]);
 const branchListRef = React.useRef<HTMLDivElement>(null);
 React.useLayoutEffect(() => {
  if (tree.group === null) return;
  const rootBranch = Array.from(branchListRef.current?.querySelectorAll<HTMLElement>('.command-tree-branch') || [])
   .find(branch => branch.getAttribute('aria-label') === tree.grouped[tree.group!]?.label);
  if (rootBranch) rootBranch.scrollTop = 0;
 }, [tree.group]);
 React.useLayoutEffect(() => {
  if (tree.group === null || !tree.command) return;
  const branches = Array.from(branchListRef.current?.querySelectorAll<HTMLElement>('.command-tree-branch') || []);
  const submenu = branches[branches.length - 1];
  if (branches.length > 1 && submenu) submenu.scrollTop = 0;
 }, [tree.group, tree.command?.id, tree.command?.command]);
 useUpwardCommandBranches(branchListRef, Boolean(dockSlots && tree.group !== null && !mobileCommandFocus));
 React.useEffect(() => {
  if (isMobile || typeof window === 'undefined' || window.innerWidth < 641) return;
  const branchList = branchListRef.current;
  if (!branchList) return;
  branchList.scrollTo({left: tree.group === null ? 0 : branchList.scrollWidth, behavior: 'smooth'});
 }, [isMobile, tree.command?.id, tree.group, tree.targets.length]);
 const mobileCategoryMenu = <nav className={isMobile && !dockSlots ? 'command-tree-categories' : 'command-tree-root-actions'} aria-label="Command groups" onPointerEnter={cancelScheduledMenuClose} onPointerLeave={event=>{tree.cancelPreview();if(dockSlots||isMobile)dismissMenuOnPointerLeave(event.pointerType);}}>
  {tree.grouped.map((group,index) => mobileReadabilitySplit && index === 1 ? null : <button key={group.label} className="command-tree-row" aria-expanded={tree.group === index && !readabilityInlinePopoverOpen} ref={tree.group === index ? (el => { if (el) dockPopupButtonRef.current = el; }) : undefined}
   onPointerEnter={event => {if(event.pointerType==='touch')return;dockPopupButtonRef.current=event.currentTarget;if(!mobileCommandFocus)updateDockPopupPosition();openCommandGroup(index);}} onFocus={event => {if(!event.currentTarget.matches(':focus-visible'))return;dockPopupButtonRef.current=event.currentTarget;if(!mobileCommandFocus)updateDockPopupPosition();openCommandGroup(index);}}
   onClick={event => {dockPopupButtonRef.current=event.currentTarget;if(!mobileCommandFocus)updateDockPopupPosition();openCommandGroup(index);}}><span className="command-tree-row-label">{group.label}</span>
   {!isMobile && <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>}</button>)}
 </nav>;
 const desktopCategoryNavigation=useDesktopCommandCategoryNavigation(tree,isMobile,atShop,openCommandGroup,button=>{
  cancelScheduledMenuClose();dockPopupButtonRef.current=button;updateDockPopupPosition();
 });
 const desktopCategoryId=desktopCategoryNavigation.selectedId;
 const categoryMenu = isMobile ? mobileCategoryMenu : <DesktopCommandCategoryNav categories={desktopCategoryNavigation.visibleCategories} selectedId={desktopCategoryId}
  onSelect={desktopCategoryNavigation.select} onPointerEnter={cancelScheduledMenuClose}
  onPointerLeave={pointerType=>{tree.cancelPreview();if(dockSlots)dismissMenuOnPointerLeave(pointerType);}} controller={controller} tree={tree}/>;
 const commandToolbar = !isMobile && <><button type="button" className="desktop-dock-toggle" aria-expanded={dockPanels.commandsOpen} aria-controls="desktop-commands-panel" onClick={()=>{if(dockPanels.commandsOpen)closeSubmenu();dockPanels.toggle('commands');}}><span>Commands</span><ChevronUp aria-hidden="true" size={14}/></button><div id="desktop-commands-panel" hidden={!dockPanels.commandsOpen} className="command-tree-dock-action-bar">
  {categoryMenu}
  <div id="desktop-movement-pad-slot" className="desktop-movement-pad-slot" />
 </div></>;
 const gearControls = !isMobile && <nav className="command-tree-gear-controls" aria-label="Equipment and inventory">
  {(['Equipment','Inventory'] as const).map(label=><div key={label} className="command-tree-quick-gear" onPointerEnter={event=>{if(event.pointerType!=='touch'){const button=event.currentTarget.querySelector('button');if(button)openGearMenu(label,button);}}} onPointerLeave={event=>{if(event.pointerType!=='touch'&&gearMenu===label)closeGearMenu();}} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget as Node))closeGearMenu();}}>
   <button type="button" aria-haspopup="true" aria-expanded={gearMenu===label && !readabilityInlinePopoverOpen} title={label} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))openGearMenu(label,event.currentTarget);}} onClick={event=>gearMenu!==label||readabilityInlinePopoverOpen?openGearMenu(label,event.currentTarget):closeGearMenu()}><span className="desktop-control-label">{label}</span></button>
   {gearMenu===label&&!readabilityInlinePopoverOpen&&<CommandTreeGearQuickMenu kind={label} controller={controller} tree={tree} mobileReadabilitySplit={mobileReadabilitySplit} style={{position:'absolute',bottom:'100%',right:0,maxWidth:gearMenuMaxWidth??'calc(100vw - 16px)'}}/>}
  </div>)}
 </nav>;
 const characterSummary = <UiProfiler id="Character summary"><CommandPanelYouSummary fallbackName={game.characterName} scoreLines={controller.ui?.scoreLines}
  executeCommand={game.executeCommand} scopeKey={summaryScopeKey} headerActions={gearControls}/></UiProfiler>;
 const characterSummaryPortal = landscapeSummaryOverlay
  ? <div className="command-tree-v2 landscape-character-summary-overlay">{characterSummary}</div>
  : characterSummary;
 const characterControls = <>{!isMobile && dockSlots && <button type="button" className="desktop-dock-toggle desktop-character-toggle" aria-expanded={dockPanels.characterOpen} aria-controls="desktop-character-controls command-dock-summary" onClick={()=>{if(dockPanels.characterOpen){tree.setQuick(null);closeGearMenu();}dockPanels.toggle('character');}}><span>Character</span><ChevronUp aria-hidden="true" size={14}/></button>}<div id={!isMobile && dockSlots ? 'desktop-character-controls' : undefined} hidden={!isMobile && !!dockSlots && !dockPanels.characterOpen} className="command-tree-dock-controls-inner">
    <nav className="command-tree-state-controls" aria-label="Quick state controls">
     {[['Position', stanceValue], ['Mood', game.mood], ['Cast Speed', game.spellSpeed], ['Alertness', game.alertness]].map(([label,value]) =>
      <div key={label} className="command-tree-quick-state" onPointerDown={event=>quickGesture.onPointerDown(label,event)} onPointerMove={quickGesture.onPointerMove} onPointerUp={quickGesture.onPointerUp} onPointerCancel={quickGesture.onPointerCancel} onLostPointerCapture={quickGesture.onLostPointerCapture} onPointerEnter={event=>{if(event.pointerType!=='touch'&&!game.isSpectateMode)openQuickMenu(label,event.currentTarget);}} onPointerLeave={event=>{if(event.pointerType!=='touch'&&tree.quick===label)tree.setQuick(null);}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null)&&tree.quick===label)tree.setQuick(null);}}>
       <button type="button" disabled={game.isSpectateMode} aria-haspopup="true" aria-expanded={tree.quick === label && !readabilityInlinePopoverOpen} title={`${label === 'Position' ? 'Stance' : label}: ${value || '\u2014'}`} onFocus={event=>{if(event.currentTarget.matches(':focus-visible')&&!game.isSpectateMode)openQuickMenu(label,event.currentTarget);}} onClick={event => {if(quickGesture.shouldSuppressClick()){event.preventDefault();event.stopPropagation();return;} tree.quick === label && !readabilityInlinePopoverOpen ? tree.setQuick(null) : openQuickMenu(label,event.currentTarget);}}><span className="desktop-control-label">{label === 'Position' ? 'Stance' : label}</span><small>{value || '\u2014'}</small></button>
       {tree.quick===label&&!readabilityInlinePopoverOpen&&<section popover="manual" ref={quickMenuPlacement.menuRef} className="command-tree-quick-options" aria-label={label} style={quickMenuPlacement.position}>{tree.quickButtons.map(button=><div key={button.id} data-quick-state-option={button.id} data-quick-state-hovered={quickGesture.hoveredOptionId===button.id||undefined}><CommandTreeAction controller={controller} button={button} selected={button.id === tree.selectedQuickButtonId}/></div>)}</section>}
       </div>)}
     </nav>
   </div></>;
 const menuHeaderInRootBranch = Boolean(dockSlots && tree.group !== null && (!mobileCommandFocus || mobileReadabilitySplit));
 const commandMenuHeader = !isMobile && <CommandTreeMenuHeader showSkills={tree.group === 0} cancelPreview={tree.cancelPreview}/>;
 const commandMenu = <div className={`command-tree-dock-popup${mobileCommandFocus ? ' command-tree-mobile-focus-popup command-tree-v2' : ''}${mobileReadabilitySplit && mobileCommandFocus ? ' command-tree-mobile-readability-popup' : ''}`} role={mobileCommandFocus ? 'dialog' : undefined} aria-modal={mobileCommandFocus || undefined} aria-label={mobileCommandFocus ? 'Command menu' : undefined} style={!mobileCommandFocus && dockPopupPosition ? {
  ...(dockSlots && !isMobile ? {
   left:dockPopupPosition.left ?? 8,
   right:'auto',
   maxWidth:dockPopupPosition.rightMaxWidth ?? dockPopupPosition.maxWidth,
  } : {right:dockPopupPosition.right,maxWidth:dockPopupPosition.maxWidth}),
  bottom:dockPopupPosition.bottom,
  } : undefined} onPointerEnter={cancelScheduledMenuClose} onPointerLeave={event=>dismissMenuOnPointerLeave(event.pointerType)} onClick={event=>{
  if (!isMobile) return;
  if (event.target instanceof Element) {
   if (event.target.closest('[data-command-tree-persistent-shop]')) return;
   const menuItem = event.target.closest('[data-menu-item="true"]');
   if (menuItem && !menuItem.hasAttribute('data-command-tree-selection')) closeMenuAfterAction();
  }
 }}>
  {!menuHeaderInRootBranch && commandMenuHeader}
  {!isMobile && mobileCommandFocus && !mobileReadabilitySplit && categoryMenu}
  <UiProfiler id="Menu branches"><CommandPanelV2Branches controller={controller} tree={tree} branchListRef={branchListRef} isMobile={isMobile}
   mobileReadabilitySplit={mobileReadabilitySplit} desktopCategoryId={desktopCategoryId} atShop={atShop}
   menuHeader={menuHeaderInRootBranch ? commandMenuHeader : undefined} onCommandExecuted={closeMenuAfterAction}/></UiProfiler>
 </div>;
 React.useLayoutEffect(() => {
  if (!mobileCommandFocus || mobileReadabilitySplit) return;
  const branchList = branchListRef.current;
  const branches = branchList?.querySelectorAll<HTMLElement>(':scope > .command-tree-branch');
  const activeBranch = branches?.[branches.length - 1];
  if (activeBranch && typeof activeBranch.scrollIntoView === 'function') {
   activeBranch.scrollIntoView({block:'nearest',inline:tree.command ? 'end' : 'start',behavior:'smooth'});
  }
 }, [mobileCommandFocus, mobileReadabilitySplit, tree.command?.id, tree.command?.command, tree.targets.length]);
 if (dockSlots) return <>
  {createPortal(characterSummaryPortal, landscapeSummaryOverlay ? dockSlots.app : dockSlots.summary)}{createPortal(characterControls, dockSlots.controls)}{createPortal(commandToolbar, dockSlots.actions)}
  {(isMobile || tree.group !== null || controller.isHelpMode) && !readabilityInlinePopoverOpen && createPortal(commandMenu, mobileCommandFocus ? dockSlots.app : dockSlots.menu)}
  <span className="command-tree-portal-host" aria-hidden="true" /><UiProfiler id="Captured output"><CommandTreeOutputs controller={controller}/></UiProfiler>
 </>;
 return <aside className="command-guide-panel unified-command-panel command-tree-v2" aria-label="Command tree">
  {!isMobile && <div className="command-tree-desktop-category-bar">{categoryMenu}</div>}
  {isMobile && !mobileCommandFocus && <div className="command-tree-category-bar">{categoryMenu}</div>}
  <div className="command-tree-flat-layout">
   <section className="command-tree-character-dock" aria-label="Character controls">{characterSummary}{characterControls}</section>
   {!readabilityInlinePopoverOpen
    ? mobileCommandFocus && typeof document !== 'undefined'
     ? createPortal(commandMenu, document.querySelector<HTMLElement>('.app-container') || document.body)
     : commandMenu
    : null}
  </div>
  <UiProfiler id="Captured output"><CommandTreeOutputs controller={controller}/></UiProfiler>
 </aside>;
});
