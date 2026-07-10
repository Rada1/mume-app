/**
 * @file AccountDeck.tsx
 * @description Desktop account menu rendered in the bottom bar (the action-box
 * slot), mirroring the in-game CommandDeck layout: a status column, a center
 * column with menu tabs + character list + name input, and a detail column.
 * Reuses the same accountState machine the AccountDrawer drives. Login itself
 * still lives in InputArea; this covers the post-login "account-menu" stage.
 * Desktop-only.
 */

import React, { FC, useState } from 'react';
import {
    Play, Plus, KeyRound, Clock, Link2, Activity,
    Info, BookOpen, ArrowLeft, UserCircle, LogOut, MapPin, Timer
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import type { GameContextType } from '../../context/GameContext/types';
import type { AccountState, CharacterEntry } from '../../types';
import { AccountAnsiLine } from '../Drawers/AccountAnsiLine';
import { AccountCreationPanel } from '../Drawers/AccountCreationPanel';
import './AccountDeck.css';

const capitalize = (v: string): string => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '');

const MENU_TABS: { cmd: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
    { cmd: 'play', label: 'Play', icon: Play },
    { cmd: 'create', label: 'Create', icon: Plus },
    { cmd: 'password', label: 'Password', icon: KeyRound },
    { cmd: 'time', label: 'Time', icon: Clock },
    { cmd: 'link', label: 'Link', icon: Link2 },
    { cmd: 'lag', label: 'Lag', icon: Activity }
];

const DATA_TITLES: Record<string, string> = { time: 'Game Time', link: 'Link Status', lag: 'Lag Report' };
const DATA_LINES: Record<string, keyof AccountState> = { time: 'timeLines', link: 'linkLines', lag: 'lagLines' };

export const AccountDeck: FC = () => {
    const { accountState, setAccountState, executeCommand, triggerHaptic } = useGame() as GameContextType;
    const [playNameInput, setPlayNameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');

    const selectedMenuCommand = accountState.selectedMenuCommand ?? null;
    const characters = accountState.characters ?? [];

    // Login / confirmation are handled by the login card in InputArea; the deck
    // only covers the post-login account menu (and the creation flows below).
    if (accountState.stage === 'login' || accountState.stage === 'account-confirmation') return null;

    const goBack = () => {
        triggerHaptic(10);
        setPlayNameInput('');
        setPasswordInput('');
        setAccountState((prev: AccountState) => ({ ...prev, selectedMenuCommand: null, selectedCharacter: null, charSelectTab: null, charCapture: null }));
        executeCommand('menu');
    };

    const selectMenuCommand = (command: string) => {
        triggerHaptic(20);
        if (command === 'play') {
            setAccountState((prev: AccountState) => ({ ...prev, selectedMenuCommand: 'play', characters: [], selectedCharacter: null, charSelectTab: null, isGathering: true }));
            executeCommand('list', true);
            return;
        }
        if (command === 'time' || command === 'link' || command === 'lag') {
            const captureKey = `${command}Lines` as 'timeLines' | 'linkLines' | 'lagLines';
            setAccountState((prev: AccountState) => ({ ...prev, selectedMenuCommand: command, charCapture: { type: command }, [captureKey]: [] }));
            executeCommand(command);
            return;
        }
        setAccountState((prev: AccountState) => ({ ...prev, selectedMenuCommand: command }));
    };

    const selectCharacter = (entry: CharacterEntry) => {
        triggerHaptic(15);
        setPlayNameInput(entry.name);
        setAccountState((prev: AccountState) => ({ ...prev, selectedCharacter: entry, charSelectTab: null, charInfoLines: [], charPracticeLines: [] }));
    };

    const playName = (name?: string) => {
        const target = (name ?? playNameInput).trim() || accountState.selectedCharacter?.name;
        if (!target) return;
        triggerHaptic(30);
        executeCommand(`play ${target}`);
    };

    const requestCharacterData = (mode: 'info' | 'practice') => {
        const name = playNameInput.trim() || accountState.selectedCharacter?.name;
        if (!name) return;
        const character = characters.find(c => c.name.toLowerCase() === name.toLowerCase())
            ?? { name, race: '', level: '', logon: '', area: '', rent: '' };
        triggerHaptic(10);
        setAccountState((prev: AccountState) => ({
            ...prev,
            selectedCharacter: character,
            charSelectTab: mode,
            charCapture: { type: mode },
            ...(mode === 'info' ? { charInfoLines: [] } : { charPracticeLines: [] })
        }));
        executeCommand(`${mode === 'info' ? 'info' : 'practice'} ${name}`, true);
    };

    // Multi-step flows keep their dedicated panel, spanning the whole bar.
    if (accountState.stage === 'character-creation' || accountState.stage === 'stat-editing') {
        return (
            <div className="account-deck account-deck-wide">
                <AccountCreationPanel accountState={accountState} executeCommand={executeCommand} triggerHaptic={triggerHaptic} />
            </div>
        );
    }

    const renderCharChips = () => (
        characters.length ? (
            <div className="account-char-list">
                {characters.map(entry => (
                    <button
                        key={entry.name}
                        type="button"
                        className={`account-char-chip${playNameInput === entry.name ? ' is-active' : ''}`}
                        onClick={() => selectCharacter(entry)}
                        title={entry.rawLine || entry.name}
                    >
                        <span className="account-char-name">{entry.name}</span>
                        {(entry.level || entry.race) && (
                            <span className="account-char-meta">{[entry.level, entry.race].filter(Boolean).join(' · ')}</span>
                        )}
                        {(entry.area || entry.rent) && (
                            <span className="account-char-detail">
                                {entry.area && <span className="account-char-loc"><MapPin size={9} strokeWidth={2.4} />{entry.area}</span>}
                                {entry.rent && <span className="account-char-rent"><Timer size={9} strokeWidth={2.4} />{entry.rent}</span>}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        ) : (
            <div className="account-empty">{accountState.isGathering ? 'Loading characters…' : 'No characters listed — press Play to load them.'}</div>
        )
    );

    // --- Center content, by active menu command ---
    let center: React.ReactNode;
    if (selectedMenuCommand === 'password') {
        center = (
            <div className="account-form-row">
                <input className="account-input" type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="New password…" />
                <button className="account-btn account-btn-primary" disabled={!passwordInput.trim()} onClick={() => { executeCommand(`password ${passwordInput.trim()}`); setPasswordInput(''); }}>Change password</button>
            </div>
        );
    } else if (selectedMenuCommand === 'create') {
        center = (
            <div className="account-form-row">
                <button className="account-btn account-btn-primary" onClick={() => executeCommand('create')}><Plus size={14} /> Create character</button>
            </div>
        );
    } else if (selectedMenuCommand === 'time' || selectedMenuCommand === 'link' || selectedMenuCommand === 'lag') {
        const lines = (accountState[DATA_LINES[selectedMenuCommand]] ?? []) as string[];
        center = (
            <div className="account-data">
                <div className="account-data-lines">
                    {lines.length ? lines.map((line, i) => <AccountAnsiLine key={i} line={line} />) : <div className="account-empty">Loading…</div>}
                </div>
                <button className="account-btn" onClick={() => selectMenuCommand(selectedMenuCommand)}>Refresh</button>
            </div>
        );
    } else {
        // play / default — character list + name input + actions
        center = (
            <>
                {renderCharChips()}
                <div className="account-form-row">
                    <input
                        className="account-input"
                        value={playNameInput}
                        onChange={e => setPlayNameInput(e.target.value)}
                        placeholder="Character name…"
                        onKeyDown={e => { if (e.key === 'Enter') playName(); }}
                    />
                    <button className="account-btn" disabled={!playNameInput.trim()} onClick={() => requestCharacterData('info')} title="Info"><Info size={14} /> Info</button>
                    <button className="account-btn account-btn-primary" disabled={!playNameInput.trim()} onClick={() => playName()}><Play size={14} /> Play {playNameInput.trim() ? capitalize(playNameInput.trim()) : '…'}</button>
                    <button className="account-btn" disabled={!playNameInput.trim()} onClick={() => requestCharacterData('practice')} title="Skills"><BookOpen size={14} /> Skills</button>
                </div>
            </>
        );
    }

    // --- Detail column ---
    const selected = accountState.selectedCharacter;
    const detailLines = selected
        ? (accountState.charSelectTab === 'practice' ? (accountState.charPracticeLines ?? []) : (accountState.charInfoLines ?? []))
        : [];

    return (
        <div className="account-deck" onClick={e => e.stopPropagation()}>
            {/* Status column */}
            <div className="account-col account-status">
                <div className="account-col-label">ACCOUNT</div>
                <div className="account-status-name"><UserCircle size={15} /> Signed in</div>
                <div className="account-status-meta">{characters.length ? `${characters.length} character${characters.length === 1 ? '' : 's'}` : 'Menu'}</div>
                <div className="account-status-actions">
                    {(selectedMenuCommand || selected) && (
                        <button className="account-btn account-btn-sm" onClick={goBack}><ArrowLeft size={14} /> Menu</button>
                    )}
                    <button className="account-btn account-btn-sm" onClick={() => { triggerHaptic(20); executeCommand('quit'); }} title="Quit"><LogOut size={14} /></button>
                </div>
            </div>

            {/* Center column: tabs + content */}
            <div className="account-col account-center">
                <div className="account-tab-rail" role="tablist" aria-label="Account menu">
                    {MENU_TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = selectedMenuCommand === tab.cmd || (!selectedMenuCommand && tab.cmd === 'play');
                        return (
                            <button
                                key={tab.cmd}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                className={`account-tab${active ? ' is-active' : ''}`}
                                onClick={() => selectMenuCommand(tab.cmd)}
                            >
                                <Icon size={12} strokeWidth={2.2} /><span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="account-center-body">{center}</div>
            </div>

            {/* Detail column */}
            <div className="account-col account-detail">
                <div className="account-col-label">{selected ? selected.name.toUpperCase() : 'DETAILS'}</div>
                {selected ? (
                    <>
                        <div className="account-detail-tabs">
                            <button className={`account-mini-tab${accountState.charSelectTab === 'info' ? ' is-active' : ''}`} onClick={() => { setAccountState((prev: AccountState) => ({ ...prev, charSelectTab: 'info', charCapture: { type: 'info' }, charInfoLines: [] })); executeCommand(`info ${selected.name}`, true); }}><Info size={13} /> Info</button>
                            <button className={`account-mini-tab${accountState.charSelectTab === 'practice' ? ' is-active' : ''}`} onClick={() => { setAccountState((prev: AccountState) => ({ ...prev, charSelectTab: 'practice', charCapture: { type: 'practice' }, charPracticeLines: [] })); executeCommand(`practice ${selected.name}`, true); }}><BookOpen size={13} /> Skills</button>
                        </div>
                        <div className="account-detail-lines">
                            {accountState.charSelectTab
                                ? (detailLines.length ? detailLines.map((line, i) => <AccountAnsiLine key={i} line={line} />) : <div className="account-empty">Loading…</div>)
                                : <div className="account-empty">Select Info or Skills.</div>}
                        </div>
                        <button className="account-btn account-btn-primary account-detail-play" onClick={() => playName(selected.name)}><Play size={14} /> Play {capitalize(selected.name)}</button>
                    </>
                ) : (
                    <div className="account-empty">Pick a character to see info or skills.</div>
                )}
            </div>
        </div>
    );
};

export default AccountDeck;
