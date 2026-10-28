/** @file MobileTileCommandPicker.tsx — Local command choices and explicit primary-action assignment. */
import React from 'react';
import { ArrowUp, CircleDot, X } from 'lucide-react';
import type { CustomButton, SwipeDirection } from '../../types';
import type { useMobileCommandTiles } from '../../hooks/useMobileCommandTiles';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { useMobileTileCommandLayout } from '../../hooks/useMobileTileCommandLayout';
import { useMobileTileArrangement } from '../../hooks/useMobileTileArrangement';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { MobileCommandLabel } from './MobileCommandLabel';
import { useSettingsStore } from '../../stores/useSettingsStore';

// --- Quiet directional hints ---
const rotations: Record<string,number> = {up:0,ne:45,right:90,se:135,down:180,sw:225,left:270,nw:315};
const DirectionChip = ({slot}: {slot:string}) => <span className="mobile-tile-direction-chip" aria-hidden="true">
 {slot === 'center' ? <CircleDot size={10}/> : <ArrowUp size={11} style={{transform:`rotate(${rotations[slot] || 0}deg)`}}/>}
</span>;

// --- Family command choices (targets stay in the existing right lane) ---
export const MobileTileCommandPicker = ({tile,selected,onSelect,onCancel,cancelHovered,arrangeHovered,scrollRef,arranging,onArrange,onDone,onAssign,usesTargetChip}: {
 tile:ReturnType<typeof useMobileCommandTiles>['tiles'][number]; selected:CustomButton | null;
 onSelect:(button:CustomButton) => void;
 usesTargetChip:(button:CustomButton) => boolean;
 onCancel:() => void; cancelHovered:boolean; arrangeHovered:boolean;
 arranging:boolean; onArrange:() => void; onDone:() => void;
 onAssign:(button:CustomButton,slot:SwipeDirection | 'center' | 'extra') => void;
 scrollRef:React.RefObject<HTMLDivElement | null>;
}) => {
 const layout = useMobileTileCommandLayout(tile);
 const oneHandedMode = useSettingsStore(state => state.oneHandedMode) && !arranging;
 const edit = useMobileTileArrangement(arranging,scrollRef,onAssign);
 const secondaryTouch = useSecondaryTouchActivation();
 const renderCommand = (button: CustomButton,hint: string,slot?: string) => <button key={slot || button.id} type="button"
  data-mobile-tile-command={arranging ? undefined : button.command} data-swipe-slot={slot} data-arrange-slot={slot}
  data-arrange-destination={arranging && Boolean(edit.source) || undefined} data-drop-active={arranging && edit.hoverSlot === slot || undefined}
  aria-pressed={arranging ? edit.source?.command === button.command : selected?.command === button.command}
  aria-label={`${button.label.replace(/%n/g,'').trim()}${slot ? `, ${hint}` : ''}${usesTargetChip(button) ? ', uses current target' : ''}`}
  {...edit.pointerProps(button)} onClick={() => arranging ? edit.click(button,slot as SwipeDirection | 'center' | undefined) : onSelect(button)} style={{color:getCommandTextColor(button.command,button.setId)}}>
  <MobileCommandLabel label={button.label.replace(/%n/g,'').trim()} usesTargetChip={usesTargetChip(button)}/>{slot && <DirectionChip slot={slot}/>}
 </button>;
 return <div className={`mobile-tile-command-picker${arranging ? ' is-arranging' : ''}${oneHandedMode ? ' is-one-handed' : ''}`} aria-label={`${tile.label} commands`} {...(arranging ? {onPointerDownCapture:edit.onPointerDownCapture} : secondaryTouch)}>
 {arranging && <p className="mobile-tile-arrange-hint" role="status">{edit.source ? 'Choose a slot to move or swap.' : 'Tap a command, then a slot. Hold to drag; swipe to scroll.'}</p>}
 <div ref={scrollRef} className="mobile-tile-command-choices">
  <div className="mobile-tile-swipe-grid" role="group" aria-label="Swipe directions and center tap action">
   {layout.cells.map(cell => cell.button ? renderCommand(cell.button,cell.hint,cell.slot)
    : oneHandedMode ? null : <button key={cell.slot} type="button" className="mobile-tile-empty-swipe" data-swipe-slot={cell.slot} data-arrange-slot={cell.slot}
       data-arrange-destination={arranging && Boolean(edit.source) || undefined} data-drop-active={arranging && edit.hoverSlot === cell.slot || undefined}
       disabled={!arranging} onClick={() => edit.click(undefined,cell.slot)} aria-label={`${cell.hint}: unassigned`}><DirectionChip slot={cell.slot}/></button>)}
  </div>
  {(layout.extra.length > 0 || arranging) && <div className="mobile-tile-extra-commands" role="group" aria-label="Additional commands" data-arrange-slot={arranging ? 'extra' : undefined}>
   {arranging && <button type="button" className="mobile-tile-extra-drop" data-arrange-slot="extra"
    data-drop-active={edit.hoverSlot === 'extra' || undefined} onClick={() => edit.click(undefined,'extra')}>Move below grid</button>}
   {layout.extra.map(button => renderCommand(button,'Choose'))}
  </div>}
  {!tile.commands.length && <p>No commands currently available.</p>}
 </div>
 <footer>
  <button type="button" data-mobile-tile-arrange={!arranging || undefined} data-arrange-hovered={arrangeHovered || undefined} aria-pressed={arranging}
   onClick={arranging ? onDone : onArrange}>{arranging ? 'Done' : 'Arrange'}</button>
  {!arranging && <button type="button" className="mobile-tile-cancel-button" data-mobile-tile-cancel data-cancel-hovered={cancelHovered || undefined}
   onClick={onCancel} aria-label="Cancel command hold" title="Cancel"><X size={16} aria-hidden="true"/></button>}</footer>
</div>;
};
