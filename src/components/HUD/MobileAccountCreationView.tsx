/**
 * @file MobileAccountCreationView.tsx
 * @description Account confirmation, character creation, and stat editing surface.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import type { GameContextType } from '../../context/GameContext/types';
import type { AccountState } from '../../types';
import { AccountAnsiLine } from '../Drawers/AccountAnsiLine';
import { AccountCreationPanel } from '../Drawers/AccountCreationPanel';

interface MobileAccountCreationViewProps {
    accountState: AccountState;
    executeCommand: GameContextType['executeCommand'];
    triggerHaptic: GameContextType['triggerHaptic'];
    isCreationStage: boolean;
    isAccountConfirmation: boolean;
    waitingForPrompt: boolean;
}

export const MobileAccountCreationView: FC<MobileAccountCreationViewProps> = ({
    accountState,
    executeCommand,
    triggerHaptic,
    isCreationStage,
    isAccountConfirmation,
    waitingForPrompt
}) => {
    const creationContextLines = (accountState.creationPrompt?.description ?? '').split('\n');
    const creationContextAnsiLines = accountState.creationPrompt?.descriptionAnsiLines ?? creationContextLines;
    const creationContext = creationContextLines
        .filter((line, index) => line.trim() !== accountState.creationPrompt?.title.trim()
            && line.trim() !== accountState.creationPrompt?.sectionTitle?.trim()
            && Boolean(line.trim())
            && Boolean(creationContextAnsiLines[index] ?? line))
        .join('\n')
        .trim();
    const visibleCreationContextLines = creationContextLines
        .map((line, index) => ({ line, ansiLine: creationContextAnsiLines[index] ?? line }))
        .filter(({ line }) => Boolean(line.trim())
            && line.trim() !== accountState.creationPrompt?.title.trim()
            && line.trim() !== accountState.creationPrompt?.sectionTitle?.trim());
    const statLabels: Record<string, string> = {
        str: 'Strength', int: 'Intelligence', wis: 'Wisdom', dex: 'Dexterity',
        con: 'Constitution', wil: 'Willpower', per: 'Perception'
    };
    const parsedStatContext = accountState.creationPrompt?.title.toLowerCase().includes('stat')
        ? Object.entries(accountState.stats ?? {})
            .map(([key, value]) => `${statLabels[key] ?? key}: ${value}`)
            .join('  ·  ')
        : '';
    const hasStatValuesInContext = /(?:strength|str|intelligence|int|wisdom|wis|dexterity|dex|constitution|con|willpower|wil|perception|per)\s*[:=]?\s*\d+/i.test(creationContext);
    const creationContextWithStats = parsedStatContext && !hasStatValuesInContext
        ? [creationContext, parsedStatContext].filter(Boolean).join('\n')
        : creationContext;

    return (
        <div className={`mobile-account-create${accountState.stage === 'stat-editing' ? ' is-stat-editing' : ''}${visibleCreationContextLines.length || isAccountConfirmation ? ' has-context' : ''}`}>
            <div className="mobile-account-create-overview">
                {isAccountConfirmation && (
                    <div className="mobile-account-create-context" aria-label="Welcome to MUME account information">
                        <AccountAnsiLine line="Welcome to MUME!" className="mobile-account-context-line" />
                        <AccountAnsiLine line="" className="mobile-account-context-line" />
                        <AccountAnsiLine line="Your first step here is to create an ACCOUNT." className="mobile-account-context-line" />
                        <AccountAnsiLine line="" className="mobile-account-context-line" />
                        <AccountAnsiLine line="MUME characters are organized into accounts. You can only have one account, and it cannot be shared with other players. You can create as many characters as you like, but they must all belong to this account." className="mobile-account-context-line" />
                    </div>
                )}
                {(accountState.creationPrompt?.sectionTitle || creationContextWithStats) && (
                    <div className="mobile-account-create-context" aria-label="Creation context">
                        {accountState.creationPrompt?.sectionTitle && (
                            <AccountAnsiLine
                                line={accountState.creationPrompt.sectionTitleAnsi ?? accountState.creationPrompt.sectionTitle}
                                className="mobile-account-context-line"
                            />
                        )}
                        {parsedStatContext && !hasStatValuesInContext
                            ? <>{visibleCreationContextLines.map(({ ansiLine }, index) => <AccountAnsiLine key={`${index}-${ansiLine}`} line={ansiLine} className="mobile-account-context-line" />)}<div className="mobile-account-context-line">{parsedStatContext}</div></>
                            : visibleCreationContextLines.map(({ ansiLine }, index) => <AccountAnsiLine key={`${index}-${ansiLine}`} line={ansiLine} className="mobile-account-context-line" />)}
                    </div>
                )}
                {accountState.stage !== 'stat-editing' && accountState.creationPrompt?.title && (
                    <AccountAnsiLine
                        line={accountState.creationPrompt.titleAnsi ?? accountState.creationPrompt.title}
                        className="mobile-account-create-prompt"
                    />
                )}
                {isAccountConfirmation && accountState.currentPrompt && (
                    <AccountAnsiLine line={accountState.currentPrompt} className="mobile-account-create-prompt" />
                )}
            </div>
            {waitingForPrompt ? (
                <div className="mobile-account-empty">Waiting for creation prompt…</div>
            ) : (
                <AccountCreationPanel
                    accountState={accountState}
                    executeCommand={executeCommand}
                    triggerHaptic={triggerHaptic}
                    compactMobileNavigation={isCreationStage}
                />
            )}
        </div>
    );
};
