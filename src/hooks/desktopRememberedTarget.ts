/** @file desktopRememberedTarget.ts — Resolve and execute a saved desktop command target. */
import type { MouseEvent } from 'react';
import type { CustomButton } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { useCommandTreeController } from './useCommandTreeController';
import { isCommandTreeObservation } from '../utils/commandTreeObservation';
import { executeCommandTreeObservation } from './useCommandTreeObservation';
import { isCommandTreeAccess } from '../utils/commandTreeAccess';

// --- Live target validation and dispatch ---
export const resolveDesktopRememberedTarget = (saved:CommandActionTargetEntry, entries:CommandActionTargetEntry[]) => {
 const context = (entry:CommandActionTargetEntry) => entry.context.toLowerCase().replace(entry.category === 'cat-exit' ? /^exit\s+/ : /^$/, '');
 const candidates = entries.filter(entry => context(entry) === context(saved)
  && entry.group === saved.group && entry.category === saved.category && entry.parentNoun === saved.parentNoun);
 return candidates.find(entry => entry.id === saved.id) || (candidates.length === 1 ? candidates[0] : undefined);
};
export const executeDesktopRememberedTarget = (controller:ReturnType<typeof useCommandTreeController>, button:CustomButton,
 entry:CommandActionTargetEntry, event:MouseEvent) => {
 if (isCommandTreeObservation(button)) { executeCommandTreeObservation(controller, entry, button.command.split(' ')[0]); return; }
 if (/^whois(?:\s|$)/i.test(button.command)) { controller.dismissOutputs(); controller.requestWhois(entry); return; }
 if (button.setId === 'trait-communication') { controller.communication.handleCommand(button.command.replace(/%n/g, entry.context)); return; }
 const exitAccess = entry.category === 'cat-exit' && isCommandTreeAccess(button);
 const bashExit = entry.category === 'cat-exit' && /^bash\s+%n(?:\|exit)?$/i.test(button.command.trim());
 const command = exitAccess ? `${button.command.split(' ')[0]} exit %n`
  : bashExit ? button.command.replace(/%n(?:\|exit)?/i, 'exit %n')
  : /%n/.test(button.command) ? button.command : `${button.command} %n`;
 const context = exitAccess || bashExit ? entry.context.replace(/^exit\s+/i, '').trim() || entry.keyword : entry.context;
 controller.game.handleButtonClick({...button, command}, event, context, undefined, entry.parentNoun);
};
