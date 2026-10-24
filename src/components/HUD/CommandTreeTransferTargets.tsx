/** @file CommandTreeTransferTargets.tsx — Give/Put item or money source → amount → destination cascade. */
import React from 'react';
import { Crosshair } from 'lucide-react';
import { isCurrentCommandTarget } from '../../utils/currentCommandTarget';
import { getCommandObjectTargetDisplayLabel } from '../../utils/commandTreeTargetSections';
import type { CustomButton } from '../../types';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { useCommandTreeTransfer } from '../../hooks/useCommandTreeTransfer';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
// --- Render Section ---
export const CommandTreeTransferTargets = ({controller, tree, command}: {
    controller: ReturnType<typeof useCommandTreeController>; tree: ReturnType<typeof useCommandTree>; command: CustomButton;
}) => {
    const transfer = useCommandTreeTransfer(controller, command);
    const isTargetDestination = (value: string) => transfer.label === 'Give' && controller.entries.some(entry => entry.context === value && isCurrentCommandTarget(entry, controller.vitals.target));
    return <>
        <section className="command-tree-branch terminal-inline-popover" aria-label={`${transfer.label} objects`}>
            <CommandTreeTargetHeader/>
            <CommandTreeCollapsibleSection label="Inventory">
                <div className="command-tree-section-commands" role="group" aria-label="Inventory objects" tabIndex={0}>
                    {transfer.sources.map(source => <button key={source.key} type="button" className="command-tree-row"
                        aria-expanded={transfer.selected?.key === source.key} title={source.label}
                        onMouseEnter={() => tree.defer(() => transfer.chooseSource(source))} onMouseLeave={tree.cancelPreview}
                        onFocus={() => transfer.chooseSource(source)} onClick={() => transfer.chooseSource(source)}>
                        <span className={`command-tree-row-label${source.value === 'all' ? '' : ' is-gear-target'}`}>{source.value === 'all'
                            ? source.label : <CommandTreeObjectTargetLabel label={source.label} location={source.meta}>{getCommandObjectTargetDisplayLabel(source.value, source.label)}</CommandTreeObjectTargetLabel>}</span><span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>
                    </button>)}
                </div>
            </CommandTreeCollapsibleSection>
            {transfer.label === 'Give' && <CommandTreeCollapsibleSection label="Money">
                <div className="command-tree-section-commands" role="group" aria-label="Currency">
                    {transfer.currencies.map(currency => <button key={currency.key} type="button" className="command-tree-row"
                        aria-expanded={transfer.currency?.key === currency.key}
                        onMouseEnter={() => tree.defer(() => transfer.chooseCurrency(currency.key))}
                        onFocus={() => transfer.chooseCurrency(currency.key)} onClick={() => transfer.chooseCurrency(currency.key)}>
                        <span className="command-tree-row-label">{currency.label}</span>
                        <span className="command-tree-row-chevron" aria-hidden="true">&#8249;</span>
                    </button>)}
                </div>
            </CommandTreeCollapsibleSection>}
            {!transfer.sources.length && <p className="command-tree-section-empty">No inventory objects available.</p>}
        </section>
        {transfer.currency && !transfer.amountSelected && <section className="command-tree-branch terminal-inline-popover" aria-label={`Amount of ${transfer.currency.label}`} onMouseEnter={tree.cancelPreview}>
            <CommandTreeCollapsibleSection label="Common amounts">
                <div className="command-tree-money-presets" role="group" aria-label="Common amounts">
                    {[1, 5, 10, 20, 50, 100].map(amount => <button key={amount} type="button"
                        onClick={() => transfer.chooseAmount(String(amount))}>
                        {amount} {transfer.currency?.value}
                    </button>)}
                </div>
            </CommandTreeCollapsibleSection>
            <div className="command-tree-money-amount">
                <label htmlFor="command-tree-give-amount">Custom amount</label>
                <input id="command-tree-give-amount" type="text" inputMode="numeric" pattern="[0-9]*" value={transfer.amount}
                    aria-label={`Custom amount of ${transfer.currency.label}`} aria-invalid={!transfer.amountValid}
                    onChange={event => transfer.updateAmount(event.target.value.replace(/\D/g, ''))}
                    onKeyDown={event => { if (event.key === 'Enter') transfer.confirmAmount(); }}/>
                <button type="button" className="command-tree-money-confirm" disabled={!transfer.amountValid}
                    onClick={transfer.confirmAmount}>Use {transfer.amountValid ? transfer.amount : 'amount'}</button>
            </div>
        </section>}
        {(transfer.selected || (transfer.currency && transfer.amountSelected)) && <section className="command-tree-branch terminal-inline-popover" aria-label={transfer.destinationLabel} onMouseEnter={tree.cancelPreview}>
            <CommandTreeTargetHeader/>
            {transfer.sections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label}>
                <div className="command-tree-section-commands" role="group" aria-label={`${section.label} destinations`} tabIndex={0}>
                    {section.targets.map(destination => <button key={destination.key} type="button" data-menu-item="true" className={`command-tree-row${isTargetDestination(destination.value) ? ' command-tree-current-target' : ''}`}
                        disabled={transfer.disabled || Boolean(transfer.currency && (!transfer.amountValid || !transfer.amountSelected))} title={destination.label}
                        onMouseEnter={() => transfer.previewDestination(destination)} onFocus={() => transfer.previewDestination(destination)}
                        onClick={event => transfer.transfer(destination, event)}>
                        <span className={`command-tree-row-label${transfer.label === 'Put' ? ' is-gear-target' : ''}`}>{transfer.label === 'Put'
                            ? <CommandTreeObjectTargetLabel label={destination.label} location={destination.meta}>{getCommandObjectTargetDisplayLabel(destination.value, destination.label)}</CommandTreeObjectTargetLabel>
                            : destination.label}</span>
                        {isTargetDestination(destination.value) && <Crosshair size={14} className="command-tree-target-crosshair" aria-label="Current target"/>}
                    </button>)}
                </div>
            </CommandTreeCollapsibleSection>)}
            {!transfer.sections.length && <p className="command-tree-section-empty">{transfer.emptyLabel}</p>}
        </section>}
    </>;
};
