/** @file MobileCommandTiles.tsx — Fixed swipe tiles with modern command-panel targeting. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandTree } from '../../hooks/useCommandTree';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useMobileCommandTiles } from '../../hooks/useMobileCommandTiles';
import { useMobileTileGestures } from '../../hooks/useMobileTileGestures';
import { getCommandTextColor } from '../../utils/swipeCommandColors';
import { getSkillPresentation } from '../../utils/skillPresentation';
import { MobileTileCommandPicker } from './MobileTileCommandPicker';
import { MobileCommandLabel } from './MobileCommandLabel';
import './MobileCommandTiles.css';

// --- Stable grid and local command chooser ---
export const MobileCommandTiles = ({controller,tree,onTargetCommand,commandSent,onArrangeChange,closeRequest}: {
 controller:ReturnType<typeof useCommandTreeController>; tree:ReturnType<typeof useCommandTree>;
 onTargetCommand:(button:CustomButton | null) => void;
 commandSent:React.MutableRefObject<boolean>;
 onArrangeChange:(arranging:boolean) => void;
 closeRequest:number;
}) => {
 const model = useMobileCommandTiles(controller,tree);
 const gesture = useMobileTileGestures(model.tiles,button => {
  model.previewCommand(button);onTargetCommand(button);
 },model.execute,controller.game.triggerHaptic,commandSent);
 const lastCloseRequest = React.useRef(closeRequest);
 React.useEffect(() => {
  if (lastCloseRequest.current !== closeRequest) {lastCloseRequest.current=closeRequest;gesture.close();}
 }, [closeRequest]);
 React.useLayoutEffect(() => {onArrangeChange(gesture.arranging);return () => onArrangeChange(false);},[gesture.arranging,onArrangeChange]);
 return <section className="command-tree-branch terminal-inline-popover command-tree-main-branch mobile-command-tiles-branch" aria-label="Mobile commands">
  <div className="mobile-command-tiles" role="group" aria-label="Command families. Tap to execute, swipe for alternatives, hold for commands and targets.">
   {model.tiles.map(tile => {
    const feedback = gesture.swipeFeedback?.tileId === tile.id ? gesture.swipeFeedback : null;
    const primary = feedback?.button || tile.commands.find(command => command.command === tile.button.command);
    const usesTargetChip = Boolean(primary && model.usesTargetChip(primary));
    const label = primary?.label.replace(/%n/g,'').trim()
     || (tile.button.command ? getSkillPresentation(tile.button.command,'').label : 'Unavailable');
    return <div key={tile.id} className={`mobile-command-tile-cell family-${tile.id}${tile.commands.length ? '' : ' is-unavailable'}`}>
     <button type="button" className={`mobile-command-tile${feedback ? ' is-swipe-feedback' : ''}`} {...gesture.handlers(tile)}
      aria-label={`${tile.label}: ${label}${usesTargetChip ? ', uses current target' : ''}. Swipe for alternatives; hold for commands and targets.`}>
      <span className="mobile-command-tile-label"><small>{tile.label}</small>
       <strong style={{color:getCommandTextColor(primary?.command || tile.button.command,primary?.setId || tile.button.setId)}}><MobileCommandLabel label={label} usesTargetChip={usesTargetChip}/></strong></span>
      {feedback && <span className="mobile-command-swipe-edge" data-direction={feedback.direction} aria-hidden="true"/>}
     </button>
    </div>;
   })}
  </div>
  {gesture.activeTile && <MobileTileCommandPicker tile={gesture.activeTile} selected={gesture.selected}
   onCancel={gesture.cancel} cancelHovered={gesture.cancelHovered} arrangeHovered={gesture.arrangeHovered} scrollRef={gesture.scrollRef}
   onSelect={button => gesture.select(gesture.activeTile!,button)}
   usesTargetChip={model.usesTargetChip}
   arranging={gesture.arranging} onArrange={gesture.beginArrange} onDone={gesture.close}
   onAssign={(button,slot) => model.assignCommand(gesture.activeTile!.id,button,slot)}/>}
 </section>;
};
