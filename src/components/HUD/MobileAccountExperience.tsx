/**
 * @file MobileAccountExperience.tsx
 * @description Focused mobile account screens that replace the scrolling account log.
 */

// --- Logic Section ---
import React, { FC, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import type { GameContextType } from '../../context/GameContext/types';
import type { AccountState, CharacterEntry } from '../../types';
import { useInputStore } from '../../stores/useInputStore';
import { AccountAnsiLine } from '../Drawers/AccountAnsiLine';
import { AccountCreationPanel } from '../Drawers/AccountCreationPanel';
import { MobileAccountCharacterActionButton } from './MobileAccountCharacterActionButton';
import { MobileAccountLoginPanel } from './MobileAccountLoginPanel';
import './MobileAccountExperience.css';
import './MobileAccountExperienceCreation.css';

type AccountTab = 'account' | 'characters' | 'create';
type AccountAction = 'time' | 'link' | 'lag' | 'password' | null;

const accountActions: { command: Exclude<AccountAction, null> | 'logout'; label: string }[] = [
    { command: 'time', label: 'Time' },
    { command: 'link', label: 'Link' },
    { command: 'lag', label: 'Lag' },
    { command: 'password', label: 'Password' },
    { command: 'logout', label: 'Log out' },
];

const lineForAction = (state: AccountState, action: AccountAction): string[] => {
    if (action === 'time') return state.timeLines ?? [];
    if (action === 'link') return state.linkLines ?? [];
    if (action === 'lag') return state.lagLines ?? [];
    return [];
};

const characterLine = (entry: CharacterEntry): string => entry.rawLine
    || [entry.name, entry.race, entry.sublevel, entry.level, entry.logon, entry.area, entry.rent].filter(Boolean).join('  ');

export const MobileAccountExperience: FC = () => {
    const {
        gameState, accountState, setAccountState, executeCommand, triggerHaptic
    } = useGame() as GameContextType;
    const isCreationStage = accountState.stage === 'character-creation' || accountState.stage === 'stat-editing';
    const isAccountConfirmation = accountState.stage === 'account-confirmation';
    const [activeTab, setActiveTab] = useState<AccountTab>(isCreationStage || isAccountConfirmation ? 'create' : 'characters');
    const [accountAction, setAccountAction] = useState<AccountAction>(null);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const listRequestedRef = useRef(false);
    const previousStageRef = useRef(accountState.stage);
    const requestedTabRef = useRef<AccountTab | null>(null);

    const requestCharacters = useCallback((force = false) => {
        if (!force && accountState.characters.length > 0) return;
        listRequestedRef.current = true;
        setAccountState((prev: AccountState) => ({
            ...prev, characters: [], selectedCharacter: null, charSelectTab: null, isGathering: true
        }));
        executeCommand('list', true);
    }, [accountState.characters.length, executeCommand, setAccountState]);

    useEffect(() => {
        const wasCreation = ['character-creation', 'stat-editing', 'account-confirmation'].includes(previousStageRef.current);
        if (isCreationStage || isAccountConfirmation) {
            setActiveTab('create');
            setAccountAction(null);
        } else if (wasCreation && accountState.stage === 'account-menu') {
            setActiveTab(requestedTabRef.current ?? 'characters');
            requestedTabRef.current = null;
        }
        if (accountState.stage === 'login') listRequestedRef.current = false;
        previousStageRef.current = accountState.stage;
    }, [accountState.stage, isCreationStage, isAccountConfirmation]);

    useEffect(() => {
        if (activeTab !== 'characters' || accountState.stage !== 'account-menu' || accountState.characters.length > 0 || accountState.isGathering || listRequestedRef.current) return;
        requestCharacters();
    }, [activeTab, accountState.stage, accountState.characters.length, accountState.isGathering, requestCharacters]);

    const selectTab = (tab: AccountTab) => {
        if (isAccountConfirmation) return;
        if (isCreationStage) {
            if (tab === 'create') return;
            triggerHaptic?.(12);
            requestedTabRef.current = tab;
            setAccountAction(null);
            setIsMoreOpen(false);
            executeCommand('');
            setTimeout(() => executeCommand(''), 150);
            setTimeout(() => executeCommand('menu'), 300);
            return;
        }
        if (tab === 'create' && activeTab === 'create') return;
        triggerHaptic?.(12);
        setActiveTab(tab);
        setAccountAction(null);
        setIsMoreOpen(false);
        if (tab === 'characters') requestCharacters();
        if (tab === 'create') {
            setAccountState((prev: AccountState) => ({ ...prev, creationPrompt: undefined }));
            executeCommand('create');
        }
    };

    const runAccountAction = (command: Exclude<AccountAction, null> | 'logout') => {
        triggerHaptic?.(15);
        setAccountAction(command === 'logout' ? null : command);
        if (command === 'password') {
            setInput('');
            return;
        }
        if (command === 'logout') {
            executeCommand('quit');
            return;
        }
        setAccountState((prev: AccountState) => command === 'time'
            ? { ...prev, charCapture: { type: 'time' }, timeLines: [] }
            : command === 'link'
                ? { ...prev, charCapture: { type: 'link' }, linkLines: [] }
                : { ...prev, charCapture: { type: 'lag' }, lagLines: [] });
        executeCommand(command);
    };

    const input = useInputStore(state => state.input);
    const setInput = useInputStore(state => state.setInput);

    const submitPassword = (event: FormEvent) => {
        event.preventDefault();
        const value = input.trim();
        if (!value) return;
        triggerHaptic?.(15);
        executeCommand(`password ${value}`);
        setInput('');
    };

    const selectCharacter = (entry: CharacterEntry) => {
        triggerHaptic?.(12);
        setIsMoreOpen(false);
        setAccountState((prev: AccountState) => ({
            ...prev, selectedCharacter: entry, charSelectTab: null, charInfoLines: [], charPracticeLines: []
        }));
    };

    const requestCharacterData = (mode: 'info' | 'practice') => {
        const selected = accountState.selectedCharacter;
        if (!selected) return;
        triggerHaptic?.(15);
        setIsMoreOpen(false);
        setAccountState((prev: AccountState) => ({
            ...prev,
            charSelectTab: mode,
            charCapture: { type: mode },
            ...(mode === 'info' ? { charInfoLines: [] } : { charPracticeLines: [] })
        }));
        executeCommand(`${mode} ${selected.name}`, true);
    };

    if (gameState !== 'account') return null;

    if (accountState.stage === 'login') return <MobileAccountLoginPanel />;

    const showCreation = isCreationStage || isAccountConfirmation || activeTab === 'create';
    const activeLines = lineForAction(accountState, accountAction);
    const selected = accountState.selectedCharacter;
    const characterInfoLines = accountState.charSelectTab === 'practice'
        ? accountState.charPracticeLines ?? []
        : accountState.charInfoLines ?? [];
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
        .map((line, index) => ({
            line,
            ansiLine: creationContextAnsiLines[index] ?? line
        }))
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
    const hasStatValuesInContext = /(?:strength|str|intelligence|int|wisdom|wis|dexterity|dex|constitution|con|willpower|wil|perception|per)\s*[:=]?\s*\d+/i.test(creationContext ?? '');
    const creationContextWithStats = parsedStatContext && !hasStatValuesInContext
        ? [creationContext, parsedStatContext].filter(Boolean).join('\n')
        : creationContext;

    return (
        <main className={`mobile-account-experience${isCreationStage || isAccountConfirmation ? ' is-creation' : ''}`}>
            <header className="mobile-account-header">
                <div className="mobile-account-brand">MUME IX</div>
                {!isAccountConfirmation && (
                    <nav className="mobile-account-tabs" aria-label="Account">
                        {([
                            ['account', 'Account Menu'], ['characters', 'Characters'], ['create', 'Create']
                        ] as const).map(([tab, label]) => (
                            <button key={tab} type="button" className={activeTab === tab ? 'is-active' : ''} onClick={() => selectTab(tab)}>
                                {label}
                            </button>
                        ))}
                    </nav>
                )}
            </header>

            <section className="mobile-account-body">
                {showCreation ? (
                    <div className={`mobile-account-create${accountState.stage === 'stat-editing' ? ' is-stat-editing' : ''}`}>
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
                        {accountState.stage === 'account-menu' && activeTab === 'create' ? (
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
                ) : activeTab === 'characters' ? (
                    <div className="mobile-account-characters">
                        <div className="mobile-account-character-list" role="listbox" aria-label="Characters">
                            <div className="mobile-account-character-head" aria-hidden="true">Name　 Rce　 Sub　 Lvl　 Logon　 Area　 Rent</div>
                            {accountState.characters.map(entry => (
                                <button
                                    key={entry.name}
                                    type="button"
                                    role="option"
                                    aria-selected={selected?.name === entry.name}
                                    className={`mobile-account-character-row${selected?.name === entry.name ? ' is-selected' : ''}`}
                                    onClick={() => selectCharacter(entry)}
                                >
                                    {characterLine(entry)}
                                </button>
                            ))}
                            {accountState.isGathering && accountState.characters.length === 0 && <div className="mobile-account-empty">Loading characters…</div>}
                            {!accountState.isGathering && accountState.characters.length === 0 && (
                                <button type="button" className="mobile-account-empty mobile-account-refresh" onClick={() => requestCharacters(true)}>
                                    <RefreshCw size={16} /> Refresh list
                                </button>
                            )}
                        </div>
                        {selected && (
                            <div className="mobile-account-character-actions">
                                <MobileAccountCharacterActionButton command="play" label="Play" primary onClick={() => executeCommand(`play ${selected.name}`)} />
                                <div className="mobile-account-more-wrap">
                                    <button className="mobile-account-action" type="button" aria-expanded={isMoreOpen} onClick={() => setIsMoreOpen(open => !open)}>
                                        More <ChevronDown size={17} />
                                    </button>
                                    {isMoreOpen && (
                                        <div className="mobile-account-more-menu">
                                            <MobileAccountCharacterActionButton command="info" label="Info" onClick={() => requestCharacterData('info')} />
                                            <MobileAccountCharacterActionButton command="practice" label="Practice" onClick={() => requestCharacterData('practice')} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {selected && accountState.charSelectTab && (
                            <div className="mobile-account-character-data" aria-live="polite">
                                {characterInfoLines.length
                                    ? characterInfoLines.map((line, index) => <AccountAnsiLine key={`${index}-${line}`} line={line} className="mobile-account-data-line" />)
                                    : <div className="mobile-account-empty">Loading…</div>}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mobile-account-menu">
                        {accountAction === 'password' ? (
                            <form className="mobile-account-password-form" onSubmit={submitPassword}>
                                <input className="mobile-account-input" type="password" value={input} onChange={event => setInput(event.target.value)} placeholder="New password" autoComplete="new-password" />
                                <button className="mobile-account-action is-primary" type="submit">Change password</button>
                            </form>
                        ) : accountAction ? (
                            <div className="mobile-account-data" aria-live="polite">
                                {activeLines.length
                                    ? activeLines.map((line, index) => <AccountAnsiLine key={`${index}-${line}`} line={line} className="mobile-account-data-line" />)
                                    : <div className="mobile-account-empty">Loading…</div>}
                            </div>
                        ) : (
                            <div className="mobile-account-menu-grid">
                                {accountActions.map(action => (
                                    <button key={action.command} type="button" className="mobile-account-action" onClick={() => runAccountAction(action.command)}>
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
};

export default MobileAccountExperience;
