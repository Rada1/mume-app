/** @file DesktopCommandCategoryNav.tsx — One-level desktop command family navigation. */
import React from 'react';
import type { useCommandTree } from '../../hooks/useCommandTree';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useMobileCommandTiles } from '../../hooks/useMobileCommandTiles';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { MobileCommandLabel } from './MobileCommandLabel';
import type { DesktopCommandCategory } from '../../utils/desktopCommandCategories';
import { getDesktopCategoryCommands } from '../../utils/desktopCommandCategories';
import { DESKTOP_SOCIAL_COMMANDS } from '../../utils/desktopSocialCommands';
import { useDesktopCommandDefaults } from '../../hooks/useDesktopCommandDefaults';

// --- Category navigation ---
export const DesktopCommandCategoryNav = ({categories,selectedId,onSelect,onPointerEnter,onPointerLeave,controller,tree}: {
 categories:DesktopCommandCategory[];selectedId:string|null;onSelect:(category:DesktopCommandCategory,button:HTMLButtonElement)=>void;
 onPointerEnter:()=>void;onPointerLeave:(pointerType:string)=>void;
 controller:ReturnType<typeof useCommandTreeController>;tree:ReturnType<typeof useCommandTree>;
}) => {
 const model=useMobileCommandTiles(controller,tree);
 const defaults=useDesktopCommandDefaults(controller.game.characterName);
 const extraCommands=React.useMemo(()=>new Map(categories.flatMap(category=>{
  const saved=defaults.saved?.[category.id];
  const family=model.tiles.find(tile=>tile.id===category.id);
  return category.id!=='social' && saved && !family?.commands.some(button=>button.command===saved)
   ? [[category.id,getDesktopCategoryCommands(category,tree.grouped)] as const] : [];
 })),[categories,defaults.saved,model.tiles,tree.grouped]);
 return <nav className="command-tree-root-actions command-tree-desktop-category-actions" aria-label="Command categories"
  onPointerEnter={onPointerEnter} onPointerLeave={event=>onPointerLeave(event.pointerType)}>
  {categories.map(category=>{
   const tile=model.tiles.find(entry=>entry.id===category.id);
   const familyCommands=category.id==='social' ? DESKTOP_SOCIAL_COMMANDS : tile?.commands || [];
   const commands=extraCommands.get(category.id) || familyCommands;
   const action=defaults.resolve(category.id,commands,tile?.button.command)
    || tile?.commands.find(button=>button.command===tile.button.command);
   const actionLabel=action?.label.replace(/%n/g,'').trim() || 'Browse';
   const usesTarget=Boolean(action&&model.usesTargetChip(action));
   return <button key={category.id} type="button" className="command-tree-row" title={`${category.label}: ${actionLabel}`}
    aria-label={action ? `${category.label}: ${actionLabel}. Click to execute, right-click to browse commands.` : `${category.label}: browse commands.`}
    aria-pressed={selectedId===category.id} onPointerEnter={event=>{if(event.pointerType==='mouse')onSelect(category,event.currentTarget);}}
    onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))onSelect(category,event.currentTarget);}}
    onContextMenu={event=>{event.preventDefault();onSelect(category,event.currentTarget);}}
    onKeyDown={event=>{if(event.key===' '){event.preventDefault();onSelect(category,event.currentTarget);}}}
    onClick={event=>action ? model.execute(action,event) : onSelect(category,event.currentTarget)}>
    <span className="desktop-command-category-name">{category.label}</span>
    <strong className="desktop-command-category-action" style={{color:action?getCommandTextColor(action.command,action.setId):undefined}}>
     <MobileCommandLabel label={actionLabel} usesTargetChip={usesTarget}/>
    </strong>
   </button>;
  })}
 </nav>;
};
