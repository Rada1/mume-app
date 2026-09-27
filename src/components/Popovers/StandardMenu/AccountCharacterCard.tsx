/**
 * @file AccountCharacterCard.tsx
 * @description Popover card for an account character showing Play, Info, and Practice actions with inline terminal output.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { Play, Info, BookOpen } from 'lucide-react';
import type { AccountState, CharacterEntry } from '../../../types';
import { AccountAnsiLine } from '../../Drawers/AccountAnsiLine';
import './AccountCharacterCard.css';

export interface AccountCharacterCardProps {
    character: CharacterEntry;
    accountState?: AccountState;
    setAccountState?: React.Dispatch<React.SetStateAction<AccountState>>;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean; fromUi?: boolean }) => void;
    triggerHaptic?: (ms: number) => void;
    onClose: () => void;
}

export const AccountCharacterCard: FC<AccountCharacterCardProps> = ({
    character,
    accountState,
    setAccountState,
    executeCommand,
    triggerHaptic,
    onClose
}) => {
    const activeTab = accountState?.charSelectTab;
    const isInfoLoading = accountState?.charCapture?.type === 'info' && (!accountState.charInfoLines || accountState.charInfoLines.length === 0);
    const isPracticeLoading = accountState?.charCapture?.type === 'practice' && (!accountState.charPracticeLines || accountState.charPracticeLines.length === 0);

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic?.(30);
        executeCommand(`play ${character.name}`);
        onClose();
    };

    const handleInfo = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic?.(15);
        if (setAccountState) {
            setAccountState(prev => ({
                ...prev,
                selectedCharacter: character,
                charSelectTab: 'info',
                charCapture: { type: 'info' },
                charInfoLines: []
            }));
        }
        executeCommand(`info ${character.name}`, true);
    };

    const handlePractice = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic?.(15);
        if (setAccountState) {
            setAccountState(prev => ({
                ...prev,
                selectedCharacter: character,
                charSelectTab: 'practice',
                charCapture: { type: 'practice' },
                charPracticeLines: []
            }));
        }
        executeCommand(`practice ${character.name}`, true);
    };

    return (
        <div className="account-char-card" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <div className="account-char-card-header">
                <div className="account-char-card-title">
                    <span className="account-char-card-name">{character.name}</span>
                    <span className="account-char-card-meta">
                        {[character.race, character.sublevel, character.level ? `Lvl ${character.level}` : null].filter(Boolean).join(' • ')}
                    </span>
                </div>
            </div>

            <div className="account-char-card-actions">
                <button
                    type="button"
                    className="account-char-card-btn play-btn"
                    onClick={handlePlay}
                >
                    <Play size={13} fill="currentColor" />
                    <span>Play</span>
                </button>
                <button
                    type="button"
                    className={`account-char-card-btn tab-btn${activeTab === 'info' ? ' active' : ''}`}
                    onClick={handleInfo}
                >
                    <Info size={13} />
                    <span>Info</span>
                </button>
                <button
                    type="button"
                    className={`account-char-card-btn tab-btn${activeTab === 'practice' ? ' active' : ''}`}
                    onClick={handlePractice}
                >
                    <BookOpen size={13} />
                    <span>Prac</span>
                </button>
            </div>

            {activeTab && (
                <div className="account-char-card-content">
                    {activeTab === 'info' && (
                        <div className="account-char-card-lines">
                            {isInfoLoading ? (
                                <div className="account-char-card-loading">Loading character info…</div>
                            ) : (accountState?.charInfoLines && accountState.charInfoLines.length > 0) ? (
                                accountState.charInfoLines.map((line, idx) => (
                                    <AccountAnsiLine key={idx} line={line} className="account-char-card-line" />
                                ))
                            ) : (
                                <div className="account-char-card-empty">No info received yet</div>
                            )}
                        </div>
                    )}
                    {activeTab === 'practice' && (
                        <div className="account-char-card-lines">
                            {isPracticeLoading ? (
                                <div className="account-char-card-loading">Loading practice skills…</div>
                            ) : (accountState?.charPracticeLines && accountState.charPracticeLines.length > 0) ? (
                                accountState.charPracticeLines.map((line, idx) => (
                                    <AccountAnsiLine key={idx} line={line} className="account-char-card-line" />
                                ))
                            ) : (
                                <div className="account-char-card-empty">No practice data received yet</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
