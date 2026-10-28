/** @file useHeldCommandExecution.ts — Records explicit target execution during one mobile command hold. */
import { useMemo, type MutableRefObject } from 'react';
import type { CustomButton } from '../types';
import type { useCommandTreeController } from './useCommandTreeController';

// --- Target-only execution adapter (navigation and background captures do not count) ---
export const useHeldCommandExecution = (controller:ReturnType<typeof useCommandTreeController>,
 command:CustomButton | null, sent:MutableRefObject<boolean>,onExecuted:(alreadyHaptic?:boolean) => void) => useMemo(() => {
 const markSent = (alreadyHaptic=false) => {sent.current=true;controller.game.setCommandPreview?.(null);onExecuted(alreadyHaptic);};
 const track = <Args extends unknown[],Result>(action:(...args:Args) => Result) => (...args:Args):Result => {
  markSent();
  return action(...args);
 };
 const commandVerb = (value:string) => {
  const verb = value.trim().split(/\s+/)[0].toLowerCase();
  return verb === 'con' ? 'consider' : verb;
 };
 const verb = command ? commandVerb(command.command) : undefined;
 const game = {...controller.game,
  handleButtonClick:(...args:Parameters<typeof controller.game.handleButtonClick>) => {markSent(true);return controller.game.handleButtonClick(...args);},
  executeCommand:(...args:Parameters<typeof controller.game.executeCommand>) => {
   if (verb && commandVerb(args[0]) === verb
    && (args[5]?.fromUi || (!args[1] && !args[2]))) markSent();
   return controller.game.executeCommand(...args);
  }
 };
 return {...controller,game,
  executeHelp:track(controller.executeHelp),
  requestCommandReport:track(controller.requestCommandReport),
  requestRoomReport:track(controller.requestRoomReport),
  requestWeatherReport:track(controller.requestWeatherReport),
  requestPersonalReport:track(controller.requestPersonalReport),
  requestExamine:track(controller.requestExamine),
  requestWhois:track(controller.requestWhois),
  setInspecting:track(controller.setInspecting),
  communication:{...controller.communication,handleCommand:track(controller.communication.handleCommand)},
  practice:{...controller.practice,train:track(controller.practice.train)},
  shop:{...controller.shop,runStockAction:(...args:Parameters<typeof controller.shop.runStockAction>) => {
    if (args[0] !== 'compare' || controller.shop.compareFirst) markSent();
    return controller.shop.runStockAction(...args);
   },
   runInventoryAction:track(controller.shop.runInventoryAction),runShow:track(controller.shop.runShow),
   tryCompare:(...args:Parameters<typeof controller.shop.tryCompare>) => {
    if (controller.shop.compareFirst) markSent();
    return controller.shop.tryCompare(...args);
   }}
 };
}, [controller,command,sent,onExecuted]);
