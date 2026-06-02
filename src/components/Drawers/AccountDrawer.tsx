/**
 * @file AccountDrawer.tsx
 * @description Desktop account-mode command surface for the utility drawer.
 */

import React from 'react';
import { ArrowLeft, BookOpen, Info } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import type { GameContextType } from '../../context/GameContext/types';
import type { AccountState, CharacterEntry } from '../../types';
import { AccountAnsiLine } from './AccountAnsiLine';
import { AccountCreationPanel } from './AccountCreationPanel';

// --- Logic Section ---

const capitalize = (value: string): string => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

const DATA_TITLES: Record<'time' | 'link' | 'lag', string> = {
    time: 'Game Time',
    link: 'Link Status',
    lag: 'Lag Report',
};

const DATA_LINES: Record<'time' | 'link' | 'lag', keyof AccountState> = {
    time: 'timeLines',
    link: 'linkLines',
    lag: 'lagLines',
};

const AccountHeader: React.FC<{ title: string; subtitle?: string; onBack?: () => void }> = ({ title, subtitle, onBack }) => (
    <div className="cmd-action-header">
        {onBack && <button className="char-back-btn" onClick={onBack}><ArrowLeft size={18} strokeWidth={2.8} /></button>}
        <div className="cmd-action-title-stack">
            <span className="cmd-action-title">{title}</span>
            {subtitle && <span className="cmd-action-subtitle">{subtitle}</span>}
        </div>
    </div>
);

const CharacterButton: React.FC<{
    entry: CharacterEntry;
    selected?: boolean;
    onClick: () => void;
}> = ({ entry, selected, onClick }) => (
    <button className={`cmd-play-char-item${selected ? ' selected' : ''}`} onClick={onClick}>
        {entry.rawLine || entry.name}
    </button>
);

export const AccountDrawer: React.FC = () => {
    const { accountState, setAccountState, executeCommand, triggerHaptic } = useGame() as GameContextType;
    const [playNameInput, setPlayNameInput] = React.useState('');
    const [passwordInput, setPasswordInput] = React.useState('');
    const selectedMenuCommand = accountState.selectedMenuCommand ?? null;
    const isCreationStage = ['character-creation', 'stat-editing'].includes(accountState.stage);

    const goBack = React.useCallback(() => {
        triggerHaptic(10);
        setPlayNameInput('');
        setPasswordInput('');
        setAccountState((prev: AccountState) => ({
            ...prev,
            selectedMenuCommand: null,
            selectedCharacter: null,
            charSelectTab: null,
            charCapture: null,
        }));
        executeCommand('menu');
    }, [executeCommand, setAccountState, triggerHaptic]);

    const selectCharacter = (entry: CharacterEntry) => {
        triggerHaptic(15);
        setPlayNameInput(entry.name);
        setAccountState((prev: AccountState) => ({
            ...prev,
            selectedCharacter: entry,
            charSelectTab: null,
            charInfoLines: [],
            charPracticeLines: [],
        }));
    };

    const selectMenuCommand = (command: string) => {
        triggerHaptic(20);
        if (command === 'play') {
            setAccountState((prev: AccountState) => ({
                ...prev,
                selectedMenuCommand: 'play',
                characters: [],
                selectedCharacter: null,
                charSelectTab: null,
                isGathering: true,
            }));
            executeCommand('list', true);
            return;
        }
        if (command === 'list') {
            setAccountState((prev: AccountState) => ({
                ...prev,
                selectedMenuCommand: null,
                characters: [],
                selectedCharacter: null,
                charSelectTab: null,
            }));
            executeCommand('list');
            return;
        }
        if (command === 'time' || command === 'link' || command === 'lag') {
            const captureKey = `${command}Lines` as 'timeLines' | 'linkLines' | 'lagLines';
            setAccountState((prev: AccountState) => ({
                ...prev,
                selectedMenuCommand: command,
                charCapture: { type: command },
                [captureKey]: [],
            }));
            executeCommand(command);
            return;
        }
        setAccountState((prev: AccountState) => ({ ...prev, selectedMenuCommand: command }));
    };

    const playSelectedName = () => {
        const name = playNameInput.trim() || accountState.selectedCharacter?.name;
        if (!name) return;
        triggerHaptic(30);
        executeCommand(`play ${name}`);
    };

    const requestCharacterData = (mode: 'info' | 'practice') => {
        const name = playNameInput.trim() || accountState.selectedCharacter?.name;
        if (!name) return;
        const character = accountState.characters.find(char => char.name.toLowerCase() === name.toLowerCase()) ?? {
            name,
            race: '',
            level: '',
            logon: '',
            area: '',
            rent: '',
        };
        triggerHaptic(10);
        setAccountState((prev: AccountState) => ({
            ...prev,
            selectedCharacter: character,
            charSelectTab: mode,
            charCapture: { type: mode },
            ...(mode === 'info' ? { charInfoLines: [] } : { charPracticeLines: [] }),
        }));
        executeCommand(`${mode === 'info' ? 'info' : 'practice'} ${name}`, true);
    };

    const renderDataPanel = (command: 'time' | 'link' | 'lag') => {
        const lines = (accountState[DATA_LINES[command]] ?? []) as string[];
        return (
            <div className="cmd-action-panel">
                <AccountHeader title={DATA_TITLES[command]} onBack={goBack} />
                <div className="char-detail-content">
                    {lines.length > 0
                        ? <div className="char-data-lines">{lines.map((line, i) => <AccountAnsiLine key={i} line={line} />)}</div>
                        : <div className="char-data-loading">Loading...</div>}
                </div>
                <div className="char-detail-play">
                    <button className="char-play-btn" onClick={() => selectMenuCommand(command)}>Refresh</button>
                </div>
            </div>
        );
    };

    if (accountState.stage === 'login' || accountState.stage === 'account-confirmation') {
        return <div className="char-select-hint"><span className="char-select-label">Log In</span><span className="char-select-sublabel">Use the login card in the main view</span></div>;
    }

    if (accountState.selectedCharacter) {
        const selected = accountState.selectedCharacter;
        const infoLines = accountState.charInfoLines ?? [];
        const practiceLines = accountState.charPracticeLines ?? [];
        const activeLines = accountState.charSelectTab === 'practice' ? practiceLines : infoLines;
        return (
            <div className="char-detail-panel">
                <AccountHeader title={selected.name} onBack={() => setAccountState((prev: AccountState) => ({ ...prev, selectedCharacter: null }))} />
                <div className="char-detail-tabs">
                    <button className={`char-tab-btn${accountState.charSelectTab === 'info' ? ' active' : ''}`} onClick={() => { setAccountState((prev: AccountState) => ({ ...prev, charSelectTab: 'info', charCapture: { type: 'info' }, charInfoLines: [] })); executeCommand(`info ${selected.name}`, true); }}><Info size={16} /><span>Info</span></button>
                    <button className={`char-tab-btn${accountState.charSelectTab === 'practice' ? ' active' : ''}`} onClick={() => { setAccountState((prev: AccountState) => ({ ...prev, charSelectTab: 'practice', charCapture: { type: 'practice' }, charPracticeLines: [] })); executeCommand(`practice ${selected.name}`, true); }}><BookOpen size={16} /><span>Skills</span></button>
                </div>
                <div className="char-detail-content">
                    {accountState.charSelectTab
                        ? <div className="char-data-lines">{activeLines.length ? activeLines.map((line, i) => <AccountAnsiLine key={i} line={line} />) : <div className="char-data-loading">Loading...</div>}</div>
                        : <div className="char-detail-hint">Select Info or Skills to view details</div>}
                </div>
                <div className="char-detail-play"><button className="char-play-btn" onClick={() => executeCommand(`play ${selected.name}`)}>Play {capitalize(selected.name)}</button></div>
            </div>
        );
    }

    if (isCreationStage) {
        return <AccountCreationPanel accountState={accountState} executeCommand={executeCommand} triggerHaptic={triggerHaptic} />;
    }

    if (selectedMenuCommand === 'play') {
        return (
            <div className="cmd-action-panel">
                <AccountHeader title="Play Character" subtitle="Name / Rce / Sub / Lvl / Logon area / Rent / Delete" onBack={goBack} />
                <div className="cmd-play-char-list">
                    {accountState.characters.length
                        ? accountState.characters.map((entry: CharacterEntry) => <CharacterButton key={entry.name} entry={entry} selected={playNameInput === entry.name} onClick={() => selectCharacter(entry)} />)
                        : <div className="char-data-loading">Loading...</div>}
                </div>
                <div className="cmd-action-body">
                    <input className="cmd-name-input" value={playNameInput} onChange={e => setPlayNameInput(e.target.value)} placeholder="Character name..." onKeyDown={e => { if (e.key === 'Enter') playSelectedName(); }} />
                    <div className="cmd-play-action-row">
                        <button className="char-secondary-btn" disabled={!playNameInput.trim()} onClick={() => requestCharacterData('info')} aria-label="Show character info" title="Info"><Info size={16} /><span>Info</span></button>
                        <button className="char-play-btn" disabled={!playNameInput.trim()} onClick={playSelectedName}>Play {playNameInput.trim() ? capitalize(playNameInput.trim()) : '...'}</button>
                        <button className="char-secondary-btn" disabled={!playNameInput.trim()} onClick={() => requestCharacterData('practice')} aria-label="Show character skills and spells" title="Skills and spells"><BookOpen size={16} /><span>Skills</span></button>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedMenuCommand === 'create') {
        return <div className="cmd-action-panel"><AccountHeader title="New Character" onBack={goBack} /><div className="cmd-action-body"><button className="char-play-btn" onClick={() => executeCommand('create')}>Create Character</button></div></div>;
    }
    if (selectedMenuCommand === 'password') {
        return <div className="cmd-action-panel"><AccountHeader title="Change Password" onBack={goBack} /><div className="cmd-action-body"><input className="cmd-name-input" type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="New password..." /><button className="char-play-btn" disabled={!passwordInput.trim()} onClick={() => { executeCommand(`password ${passwordInput.trim()}`); setPasswordInput(''); }}>Change Password</button></div></div>;
    }
    if (selectedMenuCommand === 'time' || selectedMenuCommand === 'link' || selectedMenuCommand === 'lag') return renderDataPanel(selectedMenuCommand);

    return (
        <div className="char-select-panel" style={{ padding: 12, gap: 10 }}>
            {accountState.characters.length > 0 && (
                <div className="cmd-play-char-list">
                    {accountState.characters.map((entry: CharacterEntry) => <CharacterButton key={entry.name} entry={entry} onClick={() => selectCharacter(entry)} />)}
                </div>
            )}
        </div>
    );
};
