/** @file CommandTreeObservationTargets.tsx — Grouped local targets for Look, Examine and Consider. */
import React from 'react';
import { Crosshair } from 'lucide-react';
import { isCurrentCommandTarget } from '../../utils/currentCommandTarget';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeObservation } from '../../hooks/useCommandTreeObservation';
import { LOOK_IN_TARGET_ID } from '../../utils/commandTreeObservation';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
// --- Render Section ---
export const CommandTreeObservationTargets = ({controller, button, targets}: {
    controller: ReturnType<typeof useCommandTreeController>; button: CustomButton; targets: CommandActionTargetEntry[];
}) => {
    const observation = useCommandTreeObservation(controller, button, targets);
    return <section className="command-tree-branch terminal-inline-popover" aria-label={`Targets for ${button.label}`}>
        <CommandTreeTargetHeader/>
        {observation.sections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label}>
            <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
                {section.entries.map(entry => {
                    const targetLabel = entry.id === 'command-panel-self' ? 'Self' : entry.label;
                    return <button key={entry.id} type="button" className={`command-tree-row${isCurrentCommandTarget(entry, controller.vitals.target) ? ' command-tree-current-target' : ''}`}
                        disabled={observation.disabled} aria-expanded={entry.id === LOOK_IN_TARGET_ID ? observation.lookInOpen : undefined}
                        onMouseEnter={() => observation.preview(entry)} onFocus={() => observation.preview(entry)} onClick={() => observation.observe(entry)}>
                        <span className={`command-tree-row-label${entry.gearRow ? ' is-gear-target' : ''}`}>{entry.gearRow
                            ? <CommandTreeObjectTargetLabel label={targetLabel} row={entry.gearRow} category={entry.category}/>
                            : targetLabel}</span>
                        {entry.id === LOOK_IN_TARGET_ID && <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>}
                        {isCurrentCommandTarget(entry, controller.vitals.target) && <Crosshair size={14} className="command-tree-target-crosshair" aria-label="Current target"/>}
                    </button>;
                })}
            </div>
        </CommandTreeCollapsibleSection>)}
        {observation.lookInOpen && <section className="command-tree-branch terminal-inline-popover" aria-label="Containers to look in">
            <CommandTreeTargetHeader/>
            {observation.containerSections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${section.label} containers`} tabIndex={0}>
                    {section.entries.map(entry => <button key={entry.id} type="button" className="command-tree-row"
                        disabled={observation.disabled} title={entry.label} onMouseEnter={() => observation.previewContainer(entry)}
                        onFocus={() => observation.previewContainer(entry)} onClick={() => observation.lookIn(entry)}>
                        <span className={`command-tree-row-label${entry.gearRow ? ' is-gear-target' : ''}`}>{entry.gearRow
                            ? <CommandTreeObjectTargetLabel label={entry.label} row={entry.gearRow} category={entry.category}/>
                            : entry.label}</span>
                    </button>)}
                </div>
            </CommandTreeCollapsibleSection>)}
            {!observation.containers.length && <p className="command-tree-section-empty">No containers available.</p>}
        </section>}
    </section>;
};
