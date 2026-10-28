/** @file useDesktopCommandCategoryNavigation.ts — Desktop family selection and contextual routes. */
import { useCallback,useEffect,useMemo,useState } from 'react';
import type { useCommandTree } from './useCommandTree';
import { getDesktopCommandCategories,getDesktopCategoryGroup } from '../utils/desktopCommandCategories';
import { COMMAND_TREE_SOCIAL_BUTTON, isCommandTreeSocial } from '../utils/commandTreeSocial';

// --- Category selection ---
export const useDesktopCommandCategoryNavigation = (tree:ReturnType<typeof useCommandTree>,isMobile:boolean,atShop:boolean,
 openGroup:(group:number)=>void,prepareAnchor:(button:HTMLButtonElement)=>void) => {
 const categories=useMemo(()=>getDesktopCommandCategories(atShop),[atShop]);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const select=useCallback((category:typeof categories[number],button:HTMLButtonElement)=>{
  if(selectedId===category.id)return;
  prepareAnchor(button);
  const group=getDesktopCategoryGroup(category,tree.grouped);
  if(tree.group!==group)openGroup(group);
  if(category.id==='social') {
   tree.chooseCommand(tree.grouped[group]?.buttons.find(isCommandTreeSocial) ?? COMMAND_TREE_SOCIAL_BUTTON);
  } else if(tree.group===group)tree.clearCommand();
  setSelectedId(category.id);
 },[selectedId,prepareAnchor,tree.grouped,tree.group,tree.clearCommand,tree.chooseCommand,openGroup]);
 useEffect(()=>{
  if(isMobile)return;
  if(tree.command?.command.trim().toLowerCase()==='practice')setSelectedId('information');
  else if(tree.command&&/^(buy|sell|value|mend|list|compare|show)\b/i.test(tree.command.command.trim()))setSelectedId('shop');
  else if(!atShop&&selectedId==='shop')setSelectedId('gear');
 },[isMobile,tree.command?.id,tree.command?.command,atShop,selectedId]);
 return {categories,visibleCategories:categories.filter(category=>category.id!=='shop'),selectedId,select};
};
