/** @file DesktopCommandCategoryCommands.tsx — Flat command list for one desktop family. */
import React from 'react';
import type { useCommandTree } from '../../hooks/useCommandTree';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { commandTreeGroup } from '../../utils/commandTreeGroups';
import { getDesktopCommandCategories,getDesktopCategoryCommands } from '../../utils/desktopCommandCategories';
import { CommandTreeCommandList } from './CommandTreeCommandList';
import { useDesktopCommandDefaults } from '../../hooks/useDesktopCommandDefaults';
import { DesktopCommandPin } from './DesktopCommandPin';

// --- Active category commands ---
export const DesktopCommandCategoryCommands = ({categoryId,atShop,controller,tree,onCommandExecuted,menuHeader}: {
 categoryId:string|null;atShop:boolean;controller:ReturnType<typeof useCommandTreeController>;
 tree:ReturnType<typeof useCommandTree>;onCommandExecuted:()=>void;menuHeader?:React.ReactNode;
}) => {
 const category=getDesktopCommandCategories(atShop).find(entry=>entry.id===categoryId);
 const buttons=React.useMemo(()=>category?getDesktopCategoryCommands(category,tree.grouped):[],[category,tree.grouped]);
 const defaults=useDesktopCommandDefaults(controller.game.characterName);
 const selected=category ? defaults.resolve(category.id,buttons) : undefined;
 const chooseGroupForCommand=React.useCallback((button:Parameters<typeof commandTreeGroup>[0])=>{
  const group=commandTreeGroup(button);
  if(group!==null&&tree.group!==group)tree.chooseGroup(group);
 },[tree.group,tree.chooseGroup]);
 if(!category)return null;
 return <section key={category.id} className="command-tree-branch terminal-inline-popover command-tree-main-branch desktop-command-category-branch" aria-label={`${category.label} commands`}>
  {menuHeader}
  <div className="desktop-command-category-list" role="group" aria-label={`${category.label} commands`}>
   <CommandTreeCommandList buttons={buttons} tree={tree} controller={controller} onCommandExecuted={onCommandExecuted} beforeChooseCommand={chooseGroupForCommand}
    renderCommandRow={category.id==='shop' ? undefined : (button,row)=><DesktopCommandPin key={button.id} label={button.label.replace(/%n/g,'').trim()}
     selected={selected?.command===button.command} onSelect={()=>{tree.cancelPreview();defaults.setDefault(category.id,button);}}>{row}</DesktopCommandPin>}/>
   {!buttons.length&&<p className="command-tree-section-empty">No commands available.</p>}
  </div>
 </section>;
};
