/** @file CommandTreeGetTargets.tsx — Get room objects or items from a container/corpse. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { useCommandTreeGetFrom } from '../../hooks/useCommandTreeGetFrom';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';

// --- Render Section ---
export const CommandTreeGetTargets = ({controller, tree, button, targets}: {
    controller: ReturnType<typeof useCommandTreeController>; tree: ReturnType<typeof useCommandTree>;
    button: CustomButton; targets: CommandActionTargetEntry[];
}) => {
    const getFrom = useCommandTreeGetFrom(controller);
    const targetState = (entry: CommandActionTargetEntry) => ({x: 0, y: 0, type: 'menu' as const,
        setId: entry.category, category: entry.category, context: entry.context, keyword: entry.keyword,
        displayName: entry.label, entityId: entry.id, parentNoun: entry.parentNoun});
    return <>
        <section className="command-tree-branch terminal-inline-popover" aria-label="Get targets">
            <CommandTreeTargetHeader/>
            <CommandTreeCollapsibleSection label="Room Objects">
                <div role="group" aria-label="Room object targets">
                    {targets.map(entry => <div key={entry.id} onMouseEnter={() => {
                        getFrom.clearSelection();
                        if (entry.id.startsWith('command-tree-all:')) controller.previewEntity(null);
                        else controller.previewEntity(entry);
                    }}>
                        <CommandTreeAction targetLabel={entry.label} targetGearRow={entry.gearRow} controller={controller} button={button} targetState={targetState(entry)}/>
                    </div>)}
                </div>
            </CommandTreeCollapsibleSection>
            {getFrom.fromSections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${section.label} targets`} tabIndex={0}>
                    {section.targets.map(target => <button key={target.key} type="button" className="command-tree-row"
                        aria-expanded={getFrom.selected?.key === target.key} disabled={getFrom.disabled} title={target.label}
                        onMouseEnter={() => tree.defer(() => getFrom.selectContainer(target))} onMouseLeave={tree.cancelPreview}
                        onFocus={() => getFrom.selectContainer(target)} onClick={() => getFrom.selectContainer(target)}>
                        <span className="command-tree-row-label is-gear-target"><CommandTreeObjectTargetLabel label={target.label} location={target.meta}/></span><span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>
                    </button>)}
                </div>
            </CommandTreeCollapsibleSection>)}
        </section>
        {getFrom.selected && <section className="command-tree-branch terminal-inline-popover" aria-label={`${getFrom.selected.label} contents`}
            onMouseEnter={tree.cancelPreview}>
            <CommandTreeTargetHeader/>
            <CommandTreeCollapsibleSection label={`Contents of ${getFrom.selected.label}`} ariaLabel={`${getFrom.selected.label} contents`}>
            {getFrom.loading ? <p className="command-tree-section-empty">Loading contents…</p>
                : getFrom.items.length ? getFrom.items.map(item => <button key={item.key} type="button" className="command-tree-row"
                    disabled={getFrom.disabled} title={item.label} onClick={() => getFrom.getItem(item)}>
                    <span className={`command-tree-row-label${item.value === 'all' ? '' : ' is-gear-target'}`}>{item.value === 'all'
                        ? item.label : <CommandTreeObjectTargetLabel label={item.label} location={item.objectLocation || item.meta}/>}</span>
                </button>) : <p className="command-tree-section-empty">Nothing to get.</p>}
            </CommandTreeCollapsibleSection>
        </section>}
    </>;
};
