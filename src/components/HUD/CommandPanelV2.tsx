/** @file CommandPanelV2.tsx — Minimal command-first branching menu workspace. */
// @refresh reset
import React from 'react';
import { createPortal } from 'react-dom';
import { Pin } from 'lucide-react';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTree } from '../../hooks/useCommandTree';
import type { UnifiedCommandActionScope } from '../../hooks/useUnifiedCommandActions';
import { CommandTreeTransferTargets } from './CommandTreeTransferTargets';
import { isCommandTreeTransfer } from '../../utils/commandTreeTransfer';
import { CommandTreeAccessTargets } from './CommandTreeAccessTargets';
import { isCommandTreeAccess } from '../../utils/commandTreeAccess';
import { CommandTreeObservationTargets } from './CommandTreeObservationTargets';
import { isCommandTreeObservation } from '../../utils/commandTreeObservation';
import { CommandTreeGetTargets } from './CommandTreeGetTargets';
import { isCommandTreeGetAction } from '../../utils/commandTreeGet';
import { CommandTreePracticeTargets } from './CommandTreePracticeTargets';
import { isCommandTreePracticeAction } from '../../utils/commandTreePractice';
import { CommandTreeShopTargets } from './CommandTreeShopTargets';
import { isCommandTreeShopAction } from '../../utils/commandTreeShop';
import { CommandTreeSections } from './CommandTreeSections';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeOutputs } from './CommandTreeOutputs';
import { CommandPanelViews } from './CommandPanelViews';
import { OnlineCommandTargets } from '../Popovers/StandardMenu/OnlineCommandTargets';
import { CommandTreeGearQuickMenu } from './CommandTreeGearQuickMenu';
import { CommandPanelYouSummary } from './CommandPanelYouSummary';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeMenuHeader } from './CommandTreeMenuHeader';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import { useModeStore } from '../../stores/useModeStore';
import './UnifiedCommandPanel.css';
import './CommandPanelV2.css';
import './CommandDockStrip.css';
import { useCommandDockPosition } from '../../hooks/useCommandDockPosition';
import { useQuickStateMenuPosition } from '../../hooks/useQuickStateMenuPosition';
import { useUpwardCommandBranches } from '../../hooks/useUpwardCommandBranches';
// --- Render Section ---
const getObjectTargetSections = (entries: CommandActionTargetEntry[]) => [
 {label:'Room Objects',entries:entries.filter(entry=>entry.group==='objects'&&entry.scope==='room')},
 {label:'Inventory',entries:entries.filter(entry=>entry.group==='inventory')},
 {label:'Worn',entries:entries.filter(entry=>entry.group==='worn')}
].filter(section=>section.entries.length>0);
const getCommandTargetSections = (entries: CommandActionTargetEntry[]) => {
 const sections: {label:string;entries:CommandActionTargetEntry[]}[] = [
 {label:'Room Entities',entries:entries.filter(entry=>entry.scope==='room'&&['players','npcs'].includes(entry.group)&&entry.category!=='cat-exit')},
 {label:'Room Objects',entries:entries.filter(entry=>entry.scope==='room'&&entry.group==='objects')},
 {label:'Doors',entries:entries.filter(entry=>entry.scope==='room'&&entry.category==='cat-exit'&&entry.hasDoor===true)},
 {label:'Exits',entries:entries.filter(entry=>entry.scope==='room'&&entry.category==='cat-exit'&&entry.hasDoor!==true)},
 {label:'You',entries:entries.filter(entry=>entry.scope==='self'&&entry.group!=='inventory'&&entry.group!=='worn')},
 {label:'Inventory',entries:entries.filter(entry=>entry.scope==='self'&&entry.group==='inventory')},
 {label:'Worn',entries:entries.filter(entry=>entry.scope==='self'&&entry.group==='worn')},
 {label:'Group Members',entries:entries.filter(entry=>entry.scope==='remote'||entry.group==='group')},
 {label:'Weather',entries:entries.filter(entry=>entry.group==='weather')}
 ];
 const assigned = new Set(sections.flatMap(section=>section.entries.map(entry=>entry.id)));
 const otherEntries = entries.filter(entry=>!assigned.has(entry.id));
 if (otherEntries.length) sections.push({label:'Other Targets',entries:otherEntries});
 return sections.filter(section=>section.entries.length>0);
};

export const CommandPanelV2 = ({initialScope, onClose}: {initialScope?: UnifiedCommandActionScope; onClose?: () => void}) => {
 const controller = useCommandTreeController(initialScope, onClose);
 const tree = useCommandTree(controller);
 const {game} = controller;
 const activeView = useModeStore(state=>state.activeView);
 const spectateTarget = useModeStore(state=>state.spectateTarget);
 const viewingSpectateTarget = game.isSpectateMode && activeView === 'target';
 const summaryCharacterName = controller.vitals.characterInfo.name || game.characterName || '';
 const summaryScopeKey = game.isSpectateMode
  ? `spectate:${viewingSpectateTarget ? spectateTarget || '' : 'self'}`
  : `player:${summaryCharacterName}`;
 const stanceValue = ['riding','mounted'].includes((game.playerPosition || '').toLowerCase()) ? 'standing' : game.playerPosition;
 const [gearMenu, setGearMenu] = React.useState<'Inventory'|'Equipment'|null>(null);
 const [gearMenuBottom, setGearMenuBottom] = React.useState<number|null>(null);
 const gearMenuButtonRef = React.useRef<HTMLElement|null>(null);
 const quickMenuPlacement = useQuickStateMenuPosition(tree.quick);
 const isMobile = game.viewport?.isMobile === true;
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
 const openCommandGroup = (index:number, toggleIfOpen = false) => {
  cancelScheduledMenuClose();
  if (tree.group === index) {
   if (toggleIfOpen) {resetMenuPin();tree.chooseGroup(index);}
   return;
  }
  // Keep pin mode when switching groups so the newly opened menu inherits it.
  tree.chooseGroup(index);
 };
 React.useEffect(() => () => {
  if (menuDismissTimerRef.current !== null) window.clearTimeout(menuDismissTimerRef.current);
 }, []);
 const openGearMenu = (label: 'Inventory'|'Equipment', button: HTMLElement) => {
  if (tree.group !== null || controller.isHelpMode) closeSubmenu();
  gearMenuButtonRef.current = button;
  if (isMobile) setGearMenuBottom(Math.max(8, window.innerHeight - button.getBoundingClientRect().top + 4));
  setGearMenu(label);
 };
 const closeGearMenu = () => {setGearMenu(null); setGearMenuBottom(null); controller.previewEntity(null);};
 const isRotatedLandscape = game.viewport?.isRotatedLandscape === true;
 const [dockSlots, setDockSlots] = React.useState<{summary:HTMLElement;controls:HTMLElement;actions:HTMLElement;menu:HTMLElement}|null>(null);
 const {position:dockPopupPosition, anchorRef:dockPopupButtonRef, update:updateDockPopupPosition} = useCommandDockPosition(isMobile, tree.group !== null);
 const openQuickMenu = (label: string, button: HTMLElement) => {
  if (tree.group !== null || controller.isHelpMode) closeSubmenu();
  quickMenuPlacement.anchorRef.current = button;
  tree.setQuick(label);
 };
 React.useLayoutEffect(() => {
  if (isRotatedLandscape || typeof document === 'undefined') {setDockSlots(null);return;}
  const summary = document.getElementById('command-dock-summary');
  const controls = document.getElementById('command-dock-controls');
  const actions = document.getElementById('command-dock-actions');
  const menu = document.getElementById('command-dock-menu');
  if (summary && controls && actions && menu) setDockSlots({summary,controls,actions,menu});
  else setDockSlots(null);
 }, [isMobile, isRotatedLandscape]);
 React.useEffect(() => {
  if (!isMobile || !gearMenu) return;
  const update = () => {
   const button = gearMenuButtonRef.current;
   if (button) setGearMenuBottom(Math.max(8, window.innerHeight - button.getBoundingClientRect().top + 4));
  };
  window.addEventListener('resize', update);
  const onScroll = (event: Event) => {
   const target = event.target;
   if (target instanceof Element && target.contains(gearMenuButtonRef.current)) update();
  };
  window.addEventListener('scroll', onScroll, true);
  return () => {
   window.removeEventListener('resize', update);
   window.removeEventListener('scroll', onScroll, true);
  };
 }, [gearMenu, isMobile]);
 const branchListRef = React.useRef<HTMLDivElement>(null);
 React.useLayoutEffect(() => {
  if (tree.group === null) return;
  const rootBranch = Array.from(branchListRef.current?.querySelectorAll<HTMLElement>('.command-tree-branch') || [])
   .find(branch => branch.getAttribute('aria-label') === tree.grouped[tree.group!]?.label);
  if (rootBranch) rootBranch.scrollTop = rootBranch.scrollHeight;
 }, [tree.group]);
 React.useLayoutEffect(() => {
  if (tree.group === null || !tree.command) return;
  const branches = Array.from(branchListRef.current?.querySelectorAll<HTMLElement>('.command-tree-branch') || []);
  const submenu = branches[branches.length - 1];
  if (branches.length > 1 && submenu) submenu.scrollTop = submenu.scrollHeight;
 }, [tree.group, tree.command?.id, tree.command?.command]);
 useUpwardCommandBranches(branchListRef, Boolean(dockSlots && tree.group !== null));
 React.useEffect(() => {
  if (isMobile || typeof window === 'undefined' || window.innerWidth < 641) return;
  const branchList = branchListRef.current;
  if (!branchList) return;
  branchList.scrollTo({left: tree.group === null ? 0 : branchList.scrollWidth, behavior: 'smooth'});
 }, [isMobile, tree.command?.id, tree.group, tree.targets.length]);
 const atShop = controller.shop.atShop ?? controller.shop.available;
 const isBashTargetCommand = Boolean(tree.command && /^bash\s+%n(?:\||\s|$)/i.test(tree.command.command.trim()));
 const isOnlinePlayerTargetCommand = Boolean(tree.command && /^(?:tell|whois)\b/i.test(tree.command.command.trim()));
 const isTellTargetCommand = Boolean(tree.command && /^tell\b/i.test(tree.command.command.trim()));
 const bashTargetSections = isBashTargetCommand ? [
  {label:'Room Entities',emptyLabel:'No room entities available.',entries:tree.targets.filter(entry=>entry.scope==='room'&&['players','npcs'].includes(entry.group)&&entry.category!=='cat-exit')},
  {label:'Doors',emptyLabel:'No doors available.',entries:tree.targets.filter(entry=>entry.category==='cat-exit'&&entry.hasDoor===true)}
 ] : [];
 const objectTargetSections = tree.targets.length && tree.targets.every(entry=>['objects','inventory','worn'].includes(entry.group))
  ? getObjectTargetSections(tree.targets) : [];
 const commandTargetSections = getCommandTargetSections(tree.targets);
 const renderTarget = (entry: CommandActionTargetEntry, displayLabel = entry.id === 'command-panel-self' ? 'Self' : entry.label) => <div key={entry.id} onMouseEnter={() => entry.id === 'command-panel-self' ? controller.previewTargetContext('self') : entry.id === 'command-panel-room' ? controller.previewTargetContext('room') : controller.previewEntity(entry)} onFocus={() => entry.id === 'command-panel-self' ? controller.previewTargetContext('self') : controller.previewEntity(entry)}>
  <CommandTreeAction targetLabel={displayLabel} targetGearRow={entry.gearRow} targetShowSlot={/^remove\b/i.test(tree.command?.command || '') && entry.group === 'worn'} controller={controller} button={tree.command!} targetState={{x:0,y:0,type:'menu',setId:entry.category,category:entry.category,context:entry.context,keyword:entry.keyword,displayName:displayLabel,entityId:entry.id,parentNoun:entry.parentNoun,hasDoor:entry.hasDoor}}/>
 </div>;
 const categoryMenu = <nav className={isMobile && !dockSlots ? 'command-tree-categories' : 'command-tree-root-actions'} aria-label="Command groups" onPointerEnter={cancelScheduledMenuClose} onPointerLeave={event=>{tree.cancelPreview();if(dockSlots||isMobile)dismissMenuOnPointerLeave(event.pointerType);}}>
  {tree.grouped.map((group,index) => <button key={group.label} className="command-tree-row" aria-expanded={tree.group === index}
   onPointerEnter={event => {if(event.pointerType==='touch')return;dockPopupButtonRef.current=event.currentTarget;updateDockPopupPosition();openCommandGroup(index);}} onFocus={event => {if(!event.currentTarget.matches(':focus-visible'))return;dockPopupButtonRef.current=event.currentTarget;updateDockPopupPosition();openCommandGroup(index);}}
   onClick={event => {dockPopupButtonRef.current=event.currentTarget;updateDockPopupPosition();openCommandGroup(index,true);}}><span className="command-tree-row-label">{group.label}</span>
   {!isMobile && <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>}</button>)}
 </nav>;
 const commandToolbar = <div className="command-tree-dock-action-bar">
  {categoryMenu}
 </div>;
 const characterSummary = <CommandPanelYouSummary fallbackName={game.characterName} scoreLines={controller.ui.scoreLines}
  executeCommand={game.executeCommand} scopeKey={summaryScopeKey}/>;
 const characterControls = <div className="command-tree-dock-controls-inner">
    <nav className="command-tree-state-controls" aria-label="Quick state controls">
     {[['Mood', game.mood], ['Cast Speed', game.spellSpeed], ['Alertness', game.alertness], ['Position', stanceValue]].map(([label,value]) =>
      <div key={label} className="command-tree-quick-state" onPointerEnter={event=>{if(event.pointerType!=='touch'&&!game.isSpectateMode)openQuickMenu(label,event.currentTarget);}} onPointerLeave={event=>{if(event.pointerType!=='touch'&&tree.quick===label)tree.setQuick(null);}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null)&&tree.quick===label)tree.setQuick(null);}}>
       <button type="button" disabled={game.isSpectateMode} aria-haspopup="true" aria-expanded={tree.quick === label} onFocus={event=>{if(event.currentTarget.matches(':focus-visible')&&!game.isSpectateMode)openQuickMenu(label,event.currentTarget);}} onClick={event => tree.quick === label ? tree.setQuick(null) : openQuickMenu(label,event.currentTarget)}>{label === 'Position' ? 'Stance' : label}<small>{value || '\u2014'}</small></button>
       {tree.quick===label&&<section ref={quickMenuPlacement.menuRef} className="command-tree-quick-options" aria-label={label} style={quickMenuPlacement.position}>{tree.quickButtons.map(button=><CommandTreeAction key={button.id} controller={controller} button={button}/>)}</section>}
       </div>)}
     </nav>
     <nav className="command-tree-gear-controls" aria-label="Equipment and inventory">
      {(['Equipment','Inventory'] as const).map(label=><div key={label} className="command-tree-quick-gear" onPointerEnter={event=>{if(event.pointerType!=='touch'){const button=event.currentTarget.querySelector('button');if(button)openGearMenu(label,button);}}} onPointerLeave={event=>{if(event.pointerType!=='touch'&&gearMenu===label)closeGearMenu();}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))closeGearMenu();}}>
       <button type="button" aria-haspopup="true" aria-expanded={gearMenu===label} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))openGearMenu(label,event.currentTarget);}} onClick={event=>gearMenu===label?closeGearMenu():openGearMenu(label,event.currentTarget)}>{label==='Equipment'?'Equipped':label}</button>
       {gearMenu===label&&<CommandTreeGearQuickMenu kind={label} controller={controller} tree={tree} style={isMobile?{position:'fixed',left:'auto',right:8,bottom:gearMenuBottom??8,width:'max-content',maxWidth:'calc(100vw - 16px)'}:undefined}/>}
      </div>)}
     </nav>
   </div>;
 const menuHeaderInRootBranch = Boolean(dockSlots && tree.group !== null);
 const commandMenuHeader = <CommandTreeMenuHeader root={menuHeaderInRootBranch} showSkills={tree.group === 0}
   helpMode={controller.isHelpMode} pinned={menuPinned} cancelPreview={tree.cancelPreview}
   onHelp={controller.toggleHelpMode} onPin={toggleMenuPin}/>;
 const commandMenu = <div className="command-tree-dock-popup" style={dockPopupPosition ? {
  right:dockPopupPosition.right,
  bottom:dockPopupPosition.bottom,
  maxWidth:dockPopupPosition.maxWidth,
 } : undefined} onPointerEnter={cancelScheduledMenuClose} onPointerLeave={event=>dismissMenuOnPointerLeave(event.pointerType)}>
  {!menuHeaderInRootBranch && commandMenuHeader}
  <CommandPanelViews communication={controller.communication}>
    {controller.isHelpMode && <p className="command-tree-hint">Choose an action to inspect its help.</p>}
    <div ref={branchListRef} className="command-tree-branches" onMouseLeave={tree.cancelPreview}>
      {!isMobile && !dockSlots && categoryMenu}
     {tree.group !== null && <CommandTreeSections controller={controller} tree={tree} menuHeader={menuHeaderInRootBranch ? commandMenuHeader : undefined}/>}
     {tree.command && !isCommandTreeTransfer(tree.command) && !isCommandTreeAccess(tree.command) && !isCommandTreeObservation(tree.command) && !isCommandTreeGetAction(tree.command) && !isCommandTreeShopAction(tree.command) && !isCommandTreePracticeAction(tree.command) && /%n/.test(tree.command.command) && <section className="command-tree-branch terminal-inline-popover" aria-label={`Targets for ${tree.command.label}`}>
     <CommandTreeTargetHeader/>
     {!isOnlinePlayerTargetCommand && (isBashTargetCommand ? bashTargetSections.map(section=><CommandTreeCollapsibleSection key={section.label} label={section.label}>
      <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
       {section.entries.map(entry=>renderTarget(entry,entry.category==='cat-exit'?`${entry.doorName||'Door'} (${entry.label})`:entry.label))}
       {!section.entries.length&&<p className="command-tree-section-empty">{section.emptyLabel}</p>}
      </div>
     </CommandTreeCollapsibleSection>) : objectTargetSections.length ? objectTargetSections.map(section=><CommandTreeCollapsibleSection key={section.label} label={section.label}>
      <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>{section.entries.map(entry => renderTarget(entry))}</div>
     </CommandTreeCollapsibleSection>) : commandTargetSections.map(section=><CommandTreeCollapsibleSection key={section.label} label={section.label}>
      <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>{section.entries.map(entry=>renderTarget(entry))}</div>
     </CommandTreeCollapsibleSection>))}
     {isTellTargetCommand && Boolean(game.groupMembers?.length) && <CommandTreeCollapsibleSection label="Group">
       <button type="button" className="command-tree-row" onClick={() => controller.communication.handleCommand('tell group')}>Group</button>
     </CommandTreeCollapsibleSection>}
     {isOnlinePlayerTargetCommand && <CommandTreeCollapsibleSection label="Online Players">
      <OnlineCommandTargets hideHeader open excludedNames={isTellTargetCommand ? [game.characterName || ''] : []}
       onPreviewTarget={controller.previewEntity}
       onSelect={entry => {
        if (isTellTargetCommand) {
         controller.communication.handleCommand(`tell ${entry.context}`);
         return;
        }
        controller.dismissOutputs();
        controller.requestWhois(entry);
       }}/>
     </CommandTreeCollapsibleSection>}
     {!tree.targets.length && !isBashTargetCommand && !isOnlinePlayerTargetCommand && <p>No available targets.</p>}
    </section>}
    {tree.command && isCommandTreeTransfer(tree.command) && <CommandTreeTransferTargets key={tree.command.id} controller={controller} tree={tree} command={tree.command}/>}
    {tree.command && isCommandTreeGetAction(tree.command) && <CommandTreeGetTargets key={tree.command.id} controller={controller} tree={tree} button={tree.command} targets={tree.targets}/>}
    {tree.command && isCommandTreeAccess(tree.command) && <CommandTreeAccessTargets controller={controller} button={tree.command} targets={tree.targets}/>}
    {tree.command && isCommandTreeObservation(tree.command) && <CommandTreeObservationTargets controller={controller} button={tree.command} targets={tree.targets}/>}
    {tree.command && isCommandTreePracticeAction(tree.command) && <CommandTreePracticeTargets controller={controller}/>}
    {tree.command && atShop && isCommandTreeShopAction(tree.command) && <CommandTreeShopTargets controller={controller} command={tree.command}/>}
    </div>
  </CommandPanelViews>
 </div>;
 if (dockSlots) return <>
  {createPortal(characterSummary, dockSlots.summary)}
  {createPortal(characterControls, dockSlots.controls)}
  {createPortal(commandToolbar, dockSlots.actions)}
  {(tree.group !== null || controller.isHelpMode) && createPortal(commandMenu, dockSlots.menu)}
  <span className="command-tree-portal-host" aria-hidden="true" />
  <CommandTreeOutputs controller={controller}/>
 </>;
 return <aside className="command-guide-panel unified-command-panel command-tree-v2" aria-label="Command tree">
  <header className="command-tree-header"><span className="command-tree-header-title">COMMANDS</span><span className="command-tree-header-spacer" aria-hidden="true" />
   <button onClick={controller.toggleHelpMode} aria-pressed={controller.isHelpMode}>Help</button>
   <button type="button" aria-label={menuPinned?'Unpin command menu':'Pin command menu'} title={menuPinned?'Unpin command menu':'Pin command menu'} aria-pressed={menuPinned} onClick={toggleMenuPin}><Pin size={14} fill={menuPinned?'currentColor':'none'}/></button>
  </header>
  {isMobile && <div className="command-tree-category-bar">{categoryMenu}</div>}
  <div className="command-tree-flat-layout">
   <section className="command-tree-character-dock" aria-label="Character controls">
    {characterSummary}
    {characterControls}
   </section>
   {commandMenu}
  </div>
  <CommandTreeOutputs controller={controller}/>
 </aside>;
};
