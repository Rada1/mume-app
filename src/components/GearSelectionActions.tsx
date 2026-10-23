/** @file GearSelectionActions.tsx — Contextual commands for a scoped item selection. */

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { GearSelectionAction, GearSelectionActionsProps } from '../types';
import { getGearSelectionCommands, getGearSelectionLabel } from '../utils/gearSelectionUtils';

// --- Render Section ---
export const GearSelectionActions: React.FC<GearSelectionActionsProps> = ({ selection, containers, recipients, onRun, onClear, className, showCommandSyntax = false }) => {
    const [showContainers, setShowContainers] = useState(false);
    const [showRecipients, setShowRecipients] = useState(false);
    const canGet = Boolean(selection.parentNoun) || selection.section === 'room';
    const canCarry = selection.section === 'carried' && !selection.parentNoun;
    const syntaxFor = (action: GearSelectionAction, destination?: string) => {
        if (!showCommandSyntax) return null;
        const commands = getGearSelectionCommands(selection, action, destination);
        if (!commands.length) return null;
        const summary = commands.length > 1 ? ` + ${commands.length - 1}` : '';
        return <small className="gear-selection-command-syntax">&lt;{commands[0]}{summary}&gt;</small>;
    };
    const actionButton = (label: string, action: GearSelectionAction) => <button type="button" onClick={() => onRun(action)}>
        <span>{label}</span>{syntaxFor(action)}
    </button>;
    return <div className={`gear-actions gear-selection-actions${className ? ` ${className}` : ''}`} aria-label="Selected item actions">
        <div className="gear-actions-label-row">
            <span className="gear-actions-label">{selection.items.length} selected · {getGearSelectionLabel(selection)}</span>
            <button className="gear-selection-clear" type="button" onClick={onClear}>Clear</button>
        </div>
        <div className="gear-action-buttons">
            {canGet && actionButton('Get', 'get')}
            {canCarry && <>
                {actionButton('Wear', 'wear')}
                {actionButton('Drop', 'drop')}
                {recipients.length > 0 && <button type="button" onClick={() => {
                    setShowContainers(false);
                    setShowRecipients(value => !value);
                }}>
                    <span>{showRecipients ? 'Cancel give' : 'Give…'}</span>
                    {syntaxFor('give', '<recipient>')}
                </button>}
                {containers.length > 0 && <button type="button" onClick={() => {
                    setShowRecipients(false);
                    setShowContainers(value => !value);
                }}>
                    <span>{showContainers ? 'Cancel put' : 'Put in…'}</span>
                    {syntaxFor('put', '<container>')}
                </button>}
            </>}
            {selection.section === 'worn' && actionButton('Remove', 'remove')}
        </div>
        {showContainers && <div className="gear-action-buttons gear-selection-destinations" aria-label="Choose destination container">
            {containers.map(container => <button key={container.line.id} type="button"
                onClick={() => { onRun('put', container.noun); setShowContainers(false); }}>
                <span>{container.name}</span>{syntaxFor('put', container.noun)}
            </button>)}
        </div>}
        {showRecipients && <>
            <div className="gear-give-heading">
                <button type="button" className="gear-give-back" onClick={() => setShowRecipients(false)} aria-label="Back to selected item actions">
                    <ArrowLeft size={14} /> Back
                </button>
                <span>give selected items to…</span>
            </div>
            <div className="gear-recipient-list" aria-label="Choose recipient">
                {recipients.map(recipient => <button key={recipient.id} type="button" onClick={() => onRun('give', recipient.noun)}>
                    <span>{recipient.label}</span>
                    {showCommandSyntax ? syntaxFor('give', recipient.noun) : <small>{recipient.kind}</small>}
                </button>)}
            </div>
        </>}
    </div>;
};

export default GearSelectionActions;
