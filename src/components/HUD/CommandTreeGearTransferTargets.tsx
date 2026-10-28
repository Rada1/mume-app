/** @file CommandTreeGearTransferTargets.tsx — Final argument column for quick-menu Give and Put actions. */
import React from 'react';
import type { useCommandGearTransfer } from '../../hooks/useCommandGearTransfer';

// --- Destination Column ---
export const CommandTreeGearTransferTargets = ({transfer}: {transfer: ReturnType<typeof useCommandGearTransfer>}) => {
 if (!transfer.command) return null;
 const sections = transfer.label === 'Put'
  ? [{label:'Containers', targets:transfer.sections.flatMap(section => section.targets)}]
  : transfer.sections;
 return <section className="command-tree-gear-quick-put-targets" aria-label={transfer.destinationLabel}>
  <div className="command-tree-gear-quick-put-heading">{transfer.label} {transfer.preposition}</div>
  {sections.map(section => <div key={section.label} className="command-tree-gear-quick-put-group" role="group" aria-label={section.label}>
   {transfer.label !== 'Put' && <div className="command-tree-gear-quick-put-group-label">{section.label}</div>}
   {section.targets.map(destination => <button type="button" key={destination.key} className="command-tree-row"
    disabled={transfer.disabled}
    onPointerEnter={event => {if(event.pointerType==='mouse')transfer.previewDestination(destination);}}
    onFocus={event => {if(event.currentTarget.matches(':focus-visible'))transfer.previewDestination(destination);}}
    onClick={event => {event.stopPropagation();transfer.transfer(destination,event);}}>
    <span className="command-tree-row-label">{destination.label}</span>
   </button>)}
  </div>)}
  {!transfer.sections.length&&<p className="command-tree-section-empty">{transfer.emptyLabel}</p>}
 </section>;
};
