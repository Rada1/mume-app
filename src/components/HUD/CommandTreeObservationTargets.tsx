/** @file CommandTreeObservationTargets.tsx — Grouped local targets for Look, Examine and Consider. */
import React from 'react';
import { Crosshair } from 'lucide-react';
import { isCurrentCommandTarget } from '../../utils/currentCommandTarget';
import { getCommandActionTargetDisplayLabel } from '../../utils/commandTreeTargetSections';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeObservation } from '../../hooks/useCommandTreeObservation';
import { LOOK_IN_TARGET_ID } from '../../utils/commandTreeObservation';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { MobileCommandTargetSections } from './MobileCommandTargetSections';
import { heldTargetPreviewRef } from '../../utils/heldTargetPreview';
import { CommandTargetMenuContext } from '../../context/CommandTargetMenuContext';
// --- Render Section ---
export const CommandTreeObservationTargets = ({controller, button, targets, heldMenu = false}: {
    controller: ReturnType<typeof useCommandTreeController>; button: CustomButton; targets: CommandActionTargetEntry[]; heldMenu?: boolean;
}) => {
    const observation = useCommandTreeObservation(controller, button, targets);
    const touchActivation = useSecondaryTouchActivation();
    const flatTargets = React.useContext(CommandTargetMenuContext);
    const isMobile = controller.game?.viewport?.isMobile === true || flatTargets;
    const renderTargets = (section: (typeof observation.sections)[number]) => <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
                {section.entries.map(entry => {
                    const targetLabel = entry.id === 'command-panel-self' ? 'Self' : getCommandActionTargetDisplayLabel(entry);
                    return <button key={entry.id} type="button" data-menu-item="true"
                        ref={heldTargetPreviewRef(() => observation.preview(entry))}
                        className={`command-tree-row${isCurrentCommandTarget(entry, controller.vitals.target) ? ' command-tree-current-target' : ''}`}
                        disabled={observation.disabled} aria-expanded={entry.id === LOOK_IN_TARGET_ID ? observation.lookInOpen : undefined}
                        onPointerEnter={event => { if (event.pointerType === 'mouse') observation.preview(entry); }}
                        onFocus={event => { if (event.currentTarget.matches(':focus-visible')) observation.preview(entry); }} onClick={() => observation.observe(entry)}>
                        <span className={`command-tree-row-label${entry.gearRow ? ' is-gear-target' : ''}`}>{entry.gearRow
                            ? <CommandTreeObjectTargetLabel label={targetLabel} row={entry.gearRow} category={entry.category}/>
                            : targetLabel}</span>
                        {entry.id === LOOK_IN_TARGET_ID && <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>}
                        {isCurrentCommandTarget(entry, controller.vitals.target) && <Crosshair size={14} className="command-tree-target-crosshair" aria-label="Current target"/>}
                    </button>;
                })}
            </div>;
    const renderContainers = () => <>
        {observation.containerSections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label}>
            <div className="command-tree-section-commands" role="group" aria-label={`${section.label} containers`} tabIndex={0}>
                {section.entries.map(entry => <button key={entry.id} type="button" data-menu-item="true" className="command-tree-row"
                    ref={heldTargetPreviewRef(() => observation.previewContainer(entry))}
                    disabled={observation.disabled} title={entry.label} onPointerEnter={event => { if (event.pointerType === 'mouse') observation.previewContainer(entry); }}
                    onFocus={event => { if (event.currentTarget.matches(':focus-visible')) observation.previewContainer(entry); }} onClick={() => observation.lookIn(entry)}>
                    <span className={`command-tree-row-label${entry.gearRow ? ' is-gear-target' : ''}`}>{entry.gearRow
                        ? <CommandTreeObjectTargetLabel label={entry.label} row={entry.gearRow} category={entry.category}/>
                        : entry.label}</span>
                </button>)}
            </div>
        </CommandTreeCollapsibleSection>)}
        {!observation.containers.length && <p className="command-tree-section-empty">No containers available.</p>}
    </>;
    if (isMobile) return <MobileCommandTargetSections label={`Targets for ${button.label}`} heldMenu={heldMenu}
        options={observation.sections.map(section => ({key: section.label,
            label: section.label === 'Equipment' ? 'Worn' : section.label === 'Containers' ? 'In' : section.label}))}
        selectedKey={observation.lookInOpen ? 'Containers' : observation.selectedSection?.label}
        onSelect={observation.chooseSection}>
        {observation.lookInOpen ? renderContainers() : observation.selectedSection && renderTargets(observation.selectedSection)}
    </MobileCommandTargetSections>;
    return <>
      <section className={`command-tree-branch terminal-inline-popover${isMobile ? ' is-observation-target-menu' : ''}${heldMenu ? `${observation.lookInOpen ? '' : ' is-ability-side-branch'} command-tree-held-command-targets` : ''}`} aria-label={`Targets for ${button.label}`} {...touchActivation}>
        <CommandTreeTargetHeader/>
        {observation.sections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label}>
            {renderTargets(section)}
        </CommandTreeCollapsibleSection>)}
      </section>
      {observation.lookInOpen && <section className={`command-tree-branch terminal-inline-popover${heldMenu ? ' command-tree-held-command-targets' : ''}`} aria-label="Containers to look in" {...touchActivation}>
            <CommandTreeTargetHeader/>
            {renderContainers()}
      </section>}
    </>;
};
