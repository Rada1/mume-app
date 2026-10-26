/** @file CommandPanelV2.tsx — Minimal command-first branching menu workspace. */
// @refresh reset
import React from 'react';
import { UiProfiler, withUiProfiler } from '../Utility/UiProfiler';
import { uiPerformance } from '../../utils/uiPerformance';
import { createPortal } from 'react-dom';
import { Pin } from 'lucide-react';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTree } from '../../hooks/useCommandTree';
import type { UnifiedCommandActionScope } from '../../hooks/useUnifiedCommandActions';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeOutputs } from './CommandTreeOutputs';
import { CommandTreeGearQuickMenu } from './CommandTreeGearQuickMenu';
import { CommandPanelYouSummary } from './CommandPanelYouSummary';
import { CommandTreeMenuHeader } from './CommandTreeMenuHeader';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useCommandMenuSectionsStore } from '../../stores/useCommandMenuSectionsStore';
import { CommandPanelV2Branches } from './CommandPanelV2Branches';
import './UnifiedCommandPanel.css';
import './CommandPanelV2.css';
import './CommandPanelFlatDock.css';
import './CommandDockStrip.css';
import './CommandDockStripMobile.css';
import './CommandDockMobileFocus.css';
import './CommandDockMobileReadabilityMenus.css';
import { useCommandDockPosition } from '../../hooks/useCommandDockPosition';
import { useQuickStateMenuPosition } from '../../hooks/useQuickStateMenuPosition';
import { useUpwardCommandBranches } from '../../hooks/useUpwardCommandBranches';
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
 const collapsedCommandSections = useCommandMenuSectionsStore(state => state.collapsed);
 const {game} = controller;
 const isReadabilityMode = useSettingsStore(state=>state.isReadabilityMode);
 const activeView = useModeStore(state=>state.activeView);
 const spectateTarget = useModeStore(state=>state.spectateTarget);
 const viewingSpectateTarget = game.isSpectateMode && activeView === 'target';
 const summaryCharacterName = controller.vitals?.characterInfo?.name || game.characterName || '';
 const summaryScopeKey = game.isSpectateMode
  ? `spectate:${viewingSpectateTarget ? spectateTarget || '' : 'self'}`
  : `player:${summaryCharacterName}`;
 const stanceValue = ['riding','mounted'].includes((game.playerPosition || '').toLowerCase()) ? 'standing' : game.playerPosition;
 const [gearMenuPosition, setGearMenuPosition] = React.useState<{right:number;bottom:number;maxWidth:number}|null>(null);
 const gearMenuButtonRef = React.useRef<HTMLElement|null>(null);
 const quickMenuPlacement = useQuickStateMenuPosition(tree.quick);
 const isMobile = game.viewport?.isMobile === true;
 const mobileCommandFocus = Boolean(isMobile && (tree.group !== null || controller.isHelpMode));
 const [menuPinned, setMenuPinned] = React.useState(false);
 const menuPinnedRef = React.useRef(false);
 const menuDismissTimerRef = React.useRef<number|null>(null);
 const menuStateRef = React.useRef({group:tree.group,help:controller.isHelpMode});
 menuStateRef.current = {group:tree.group,help:controller.isHelpMode};
 const cancelScheduledMenuClose = () => {
  if (menuDismissTimerRef.current !== null) window.clearTimeout(menuDismissTimerRef.current);
  menuDismissTimerRef.current = null;
 };
 const resetMenuPin = () => {menuPinnedRef.current = false;setMenuPinned(false);};
 const closeSubmenu = () => {
  cancelScheduledMenuClose();
  if (tree.group !== null) tree.chooseGroup(tree.group);
  if (controller.isHelpMode) controller.toggleHelpMode();
  resetMenuPin();
 };
 const closeMenuAfterAction = () => {
  if (tree.group !== 2 && isMobile && !isReadabilityMode && !menuPinnedRef.current) closeSubmenu();
 };
 const closeSubmenuRef = React.useRef(closeSubmenu);
 closeSubmenuRef.current = closeSubmenu;
 const dismissMenuOnPointerLeave = (pointerType: string) => {
  if (pointerType === 'touch' || menuPinnedRef.current) return;
  cancelScheduledMenuClose();
  const leavingMenu = menuStateRef.current;
  if (leavingMenu.group === null && !leavingMenu.help) return;
  menuDismissTimerRef.current = window.setTimeout(() => {
   menuDismissTimerRef.current = null;
   const currentMenu = menuStateRef.current;
   if (menuPinnedRef.current || currentMenu.group !== leavingMenu.group || currentMenu.help !== leavingMenu.help) return;
   closeSubmenuRef.current();
  }, 220);
 };
 const toggleMenuPin = () => {
  cancelScheduledMenuClose();
  const pinned = !menuPinnedRef.current;
  menuPinnedRef.current = pinned;
  setMenuPinned(pinned);
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
  // Keep pin mode when switching groups so the newly opened menu inherits it.
  tree.chooseGroup(index);
 };
 React.useEffect(() => () => {
  if (menuDismissTimerRef.current !== null) window.clearTimeout(menuDismissTimerRef.current);
 }, []);
 const updateGearMenuPosition = React.useCallback(() => {
  const button = gearMenuButtonRef.current;
  if (!button) return;
  const rect = button.getBoundingClientRect();
  setGearMenuPosition({
   right:Math.max(0, window.innerWidth - rect.right),
   bottom:Math.max(8, window.innerHeight - rect.top),
   maxWidth:Math.max(0, rect.right - 8),
  });
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
 const closeGearMenu = () => {setGearMenu(null); setGearMenuPosition(null); controller.previewEntity(null);};
 const isRotatedLandscape = game.viewport?.isRotatedLandscape === true;
 const [dockSlots, setDockSlots] = React.useState<{summary:HTMLElement;controls:HTMLElement;actions:HTMLElement;menu:HTMLElement;app:HTMLElement}|null>(null);
 const mobileReadabilitySplit = Boolean(isMobile && isReadabilityMode && dockSlots && !isRotatedLandscape);
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
 React.useLayoutEffect(() => {
  if (isRotatedLandscape || typeof document === 'undefined') {setDockSlots(null);return;}
  const summary = document.getElementById('command-dock-summary');
  const controls = document.getElementById('command-dock-controls');
  const actions = document.getElementById('command-dock-actions');
  const menu = document.getElementById('command-dock-menu');
  const app = document.querySelector<HTMLElement>('.app-container');
  if (summary && controls && actions && menu && app) setDockSlots({summary,controls,actions,menu,app});
  else setDockSlots(null);
 }, [isMobile, isRotatedLandscape]);
 React.useLayoutEffect(() => {
  if (!mobileReadabilitySplit || !dockSlots) return;
  const {app,controls,actions,summary} = dockSlots;
  const updateRegion = () => {
   const controlsContent = controls.querySelector<HTMLElement>('.command-tree-dock-controls-inner');
   const actionsContent = actions.querySelector<HTMLElement>('.command-tree-dock-action-bar');
   const input = app.querySelector<HTMLElement>('.command-dock-input-main');
   const controlsBottom = Math.max(
    controlsContent?.getBoundingClientRect().bottom ?? controls.getBoundingClientRect().bottom,
    actionsContent?.getBoundingClientRect().bottom ?? actions.getBoundingClientRect().bottom,
    input?.getBoundingClientRect().bottom ?? 0,
   );
   const summaryContent = summary.querySelector<HTMLElement>('.command-tree-you-summary');
   const summaryTop = (summaryContent ?? summary).getBoundingClientRect().top;
   app.style.setProperty('--mobile-readability-menu-top', `${Math.ceil(controlsBottom + 4)}px`);
   app.style.setProperty('--mobile-readability-menu-bottom', `${Math.max(4, Math.ceil(window.innerHeight - summaryTop + 4))}px`);
  };
  updateRegion();
  const observer = new ResizeObserver(updateRegion);
  observer.observe(controls);
  observer.observe(actions);
  observer.observe(summary);
  const controlsContent = controls.querySelector<HTMLElement>('.command-tree-dock-controls-inner');
  const actionsContent = actions.querySelector<HTMLElement>('.command-tree-dock-action-bar');
  const input = app.querySelector<HTMLElement>('.command-dock-input-main');
  const summaryContent = summary.querySelector<HTMLElement>('.command-tree-you-summary');
  [controlsContent, actionsContent, input, summaryContent].forEach(element => {
   if (element) observer.observe(element);
  });
  const commandColumn = app.querySelector<HTMLElement>('.mobile-command-column');
  if (commandColumn) observer.observe(commandColumn);
  window.addEventListener('resize', updateRegion);
  window.visualViewport?.addEventListener('resize', updateRegion);
  window.visualViewport?.addEventListener('scroll', updateRegion);
  return () => {
   observer.disconnect();
   window.removeEventListener('resize', updateRegion);
   window.visualViewport?.removeEventListener('resize', updateRegion);
   window.visualViewport?.removeEventListener('scroll', updateRegion);
   app.style.removeProperty('--mobile-readability-menu-top');
   app.style.removeProperty('--mobile-readability-menu-bottom');
  };
 }, [dockSlots, mobileReadabilitySplit]);
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
  if (tree.group === null || !tree.section || !tree.command) return;
  const rootBranch = Array.from(branchListRef.current?.querySelectorAll<HTMLElement>('.command-tree-branch') || [])
   .find(branch => branch.getAttribute('aria-label') === tree.grouped[tree.group!]?.label);
  const selectedSection = Array.from(rootBranch?.querySelectorAll<HTMLElement>('.command-tree-section') || [])
   .find(section => section.getAttribute('aria-label') === tree.section);
  const selectedCommand = selectedSection?.querySelector<HTMLElement>('.command-tree-row[aria-expanded="true"]');
  (selectedCommand || selectedSection)?.scrollIntoView({block:'nearest'});
 }, [tree.group, tree.section, tree.command?.id, collapsedCommandSections]);
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
 const categoryMenu = <nav className={isMobile && !dockSlots ? 'command-tree-categories' : 'command-tree-root-actions'} aria-label="Command groups" onPointerEnter={cancelScheduledMenuClose} onPointerLeave={event=>{tree.cancelPreview();if(dockSlots||isMobile)dismissMenuOnPointerLeave(event.pointerType);}}>
  {tree.grouped.map((group,index) => mobileReadabilitySplit && index === 1 ? null : <button key={group.label} className="command-tree-row" aria-expanded={tree.group === index && !readabilityInlinePopoverOpen} ref={tree.group === index ? (el => { if (el) dockPopupButtonRef.current = el; }) : undefined}
   onPointerEnter={event => {if(event.pointerType==='touch')return;dockPopupButtonRef.current=event.currentTarget;if(!mobileCommandFocus)updateDockPopupPosition();openCommandGroup(index);}} onFocus={event => {if(!event.currentTarget.matches(':focus-visible'))return;dockPopupButtonRef.current=event.currentTarget;if(!mobileCommandFocus)updateDockPopupPosition();openCommandGroup(index);}}
   onClick={event => {dockPopupButtonRef.current=event.currentTarget;if(!mobileCommandFocus)updateDockPopupPosition();openCommandGroup(index);}}><span className="command-tree-row-label">{group.label}</span>
   {!isMobile && <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>}</button>)}
 </nav>;
 const commandToolbar = <div className="command-tree-dock-action-bar">
  {categoryMenu}
 </div>;
 const characterSummary = <UiProfiler id="Character summary"><CommandPanelYouSummary fallbackName={game.characterName} scoreLines={controller.ui?.scoreLines}
  executeCommand={game.executeCommand} scopeKey={summaryScopeKey}/></UiProfiler>;
 const characterControls = <div className="command-tree-dock-controls-inner">
    <nav className="command-tree-state-controls" aria-label="Quick state controls">
     {[['Position', stanceValue], ['Mood', game.mood], ['Cast Speed', game.spellSpeed], ['Alertness', game.alertness]].map(([label,value]) =>
      <div key={label} className="command-tree-quick-state" onPointerEnter={event=>{if(event.pointerType!=='touch'&&!game.isSpectateMode)openQuickMenu(label,event.currentTarget);}} onPointerLeave={event=>{if(event.pointerType!=='touch'&&tree.quick===label)tree.setQuick(null);}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null)&&tree.quick===label)tree.setQuick(null);}}>
       <button type="button" disabled={game.isSpectateMode} aria-haspopup="true" aria-expanded={tree.quick === label && !readabilityInlinePopoverOpen} onFocus={event=>{if(event.currentTarget.matches(':focus-visible')&&!game.isSpectateMode)openQuickMenu(label,event.currentTarget);}} onClick={event => tree.quick === label && !readabilityInlinePopoverOpen ? tree.setQuick(null) : openQuickMenu(label,event.currentTarget)}>{label === 'Position' ? 'Stance' : label}<small>{value || '\u2014'}</small></button>
       {tree.quick===label&&!readabilityInlinePopoverOpen&&<section popover="manual" ref={quickMenuPlacement.menuRef} className="command-tree-quick-options" aria-label={label} style={quickMenuPlacement.position}>{tree.quickButtons.map(button=><CommandTreeAction key={button.id} controller={controller} button={button} selected={button.id === tree.selectedQuickButtonId}/>)}</section>}
       </div>)}
     </nav>
     {!isMobile&&<nav className="command-tree-gear-controls" aria-label="Room, equipment and inventory">
      {(['Room','Equipment','Inventory'] as const).map(label=><div key={label} className="command-tree-quick-gear" onPointerEnter={event=>{if(event.pointerType!=='touch'){const button=event.currentTarget.querySelector('button');if(button)openGearMenu(label,button);}}} onPointerLeave={event=>{if(event.pointerType!=='touch'&&gearMenu===label)closeGearMenu();}} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget as Node))closeGearMenu();}}>
       <button type="button" aria-haspopup="true" aria-expanded={gearMenu===label && !readabilityInlinePopoverOpen} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))openGearMenu(label,event.currentTarget);}} onClick={event=>label==='Room'||gearMenu!==label||readabilityInlinePopoverOpen?openGearMenu(label,event.currentTarget):closeGearMenu()}>{label==='Equipment'?'Equipped':label}</button>
       {!isMobile&&gearMenu===label&&!readabilityInlinePopoverOpen&&<CommandTreeGearQuickMenu kind={label} controller={controller} tree={tree} mobileReadabilitySplit={mobileReadabilitySplit} style={{position:'fixed',left:'auto',right:gearMenuPosition?.right??8,bottom:gearMenuPosition?.bottom??8,width:'max-content',maxWidth:gearMenuPosition?.maxWidth??'calc(100vw - 16px)'}}/>}
      </div>)}
     </nav>}
   </div>;
 const menuHeaderInRootBranch = Boolean(dockSlots && tree.group !== null && (!mobileCommandFocus || mobileReadabilitySplit));
 const commandMenuHeader = !isMobile && <CommandTreeMenuHeader root={menuHeaderInRootBranch} showSkills={tree.group === 0}
   helpMode={controller.isHelpMode} pinned={menuPinned} cancelPreview={tree.cancelPreview}
   onHelp={controller.toggleHelpMode} onPin={toggleMenuPin} showClose={mobileCommandFocus} onClose={closeSubmenu}/>;
 const commandMenu = <div className={`command-tree-dock-popup${mobileCommandFocus ? ' command-tree-mobile-focus-popup command-tree-v2' : ''}${mobileReadabilitySplit && mobileCommandFocus ? ' command-tree-mobile-readability-popup' : ''}`} role={mobileCommandFocus ? 'dialog' : undefined} aria-modal={mobileCommandFocus || undefined} aria-label={mobileCommandFocus ? 'Command menu' : undefined} style={!mobileCommandFocus && dockPopupPosition ? {
  ...(dockSlots && !isMobile ? {
   left:dockPopupPosition.left ?? 8,
   right:'auto',
   maxWidth:dockPopupPosition.rightMaxWidth ?? dockPopupPosition.maxWidth,
  } : {right:dockPopupPosition.right,maxWidth:dockPopupPosition.maxWidth}),
  bottom:dockPopupPosition.bottom,
  } : undefined} onPointerEnter={cancelScheduledMenuClose} onPointerLeave={event=>dismissMenuOnPointerLeave(event.pointerType)} onClick={event=>{
  if (!isMobile || menuPinnedRef.current) return;
  if (event.target instanceof Element) {
   const menuItem = event.target.closest('[data-menu-item="true"]');
   if (menuItem && !menuItem.hasAttribute('data-command-tree-selection')) closeMenuAfterAction();
  }
 }}>
  {!menuHeaderInRootBranch && commandMenuHeader}
  {mobileCommandFocus && !mobileReadabilitySplit && categoryMenu}
  <UiProfiler id="Menu branches"><CommandPanelV2Branches controller={controller} tree={tree} branchListRef={branchListRef} isMobile={isMobile}
   hasDockSlots={Boolean(dockSlots)} mobileReadabilitySplit={mobileReadabilitySplit} menuHeaderInRootBranch={menuHeaderInRootBranch}
   commandMenuHeader={commandMenuHeader} categoryMenu={categoryMenu} onCommandExecuted={closeMenuAfterAction}/></UiProfiler>
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
  {createPortal(characterSummary, dockSlots.summary)}{createPortal(characterControls, dockSlots.controls)}{createPortal(commandToolbar, dockSlots.actions)}
  {(tree.group !== null || controller.isHelpMode) && !readabilityInlinePopoverOpen && createPortal(commandMenu, mobileCommandFocus ? dockSlots.app : dockSlots.menu)}
  <span className="command-tree-portal-host" aria-hidden="true" /><UiProfiler id="Captured output"><CommandTreeOutputs controller={controller}/></UiProfiler>
 </>;
 return <aside className="command-guide-panel unified-command-panel command-tree-v2" aria-label="Command tree">
  {!isMobile && <header className="command-tree-header"><span className="command-tree-header-title">COMMANDS</span><span className="command-tree-header-spacer" aria-hidden="true" />
   <button onClick={controller.toggleHelpMode} aria-pressed={controller.isHelpMode}>Help</button>
   <button type="button" aria-label={menuPinned?'Unpin command menu':'Pin command menu'} title={menuPinned?'Unpin command menu':'Pin command menu'} aria-pressed={menuPinned} onClick={toggleMenuPin}><Pin size={14} fill={menuPinned?'currentColor':'none'}/></button>
  </header>}
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
