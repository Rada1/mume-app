/**
 * @file AccountCreationPanel.tsx
 * @description Character creation and stat editing controls for the account drawer.
 */

import React from 'react';
import type { AccountState, CreationOption } from '../../types';

// --- Logic Section ---

const STAT_IDS = new Set(['str', 'int', 'wis', 'dex', 'con', 'wil', 'per']);

const STAT_LABELS: Record<string, string> = {
    str: 'Strength (str)',
    int: 'Intelligence (int)',
    wis: 'Wisdom (wis)',
    dex: 'Dexterity (dex)',
    con: 'Constitution (con)',
    wil: 'Willpower (wil)',
    per: 'Perception (per)',
};

interface AccountCreationPanelProps {
    accountState: AccountState;
    executeCommand: (command: string) => void;
    triggerHaptic: (duration?: number) => void;
}

const AccountHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="cmd-action-header">
        <span className="cmd-action-title">{title}</span>
    </div>
);

const CreationOptionButton: React.FC<{
    option: CreationOption;
    onSelect: (id: string) => void;
}> = ({ option, onSelect }) => (
    <button className="account-menu-btn creation-option-btn" onClick={() => onSelect(option.id)}>
        {/^\d+$/.test(option.id) && <span style={{ color: '#4ade80', marginRight: 8 }}>({option.id})</span>}
        {option.label}
    </button>
);

export const AccountCreationPanel: React.FC<AccountCreationPanelProps> = ({ accountState, executeCommand, triggerHaptic }) => {
    const liveOptions = accountState.creationPrompt?.options ?? [];
    const stickyOptionsRef = React.useRef<CreationOption[]>([]);
    const [displayedOptions, setDisplayedOptions] = React.useState<CreationOption[]>(liveOptions);
    React.useEffect(() => {
        if (liveOptions.length > 0) {
            stickyOptionsRef.current = liveOptions;
            setDisplayedOptions(liveOptions);
            return;
        }
        if (stickyOptionsRef.current.length === 0) {
            setDisplayedOptions([]);
            return;
        }
        setDisplayedOptions(stickyOptionsRef.current);
        const timeout = window.setTimeout(() => {
            if (liveOptions.length === 0) setDisplayedOptions([]);
        }, 450);
        return () => window.clearTimeout(timeout);
    }, [liveOptions]);

    const options = displayedOptions;
    const statOptions = options.filter(opt => STAT_IDS.has(opt.id));
    const actionOptions = options.filter(opt => !STAT_IDS.has(opt.id));
    const isStatStage = accountState.stage === 'stat-editing';
    const title = accountState.stage === 'account-confirmation'
        ? 'New Account'
        : isStatStage ? 'Stat Editing' : 'Create Character';

    const selectOption = (id: string) => {
        triggerHaptic(15);
        executeCommand(id);
    };

    const adjustStat = (id: string, delta: number, currentValue?: number) => {
        if (currentValue === undefined) return;
        triggerHaptic(10);
        executeCommand(`${id} ${currentValue + delta}`);
    };

    return (
        <div className="cmd-action-panel">
            <AccountHeader title={title} />
            {isStatStage && accountState.pointsLeft !== undefined && (
                <div className="creation-points-header">
                    <span>{accountState.pointsLeft} {accountState.pointsLeft === 1 ? 'Point' : 'Points'} Left</span>
                </div>
            )}
            <div className="creation-options-list">
                {isStatStage ? (
                    <div className="account-stat-editor">
                        <div className="account-stat-list">
                            {statOptions.map(opt => {
                                const currentValue = accountState.stats?.[opt.id];
                                return (
                                    <div key={opt.id} className="stat-editor-row">
                                        <span className="account-stat-label">{STAT_LABELS[opt.id] ?? opt.label}</span>
                                        <div className="account-stat-controls">
                                            <button className="account-stat-step" disabled={currentValue === undefined} onClick={() => adjustStat(opt.id, -1, currentValue)}>-</button>
                                            <span className="account-stat-value">{currentValue ?? '-'}</span>
                                            <button className="account-stat-step" disabled={currentValue === undefined} onClick={() => adjustStat(opt.id, 1, currentValue)}>+</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="account-stat-actions">
                            {actionOptions.map(opt => <button key={opt.id} className="account-menu-btn creation-option-btn no-arrow" onClick={() => selectOption(opt.id)}>{opt.label.split(' ')[0]}</button>)}
                        </div>
                    </div>
                ) : (
                    options.map(opt => <CreationOptionButton key={opt.id} option={opt} onSelect={selectOption} />)
                )}
            </div>
            {accountState.stage !== 'account-confirmation' && (
                <div className="creation-nav-buttons" style={{ display: 'flex', gap: 8, padding: 12 }}>
                    <button className="account-menu-btn no-arrow" onClick={() => selectOption('back')}>Back</button>
                    <button className="account-menu-btn no-arrow" onClick={() => selectOption('menu')}>Main Menu</button>
                    <button className="account-menu-btn no-arrow" onClick={() => selectOption('?')}>?</button>
                </div>
            )}
        </div>
    );
};
