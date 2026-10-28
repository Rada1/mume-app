/** @file MobileCommandTargetSections.tsx — Vertical location rail and independently scrolling mobile target grid. */
import React from 'react';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
import { CommandTargetMenuContext } from '../../context/CommandTargetMenuContext';

// --- Shared Target Columns Section ---
export const MobileCommandTargetSections = ({options, selectedKey, onSelect, label, heldMenu = false, children}: {
    options: ReadonlyArray<{key: string; label: React.ReactNode; disabled?: boolean}>;
    selectedKey?: string;
    onSelect: (key: string) => void;
    label: string;
    heldMenu?: boolean;
    children: React.ReactNode;
}) => {
    const locationTouch = useSecondaryTouchActivation();
    const targetTouch = useSecondaryTouchActivation();
    const branchClass = `command-tree-branch terminal-inline-popover${heldMenu ? ' command-tree-held-command-targets' : ''}`;
    return <>
        <section className={`${branchClass} is-target-location-branch`} aria-label={`${label} locations`} {...locationTouch}>
            <CommandTreeTargetHeader title="LOCATIONS"/>
            <div className="mobile-target-location-list" role="group" aria-label={`${label} sections`}>
                {options.map(option => <button key={option.key} type="button" className="command-tree-row"
                    aria-pressed={selectedKey === option.key} disabled={option.disabled}
                    onClick={() => onSelect(option.key)}>
                    <span className="command-tree-row-label">{option.label}</span>
                </button>)}
            </div>
        </section>
        <section className={`${branchClass} is-target-grid-branch`} aria-label={label} {...targetTouch}>
            <CommandTreeTargetHeader/>
            <CommandTargetMenuContext.Provider value={true}>{children}</CommandTargetMenuContext.Provider>
        </section>
    </>;
};
