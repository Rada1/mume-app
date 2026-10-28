/** @file MobileShopCommandMenu.tsx — Persistent commands beside the mobile shop target lane. */
import React from 'react';
import { X } from 'lucide-react';
import type { CustomButton } from '../../types';
import { COMMAND_TREE_SHOP_BUTTONS } from '../../utils/commandTreeShop';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { useSettingsStore } from '../../stores/useSettingsStore';

// --- Shop Command Choices Section ---
const ACTION_ORDER = ['sell','buy','compare','value','show','list','mend'];
export const MobileShopCommandMenu = ({selected,onSelect,onClose}: {
 selected:CustomButton; onSelect:(button:CustomButton)=>void; onClose:()=>void;
}) => {
 const oneHandedMode = useSettingsStore(state => state.oneHandedMode);
 return <section className={`command-tree-branch terminal-inline-popover command-tree-main-branch mobile-shop-command-menu${oneHandedMode ? ' is-one-handed' : ''}`} aria-label="Shop commands" data-command-tree-persistent-shop>
 <div className="mobile-tile-command-choices">
  <div className="mobile-tile-extra-commands" role="group" aria-label="Shop actions">
   {ACTION_ORDER.map(action => COMMAND_TREE_SHOP_BUTTONS.find(button => button.command.split(' ')[0] === action)!).map(button =>
    <button key={button.id} type="button" data-menu-item="true" aria-pressed={selected.id === button.id}
     style={{color:getCommandTextColor(button.command,button.setId)}} onClick={()=>onSelect(button)}>{button.label}</button>)}
  </div>
 </div>
 <footer className="mobile-shop-command-footer"><button type="button" aria-label="Close shop commands" onClick={onClose}><X size={16} aria-hidden="true"/></button></footer>
</section>;
};
