/**
 * @file CharacterCard.tsx
 * @description Full character summary — a panel docked to the left of the message
 * log with portrait, vitals, combat stats, equipment, inventory, and skills/spells
 * all in one place. Opened from the compact portrait/name in the prompt box.
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { X, Sword, Shield as ShieldIcon, Heart, Zap, Footprints, Sparkles, Coins, Star, GraduationCap, Compass, KeyRound, Swords, ScrollText, Trophy, Info, Pencil } from 'lucide-react';
import { useCharacterCardStore } from '../../stores/useCharacterCardStore';
import { useActiveVitals, useActiveCharacter, useActiveCombat } from '../../stores/useActiveGameState';
import { useArchiveStore } from '../../stores/useArchiveStore';
import { useGame, useUI } from '../../context/GameContext';
import { PromptCharacterPortrait } from './PromptCharacterPortrait';
import { PromptInventoryChips } from './PromptInventoryChips';
import { CharacterCardTimerStrip } from './CharacterCardTimerStrip';
import { MagicKeysTab } from '../Timers/MagicKeysTab';
import { CharacterCardLineSection } from './CharacterCardLineSection';
import { ArmourIcon, ConditionPill, InfoRow, Section, StatBar } from './CharacterCardPrimitives';
import { DrawerLine, CombatHealthStatus } from '../../types';
import { formatCompactNumber, formatCopperToCoins } from '../../utils/gameUtils';
import { buildPracticeDrawerLines } from '../../utils/practiceDrawerLines';
import { getRoomTerrainGlowColor } from '../../utils/roomTerrainVisuals';
import './CharacterCard.css';

interface CharacterCardProps {
    embedded?: boolean;
    forceOpen?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
    Healthy: '#4ade80', Fine: '#86efac', Hurt: '#facc15', Wounded: '#fb923c',
    Bad: '#f87171', Awful: '#ef4444', Dying: '#dc2626', Stunned: '#c084fc'
};
const statusColor = (s: CombatHealthStatus | null | string | undefined): string => STATUS_COLOR[s || ''] || 'rgba(255,255,255,0.6)';

const POSITION_LABELS: Record<string, string> = {
    standing: 'Standing', fighting: 'Fighting', sitting: 'Sitting', resting: 'Resting',
    sleeping: 'Sleeping', stunned: 'Stunned', incapacitated: 'Incapacitated', dying: 'Dying',
    riding: 'Riding', mounted: 'Mounted'
};
const positionLabel = (pos: string | undefined): string => POSITION_LABELS[(pos || '').toLowerCase()] ?? pos ?? '—';

const levelTierClass = (level: number | undefined): string => {
    if (!level || level <= 20) return 'level-tier-standard';
    if (level <= 25) return 'level-tier-gold';
    return 'level-tier-diamond';
};

const OrnateAvatarBorder: React.FC<{ level: number | undefined }> = ({ level }) => {
    const tier = levelTierClass(level);
    
    if (tier === 'level-tier-standard') {
        return (
            <svg className="ornate-border ornate-tier-standard" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="48" height="48" rx="4" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />
                <path d="M4 16V4h12M48 4h12v12M60 48v12H48M16 60H4v-12" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        );
    }
    
    if (tier === 'level-tier-gold') {
        return (
            <svg className="ornate-border ornate-tier-gold" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="48" height="48" rx="4" stroke="url(#goldGradient)" strokeWidth="1.5" />
                <rect x="11" y="11" width="42" height="42" rx="2" stroke="rgba(212, 170, 0, 0.15)" strokeWidth="1" />
                <path d="M3 18V3h15M46 3h15v15M61 46v15H46M18 61H3v-15" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 14L14 8M56 14L50 8M56 50L50 56M8 50L14 56" stroke="#fff2a8" strokeWidth="1.5" />
                <path d="M28 4l4 4 4-4-4-2-4 2z" fill="#ffd700" />
                <path d="M24 6h16" stroke="#ffd700" strokeWidth="1" />
                <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#fff2a8" />
                        <stop offset="50%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#c99738" />
                    </linearGradient>
                </defs>
            </svg>
        );
    }
    
    return (
        <svg className="ornate-border ornate-tier-diamond" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="8" width="48" height="48" rx="5" stroke="url(#diamondGradient)" strokeWidth="2" />
            <rect x="11" y="11" width="42" height="42" rx="3" stroke="rgba(158, 231, 255, 0.2)" strokeWidth="1" />
            
            <path d="M2 20V2h18M2 10h10V2" stroke="#8bd3ff" strokeWidth="2" strokeLinecap="round" />
            <path d="M62 20V2H44M62 10H52V2" stroke="#8bd3ff" strokeWidth="2" strokeLinecap="round" />
            <path d="M62 44v18H44M62 54H52v8" stroke="#8bd3ff" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 44v18h18M2 54h10v8" stroke="#8bd3ff" strokeWidth="2" strokeLinecap="round" />
            
            <path d="M14 14L8 8M50 14l6-6M50 50l6 6M14 50l-6 6" stroke="#ffffff" strokeWidth="1.5" />
            
            <path d="M26 6l6-5 6 5-6 3-6-3z" fill="#9ee7ff" />
            <path d="M32 1L29 4M32 1L35 4" stroke="#ffffff" strokeWidth="1" />
            <circle cx="32" cy="4" r="1.2" fill="#ffffff" />
            <path d="M22 6h20" stroke="#9ee7ff" strokeWidth="1.5" />
            
            <path d="M28 62l4 2 4-2-4-1.5-4 1.5z" fill="#8bd3ff" />
            
            <defs>
                <linearGradient id="diamondGradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#9ee7ff" />
                    <stop offset="70%" stopColor="#8bd3ff" />
                    <stop offset="100%" stopColor="#d7f7ff" />
                </linearGradient>
            </defs>
        </svg>
    );
};

const STAT_LABELS: Record<string, string> = {
    str: 'STR', int: 'INT', wis: 'WIS', dex: 'DEX', con: 'CON', wil: 'WIL', per: 'PER'
};
const STAT_ORDER = ['str', 'con', 'dex', 'int', 'wis', 'wil', 'per'];
interface AttributeScore { current: number; base?: number; }

/** Core attributes (Str/Con/Wis/Dex/Int/Wil/Per) aren't sent over GMCP — MUME
 * only reports them as plain text from the `info` command, so we scan the
 * captured info lines the same way character creation does. */
const parseAttributesFromLines = (lines: DrawerLine[]): Record<string, AttributeScore> => {
    const stats: Record<string, AttributeScore> = {};
    for (const line of lines) {
        const text = line.text || '';
        const matches = Array.from(text.matchAll(/(Str|Int|Wis|Wisdom|Dex|Con|Wil|Will|Per)\s*[:=]\s*(\d+)(?:\s*\((\d+)\))?/gi));
        for (const match of matches) {
            const key = match[1].toLowerCase();
            const canonicalKey = key.startsWith('wis') ? 'wis' : key.startsWith('wil') ? 'wil' : key;
            stats[canonicalKey] = {
                current: parseInt(match[2], 10),
                base: match[3] ? parseInt(match[3], 10) : undefined
            };
        }
    }
    return stats;
};

interface AvatarInfoFieldProps {
    label: string;
    value: string;
    placeholder: string;
    multiline?: boolean;
    onSave: (value: string) => void;
}

/** Editable read-out for the avatar popover — shows the server value with an
 * inline edit affordance that swaps to a text field on demand. */
const AvatarInfoField: React.FC<AvatarInfoFieldProps> = ({ label, value, placeholder, multiline, onSave }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        if (!editing) setDraft(value);
    }, [value, editing]);

    if (editing) {
        return (
            <div className="character-avatar-popover-field is-editing">
                <div className="character-avatar-popover-field-label">{label}</div>
                {multiline ? (
                    <textarea
                        className="character-avatar-popover-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        rows={3}
                        autoFocus
                    />
                ) : (
                    <input
                        className="character-avatar-popover-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                    />
                )}
                <div className="character-avatar-popover-field-actions">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onSave(draft); setEditing(false); }}>Save</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(false); }}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className="character-avatar-popover-field">
            <div className="character-avatar-popover-field-label">{label}</div>
            <div className="character-avatar-popover-field-value">{value ? value : <em>{placeholder}</em>}</div>
            <button
                type="button"
                className="character-avatar-popover-edit-btn"
                onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                aria-label={`Edit ${label}`}
                title={`Edit ${label}`}
            >
                <Pencil size={11} strokeWidth={2.5} />
            </button>
        </div>
    );
};

export const CharacterCard: React.FC<CharacterCardProps> = ({ embedded = false, forceOpen = false }) => {
    const isOpen = useCharacterCardStore(s => s.isOpen);
    const close = useCharacterCardStore(s => s.close);
    const [activePopover, setActivePopover] = useState<'info' | 'quests' | 'achievements' | 'avatar' | null>(null);
    const characterName = useActiveCharacter();
    const vitals = useActiveVitals();
    const combat = useActiveCombat();
    const { triggerHaptic, practice, executeCommand, mood, mumeEditState, handleSaveMumeEdit, handleCancelMumeEdit } = useGame();
    const { infoLines, questLines, achievementLines, practiceLines } = useUI();
    const setPendingEditorContext = useArchiveStore(s => s.setPendingEditorContext);
    const lastRefreshRef = useRef(0);
    const avatarRefreshRef = useRef(0);
    // "change description"/"change whois" open a real MUME editor session, and
    // MUME only allows one such session at a time — queue the reads (title
    // included, since firing it before the prior session closes also gets
    // "You are already editing that text.") so each waits for the last to close.
    const avatarFetchQueueRef = useRef<Array<'description' | 'whois' | 'title'>>([]);

    // Refresh drawer-backed character data whenever the card opens, throttled.
    useEffect(() => {
        if (!isOpen && !forceOpen) return;
        const now = Date.now();
        if (now - lastRefreshRef.current < 5000) return;
        lastRefreshRef.current = now;
        executeCommand('info', true, true, true, true);
        executeCommand('quest', true, true, false, true);
        executeCommand('practice', true, true, false, true);
        executeCommand('achievement', true, true, false, true);
    }, [isOpen, forceOpen, executeCommand]);

    const runNextAvatarFetch = () => {
        const next = avatarFetchQueueRef.current.shift();
        if (next === 'description') {
            setPendingEditorContext({ kind: 'self-description', action: 'read' });
            executeCommand('change description', true, true, false, true);
        } else if (next === 'whois') {
            setPendingEditorContext({ kind: 'self-whois', action: 'read' });
            executeCommand('change whois', true, true, false, true);
        } else if (next === 'title') {
            executeCommand('change title', true, true, false, true);
        }
    };

    // Silently reads the current description/whois/title. Description and whois
    // ride MUME's real GMCP editor session (Mume.MumeEdit / Mume.Client.Write) —
    // the generic editor modal is suppressed for these kinds (see MumeEditor.tsx)
    // so the user never sees it open.
    const openAvatarPopover = () => {
        setActivePopover('avatar');
        const now = Date.now();
        if (now - avatarRefreshRef.current < 4000) return;
        avatarRefreshRef.current = now;
        avatarFetchQueueRef.current = ['description', 'whois', 'title'];
        runNextAvatarFetch();
    };

    // Resolve read/write editor sessions as they open, without ever showing
    // the generic editor modal (mirrors the archive-compose/reply flow).
    useEffect(() => {
        if (!mumeEditState.isOpen) return;
        const context = mumeEditState.context;
        if (!context || (context.kind !== 'self-description' && context.kind !== 'self-whois')) return;
        const field = context.kind === 'self-description' ? 'description' : 'whois';

        if (context.action === 'read') {
            vitals.setCharacterInfo({ [field]: mumeEditState.text } as any);
            // MUME only allows one active edit session at a time — a real cancel
            // (Mume.Client.CancelEdit) is what actually releases the server-side
            // lock. Just dropping local state (or resaving unchanged text) leaves
            // it open, so the next "change ..." command comes back
            // "You are already editing that text."
            handleCancelMumeEdit();
            runNextAvatarFetch();
        } else {
            handleSaveMumeEdit(context.value || '');
            vitals.setCharacterInfo({ [field]: context.value || '' } as any);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mumeEditState]);

    const saveTitle = (value: string) => {
        triggerHaptic?.(15);
        executeCommand(`change title ${value.trim() || 'none'}`, false, false, false, true);
        setTimeout(() => executeCommand('change title', true, true, false, true), 600);
    };

    const saveDescription = (value: string) => {
        triggerHaptic?.(15);
        setPendingEditorContext({ kind: 'self-description', action: 'write', value: value.trim() });
        executeCommand('change description', true, true, false, true);
    };

    const saveWhois = (value: string) => {
        triggerHaptic?.(15);
        setPendingEditorContext({ kind: 'self-whois', action: 'write', value: value.trim() });
        executeCommand('change whois', true, true, false, true);
    };

    const attributes = useMemo(() => parseAttributesFromLines(infoLines || []), [infoLines]);
    const practiceTargetLines = useMemo(
        () => buildPracticeDrawerLines(practice.practiceData, practiceLines || []),
        [practice.practiceData, practiceLines]
    );

    if (!isOpen && !forceOpen) return null;

    const info = vitals.characterInfo;
    const { gold: goldCoins, silver, copper } = useMemo(() => {
        return formatCopperToCoins(info.gold || 0);
    }, [info.gold]);

    const subtitle = [
        info.level ? `Level ${info.level}` : null,
        info.race,
        info.subclass || info.class
    ].filter(Boolean).join(' • ');

    const handleClose = () => {
        triggerHaptic?.(10);
        close();
    };

    const combatStats: Array<{ id: string; label: string; display: string; icon: React.ReactNode; title?: string }> = [
        { id: 'ob', label: 'OB', display: vitals.ob !== undefined ? `${vitals.ob}%` : '--', icon: <Sword size={12} strokeWidth={2.5} /> },
        { id: 'db', label: 'DB', display: vitals.db !== undefined ? `${vitals.db}%` : '--', icon: <ShieldIcon size={12} strokeWidth={2.5} /> },
        { id: 'pb', label: 'PB', display: vitals.pb !== undefined ? `${vitals.pb}%` : '--', icon: <ShieldIcon size={12} strokeWidth={2.5} /> },
        { id: 'armour', label: 'Armour', display: vitals.armour !== undefined ? `${vitals.armour}%` : '--', icon: <ArmourIcon size={12} /> }
    ];

    const progressStats: Array<{ id: string; label: string; display: string; icon: React.ReactNode; title?: string }> = [
        {
            id: 'xp', label: 'XP', display: formatCompactNumber(info.xp), icon: <Star size={12} strokeWidth={2.5} />,
            title: `${info.xp.toLocaleString()} XP${info.tnl > 0 ? ` (${info.tnl.toLocaleString()} to next level)` : ''}`
        },
        {
            id: 'tp', label: 'TP', display: formatCompactNumber(info.tp), icon: <GraduationCap size={12} strokeWidth={2.5} />,
            title: `${info.tp.toLocaleString()} TP${info.tpnl > 0 ? ` (${info.tpnl.toLocaleString()} to next level)` : ''}`
        }
    ];

    const isRidingOrMounted = vitals.position === 'riding' || vitals.position === 'mounted';
    const hasConditions = vitals.isHidden || !!vitals.sneak || !!vitals.climb || vitals.isSwimming || vitals.isRidden || isRidingOrMounted;
    const hasCombatInfo = !!combat.opponentName || !!combat.bufferName;
    const refreshInfo = () => {
        triggerHaptic?.(15);
        executeCommand('info', true, true, false, true);
    };
    const refreshQuests = () => {
        triggerHaptic?.(15);
        executeCommand('quest', true, true, false, true);
    };
    const refreshSkills = () => {
        triggerHaptic?.(15);
        executeCommand('practice', true, true, false, true);
    };
    const refreshAchievements = () => {
        triggerHaptic?.(15);
        executeCommand('achievement', true, true, false, true);
    };

    return (
        <aside className={`character-card character-card-dock${embedded ? ' character-card-embedded' : ''}`} aria-label="Character card">
                {!embedded && (
                    <button className="character-card-close" onClick={handleClose} aria-label="Close character card">
                        <X size={16} strokeWidth={2.5} />
                    </button>
                )}

                <div 
                    className="character-card-header"
                    style={{
                        '--terrain-glow-color': (info?.level ?? 0) >= 26
                            ? 'rgba(232, 176, 32, 0.24)'
                            : getRoomTerrainGlowColor(vitals.currentTerrain)
                    } as React.CSSProperties}
                >
                    <div
                        className="character-avatar-pixel-wrapper"
                        onMouseEnter={openAvatarPopover}
                        onMouseLeave={() => setActivePopover(prev => prev === 'avatar' ? null : prev)}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (activePopover === 'avatar') setActivePopover(null);
                            else openAvatarPopover();
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Character description, whois, and title"
                    >
                        <div className="character-avatar-pixel" aria-hidden="true">
                            <div className="terrain-pin-sprite-head" />
                            <div className="terrain-pin-sprite-body" />
                        </div>
                        <OrnateAvatarBorder level={info.level} />

                        {activePopover === 'avatar' && (
                            <div className="character-info-popover character-avatar-popover" onClick={(e) => e.stopPropagation()}>
                                <div className="character-info-popover-header">
                                    <span>Character Card</span>
                                    <button
                                        type="button"
                                        className="character-info-popover-close"
                                        onClick={(e) => { e.stopPropagation(); setActivePopover(null); }}
                                        aria-label="Close popover"
                                    >
                                        <X size={10} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="character-info-popover-content character-avatar-popover-content">
                                    <AvatarInfoField label="Title" value={info.title || ''} placeholder="No title set" onSave={saveTitle} />
                                    <AvatarInfoField label="Description" value={info.description || ''} placeholder="No description set" multiline onSave={saveDescription} />
                                    <AvatarInfoField label="Whois" value={info.whois || ''} placeholder="No whois set" multiline onSave={saveWhois} />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="character-card-header-text">
                        <div className="character-card-name-row">
                            <div className={`character-card-name ${levelTierClass(info.level)}`}>{characterName || 'Unknown'}</div>
                            
                            {/* Info Popover */}
                            <div 
                                className="character-info-popover-anchor"
                                onMouseEnter={() => setActivePopover('info')}
                                onMouseLeave={() => setActivePopover(null)}
                            >
                                <button
                                    type="button"
                                    className="character-info-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePopover(prev => prev === 'info' ? null : 'info');
                                    }}
                                    title="Character Info"
                                    aria-label="Show character info"
                                >
                                    <Info size={11} strokeWidth={2.5} />
                                </button>
                                {activePopover === 'info' && (
                                    <div 
                                        className="character-info-popover"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="character-info-popover-header">
                                            <span>Character Info</span>
                                            <button 
                                                type="button" 
                                                className="character-info-popover-close" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActivePopover(null);
                                                }}
                                                aria-label="Close popover"
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <div className="character-info-popover-content">
                                            {infoLines && infoLines.length > 0 ? (
                                                infoLines.map((line, idx) => (
                                                    <div key={line.id || idx} className="character-info-popover-line">
                                                        {line.text}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="character-info-popover-empty">No info data available.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quests Popover */}
                            <div 
                                className="character-info-popover-anchor"
                                onMouseEnter={() => setActivePopover('quests')}
                                onMouseLeave={() => setActivePopover(null)}
                            >
                                <button
                                    type="button"
                                    className="character-info-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePopover(prev => prev === 'quests' ? null : 'quests');
                                    }}
                                    title="Quests"
                                    aria-label="Show quests"
                                >
                                    <ScrollText size={11} strokeWidth={2.5} />
                                </button>
                                {activePopover === 'quests' && (
                                    <div 
                                        className="character-info-popover"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="character-info-popover-header">
                                            <span>Quests</span>
                                            <button 
                                                type="button" 
                                                className="character-info-popover-close" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActivePopover(null);
                                                }}
                                                aria-label="Close popover"
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <div className="character-info-popover-content">
                                            {questLines && questLines.length > 0 ? (
                                                questLines.map((line, idx) => (
                                                    <div key={line.id || idx} className="character-info-popover-line">
                                                        {line.text}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="character-info-popover-empty">No quest data available.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Achievements Popover */}
                            <div 
                                className="character-info-popover-anchor"
                                onMouseEnter={() => setActivePopover('achievements')}
                                onMouseLeave={() => setActivePopover(null)}
                            >
                                <button
                                    type="button"
                                    className="character-info-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePopover(prev => prev === 'achievements' ? null : 'achievements');
                                    }}
                                    title="Achievements"
                                    aria-label="Show achievements"
                                >
                                    <Trophy size={11} strokeWidth={2.5} />
                                </button>
                                {activePopover === 'achievements' && (
                                    <div 
                                        className="character-info-popover"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="character-info-popover-header">
                                            <span>Achievements</span>
                                            <button 
                                                type="button" 
                                                className="character-info-popover-close" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActivePopover(null);
                                                }}
                                                aria-label="Close popover"
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <div className="character-info-popover-content">
                                            {achievementLines && achievementLines.length > 0 ? (
                                                achievementLines.map((line, idx) => (
                                                    <div key={line.id || idx} className="character-info-popover-line">
                                                        {line.text}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="character-info-popover-empty">No achievement data available.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {subtitle && <div className="character-card-subtitle">{subtitle}</div>}
                        <div className="character-card-progress-line">
                            {progressStats.map((stat, i) => (
                                <span key={stat.id} className="char-card-progress-stat" title={stat.title || stat.label}>
                                    {i > 0 && <span className="char-card-progress-sep">•</span>}
                                    {stat.icon}
                                    <strong>{stat.display}</strong>
                                    <span className="char-card-progress-label">{stat.label}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div 
                        className="character-card-gold" 
                        title={`Total: ${goldCoins.toLocaleString()} Gold, ${silver} Silver, ${copper} Copper`}
                    >
                        <Coins size={12} strokeWidth={2.5} />
                        <span>{goldCoins.toLocaleString()}</span>
                    </div>
                </div>

                <div className="character-card-body-wrapper">
                    <div className="character-card-vitals">
                        <StatBar label="Health" value={vitals.gmcpVitals.hp} max={vitals.gmcpVitals.maxHp} color="#ff6b6b" icon={<Heart size={11} strokeWidth={3} />} />
                        <StatBar label="Mana" value={vitals.gmcpVitals.mana} max={vitals.gmcpVitals.maxMana} color="#c084fc" icon={<Zap size={11} strokeWidth={3} />} />
                        <StatBar label="Moves" value={vitals.gmcpVitals.move} max={vitals.gmcpVitals.maxMove} color="#86efac" icon={<Footprints size={11} strokeWidth={3} />} />
                    </div>

                    <div className="character-card-stat-panel">
                        <div className="character-card-combat-stats">
                            {combatStats.map(stat => (
                                <div key={stat.id} className="char-card-combat-stat" title={stat.title || stat.label}>
                                    {stat.icon}
                                    <strong>{stat.display}</strong>
                                    <span>{stat.label}</span>
                                </div>
                            ))}
                        </div>

                        {Object.keys(attributes).length > 0 && (
                            <div className="character-card-attributes">
                                {STAT_ORDER.filter(key => attributes[key] !== undefined).map(key => {
                                    const stat = attributes[key];
                                    const hasBaseChange = stat.base !== undefined && stat.base !== stat.current;
                                    const changeClass = !hasBaseChange ? '' : stat.current > stat.base! ? ' is-raised' : ' is-lowered';
                                    return (
                                        <div
                                            key={key}
                                            className={`char-card-attribute${changeClass}`}
                                            title={stat.base === undefined ? `${STAT_LABELS[key]} ${stat.current}` : `${STAT_LABELS[key]} ${stat.current} (${stat.base} base)`}
                                        >
                                            <span className="char-card-attribute-label">{STAT_LABELS[key]}</span>
                                            <span className="char-card-attribute-value">
                                                {stat.current}
                                                {hasBaseChange && <span className="char-card-attribute-base">({stat.base})</span>}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <CharacterCardTimerStrip affects={info.affectedBy || []} />

                    <div className="character-card-scroll">
                        <Section title="State" icon={<Compass size={10} strokeWidth={2.5} />} className="character-card-state">
                            <div className="char-card-info-grid">
                                <InfoRow label="Position" value={
                                    <span style={{ color: vitals.position === 'fighting' || vitals.position === 'dying' ? '#f87171' : '#4ade80' }}>
                                        {positionLabel(vitals.position)}
                                    </span>
                                } />
                                {mood && <InfoRow label="Mood" value={mood} />}
                                {vitals.alertness && <InfoRow label="Alertness" value={vitals.alertness} />}
                                {vitals.spellEffort && <InfoRow label="Spell Effort" value={vitals.spellEffort} />}
                                {vitals.mountMoves && <InfoRow label="Mount" value={vitals.mountMoves} />}
                                {vitals.wimpy > 0 && <InfoRow label="Wimpy" value={`${vitals.wimpy}%`} />}
                                <InfoRow label="Weather" value={vitals.weather !== 'none' ? vitals.weather : '—'} />
                                <InfoRow label="Light" value={
                                    vitals.lighting === 'sun' ? 'Daylight' :
                                    vitals.lighting === 'moon' ? 'Moonlight' :
                                    vitals.lighting === 'artificial' ? 'Artificial' :
                                    vitals.lighting === 'dark' ? 'Dark' : '—'
                                } />
                                {vitals.isFoggy && <InfoRow label="Fog" value="Foggy" />}
                                {vitals.carrying && <InfoRow label="Carrying" value={vitals.carrying} />}
                            </div>
                            {hasConditions && (
                                <div className="character-card-conditions">
                                    {['Hidden', vitals.sneak === 'S' ? 'Sneaking (careful)' : 'Sneaking', vitals.climb === 'C' ? 'Climbing (skilled)' : 'Climbing', 'Swimming', 'Riding', 'Being Ridden'].map((label, i) => (
                                        <ConditionPill
                                            key={label}
                                            label={label}
                                            active={[vitals.isHidden, !!vitals.sneak, !!vitals.climb, vitals.isSwimming, isRidingOrMounted, vitals.isRidden][i]}
                                        />
                                    ))}
                                </div>
                            )}
                        </Section>

                        <Section title="Equipment" icon={<ShieldIcon size={10} strokeWidth={2.5} />} className="character-card-equipment">
                            <PromptInventoryChips showHeader={false} variant="drawer" />
                        </Section>

                        {hasCombatInfo && (
                            <Section title="Combat" icon={<Swords size={10} strokeWidth={2.5} />} className="character-card-state">
                                {combat.opponentName && (
                                    <InfoRow label="Opponent" value={
                                        <span>
                                            {combat.opponentName}
                                            {combat.opponentHealthStatus && (
                                                <span style={{ marginLeft: 6, color: statusColor(combat.opponentHealthStatus), fontSize: '0.85em' }}>
                                                    {combat.opponentHealthStatus}
                                                </span>
                                            )}
                                        </span>
                                    } />
                                )}
                                {combat.bufferName && (
                                    <InfoRow label="Buffer" value={
                                        <span>
                                            {combat.bufferName}
                                            {combat.bufferHealthStatus && (
                                                <span style={{ marginLeft: 6, color: statusColor(combat.bufferHealthStatus), fontSize: '0.85em' }}>
                                                    {combat.bufferHealthStatus}
                                                </span>
                                            )}
                                        </span>
                                    } />
                                )}
                            </Section>
                        )}

                        <Section title="Skills & Spells" icon={<Sparkles size={10} strokeWidth={2.5} />} className="character-card-skills" defaultOpen={false}>
                            <CharacterCardLineSection
                                lines={practiceTargetLines}
                                emptyMessage="No skills data. Tap refresh to update."
                                onRefresh={refreshSkills}
                                className="character-card-line-section-tall"
                            />
                        </Section>

                        <Section title="Magic Keys" icon={<KeyRound size={10} strokeWidth={2.5} />} className="character-card-magic-keys">
                            <MagicKeysTab />
                        </Section>
                    </div>
                </div>
        </aside>
    );
};

export default React.memo(CharacterCard);
