/**
 * @file AccountStatPopover.tsx
 * @description Compact popover for editing character stats on mobile.
 */

import React, { FC } from 'react';
import type { AccountState } from '../../../types';
import './AccountStatPopover.css';

const STAT_IDS = ['str', 'int', 'wis', 'dex', 'con', 'wil', 'per'];

const STAT_LABELS: Record<string, string> = {
    str: 'Strength (str)',
    int: 'Intelligence (int)',
    wis: 'Wisdom (wis)',
    dex: 'Dexterity (dex)',
    con: 'Constitution (con)',
    wil: 'Willpower (wil)',
    per: 'Perception (per)',
};

export interface AccountStatPopoverProps {
    accountState: AccountState;
    executeCommand: (cmd: string) => void;
    triggerHaptic?: (ms: number) => void;
    onClose: () => void;
}

export const AccountStatPopover: FC<AccountStatPopoverProps> = ({
    accountState,
    executeCommand,
    triggerHaptic,
    onClose
}) => {
    const adjustStat = (id: string, delta: number, currentValue?: number) => {
        if (currentValue === undefined) return;
        triggerHaptic?.(10);
        executeCommand(`${id} ${currentValue + delta}`);
    };

    return (
        <div className="account-stat-popover" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="account-stat-popover-header">
                <span className="account-stat-popover-title">STAT ALLOCATION</span>
                {accountState.pointsLeft !== undefined && (
                    <span className="account-stat-popover-points">
                        {accountState.pointsLeft} {accountState.pointsLeft === 1 ? 'Point' : 'Points'} Left
                    </span>
                )}
            </div>

            <div className="account-stat-popover-list">
                {STAT_IDS.map(statKey => {
                    const currentValue = accountState.stats?.[statKey];
                    return (
                        <div key={statKey} className="account-stat-popover-row">
                            <span className="account-stat-popover-label">{STAT_LABELS[statKey] || statKey}</span>
                            <div className="account-stat-popover-controls">
                                <button
                                    type="button"
                                    className="account-stat-popover-btn"
                                    disabled={currentValue === undefined}
                                    onClick={() => adjustStat(statKey, -1, currentValue)}
                                >
                                    -
                                </button>
                                <span className="account-stat-popover-val">{currentValue ?? '-'}</span>
                                <button
                                    type="button"
                                    className="account-stat-popover-btn"
                                    disabled={currentValue === undefined}
                                    onClick={() => adjustStat(statKey, 1, currentValue)}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="account-stat-popover-actions">
                <button
                    type="button"
                    className="account-stat-action-btn"
                    onClick={() => {
                        triggerHaptic?.(15);
                        executeCommand('r');
                    }}
                >
                    Reset (R)
                </button>
                <button
                    type="button"
                    className="account-stat-action-btn done-btn"
                    onClick={() => {
                        triggerHaptic?.(15);
                        executeCommand('q');
                        onClose();
                    }}
                >
                    Done (Q)
                </button>
            </div>
        </div>
    );
};
