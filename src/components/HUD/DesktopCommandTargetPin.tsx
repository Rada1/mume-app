/** @file DesktopCommandTargetPin.tsx — Optional remembered target for a desktop command. */
import React from 'react';
import { Square, SquareCheck } from 'lucide-react';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import { useDesktopCommandDefaultsStore } from '../../stores/useDesktopCommandDefaultsStore';

// --- Target preference ---
export const DesktopCommandTargetPin = ({characterName, command, entry, children}: {
 characterName?: string; command:string; entry:CommandActionTargetEntry; children:React.ReactNode;
}) => {
 const character = characterName?.toLowerCase() || 'guest';
 const saved = useDesktopCommandDefaultsStore(state => state.targets?.[character]?.[command]);
 const toggle = useDesktopCommandDefaultsStore(state => state.toggleTarget);
 const selected = Boolean(saved && saved.context === entry.context && saved.group === entry.group && saved.parentNoun === entry.parentNoun);
 return <div className="desktop-command-pin-row">
  <button type="button" className="desktop-command-pin" aria-label={`${selected ? 'Forget' : 'Remember'} ${entry.label} as target for ${command.replace(/::(?:source|destination)$/, '').replace(/%n/g, '').trim()}`}
   aria-pressed={selected} onClick={event => { event.preventDefault(); event.stopPropagation(); toggle(character, command, entry); }}>
   {selected ? <SquareCheck size={15} aria-hidden="true"/> : <Square size={15} aria-hidden="true"/>}
  </button>{children}
 </div>;
};
