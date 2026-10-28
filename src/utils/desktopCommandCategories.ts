/** @file desktopCommandCategories.ts — Flat desktop families shared with the mobile command tiles. */
import type { CustomButton } from '../types';
import { MOBILE_COMMAND_TILES, tileContainsCommand } from './mobileCommandTiles';
import { getCommandTreeSection } from './commandTreeSections';
import { isCommandTreeShopAction } from './commandTreeShop';
import { isCommandTreeSocial } from './commandTreeSocial';

// --- Desktop category model ---
const SHOP_CATEGORY = {id:'shop',label:'Shop',groups:[3]} as const;
export type DesktopCommandCategory = typeof MOBILE_COMMAND_TILES[number] | typeof SHOP_CATEGORY;
export const getDesktopCommandCategories = (atShop:boolean): DesktopCommandCategory[] => [
 ...MOBILE_COMMAND_TILES, ...(atShop ? [SHOP_CATEGORY] : [])
];

// --- Direct command lists ---
const belongsToCategory = (category:DesktopCommandCategory,button:CustomButton):boolean => {
 if (category.id === 'shop') return isCommandTreeShopAction(button);
 if (!('sections' in category)) return false;
 if (tileContainsCommand(category,button)) return true;
 return category.id === 'interact' && getCommandTreeSection(button) === 'Doors';
};

export const getDesktopCategoryCommands = (
 category:DesktopCommandCategory,
 groups:ReadonlyArray<{readonly buttons:CustomButton[]}> 
):CustomButton[] => {
 const seen = new Set<string>();
 const indices=category.id==='interact'?[...category.groups,1]:category.groups;
 const commands = indices.flatMap(index=>groups[index]?.buttons ?? []).filter(button=>{
  if (!belongsToCategory(category,button) || seen.has(button.command)) return false;
  seen.add(button.command);return true;
 });
 return category.id === 'social' ? commands.sort((a,b) => Number(isCommandTreeSocial(b)) - Number(isCommandTreeSocial(a))) : commands;
};

export const getDesktopCategoryGroup = (
 category:DesktopCommandCategory,
 groups:ReadonlyArray<{readonly buttons:CustomButton[]}> 
):number => {
 const indices=category.id==='interact'?[...category.groups,1]:category.groups;
 return indices.find(index=>groups[index]?.buttons.some(button=>belongsToCategory(category,button))) ?? indices[0] ?? 0;
};
