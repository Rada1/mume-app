/** @file DesktopCommandCategoryCommands.tsx — Flat command list for one desktop family. */
import React from 'react';
import type { useCommandTree } from '../../hooks/useCommandTree';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { commandTreeGroup } from '../../utils/commandTreeGroups';
import { getDesktopCommandCategories,getDesktopCategoryCommands } from '../../utils/desktopCommandCategories';
import { CommandTreeCommandList } from './CommandTreeCommandList';
import { useDesktopCommandDefaults } from '../../hooks/useDesktopCommandDefaults';
import { DesktopCommandPin } from './DesktopCommandPin';
import { DesktopCommandTargetPin } from './DesktopCommandTargetPin';
import { useDesktopCommandDefaultsStore } from '../../stores/useDesktopCommandDefaultsStore';
import { resolveDesktopRememberedTarget } from '../../hooks/desktopRememberedTarget';
import { getOnlineCommunicationTargets } from '../../utils/commandCommunication';

// --- Active category commands ---
export const DesktopCommandCategoryCommands = ({categoryId,atShop,controller,tree,onCommandExecuted,menuHeader}: {
 categoryId:string|null;atShop:boolean;controller:ReturnType<typeof useCommandTreeController>;
 tree:ReturnType<typeof useCommandTree>;onCommandExecuted:()=>void;menuHeader?:React.ReactNode;
}) => {
 const category=getDesktopCommandCategories(atShop).find(entry=>entry.id===categoryId);
 const buttons=React.useMemo(()=>category?getDesktopCategoryCommands(category,tree.grouped):[],[category,tree.grouped]);
 const defaults=useDesktopCommandDefaults(controller.game.characterName);
 const savedTargets=useDesktopCommandDefaultsStore(state=>state.targets?.[controller.game.characterName?.toLowerCase() || 'guest']);
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
    renderCommandRow={category.id==='shop' ? undefined : (button,row)=>{
     const saved = [button.command, `${button.command}::source`, `${button.command}::destination`].flatMap(key => savedTargets?.[key] ? [{key, entry:savedTargets[key]}] : []);
     const live = saved.length && tree.command?.id === button.id ? [...(tree.targetsFor(button) || []), ...controller.entries, ...getOnlineCommunicationTargets(controller.game.whoList || [])] : [];
     return <React.Fragment key={button.id}><DesktopCommandPin label={button.label.replace(/%n/g,'').trim()}
      selected={selected?.command===button.command} onSelect={()=>{tree.cancelPreview();defaults.setDefault(category.id,button);}}>{row}</DesktopCommandPin>
      {tree.command?.id === button.id && saved.filter(item => !resolveDesktopRememberedTarget(item.entry, live)).map(item => <DesktopCommandTargetPin key={item.key} characterName={controller.game.characterName} command={item.key} entry={item.entry}>
       <span className="desktop-command-missing-target">Unavailable: {item.entry.label}</span>
      </DesktopCommandTargetPin>)}</React.Fragment>;
    }}/>
   {!buttons.length&&<p className="command-tree-section-empty">No commands available.</p>}
  </div>
 </section>;
};
