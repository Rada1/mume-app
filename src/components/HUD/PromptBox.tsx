/**
 * @file PromptBox.tsx
 * @description Enhanced prompt display with custom person-pose icons.
 */

import React, { memo, FC, useState, useRef, useCallback, useEffect } from 'react';
import { Swords, Heart, Zap, Footprints, Info, Sliders } from 'lucide-react';
import './PromptBox.css';
import { GameStats, CharacterInfo, CombatHealthStatus } from '../../types';
import { useGame, useUI } from '../../context/GameContext';
import { CombatSliderPopout } from '../Combat/CombatSliderPopout';
import { getInlineGlowColor } from '../../utils/inlineActionModel';
import { useActiveVitals, useActiveCombat, useActiveCharacter } from '../../stores/useActiveGameState';
import { useModeStore } from '../../stores/useModeStore';
import { TokenRenderer } from '../Messages/TokenRenderer';
import PromptCombatStatsLine from './PromptCombatStatsLine';
import { PromptInventoryChips } from './PromptInventoryChips';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { DispositionSliderPopout, DispositionSliderConfig } from './DispositionSliderPopout';
import { targetTextMatchesEntity } from '../../utils/selectionUtils';

interface PromptBoxProps {
    processMessageHtml?: (html: string, mid: string, isRoomName: boolean, type?: string, isCombat?: boolean, side?: string) => string;
    processMessageTokens?: (textRaw: string) => import('../../types').Token[];
    onWimpyChange?: (val: number) => void;
}

const HEALTH_TIERS = ['Healthy', 'Fine', 'Hurt', 'Wounded', 'Bad', 'Awful', 'Dying'] as const;
const MANA_TIERS = ['Full', 'Burning', 'Hot', 'Warm', 'Cold', 'Icy', 'Frozen'] as const;
const MOVE_TIERS = ['Unwearied', 'Steadfast', 'Rested', 'Tired', 'Slow', 'Weak', 'Fainting', 'Exhausted'] as const;
const HEALTH_SEGMENTS = HEALTH_TIERS.length - 1;
const MANA_SEGMENTS = MANA_TIERS.length - 1;
const MOVE_SEGMENTS = MOVE_TIERS.length - 1;
const MOOD_OPTIONS = ['wimpy', 'prudent', 'normal', 'brave', 'aggressive', 'berserk'];
const MOOD_LABELS = ['WIM', 'PRU', 'NOR', 'BRA', 'AGG', 'BER'];
const SPEED_OPTIONS = ['quick', 'fast', 'normal', 'careful', 'thorough'];
const SPEED_LABELS = ['QUIC', 'FAST', 'NORM', 'CARE', 'THOR'];
const ALERT_OPTIONS = ['normal', 'careful', 'attentive', 'vigilant', 'paranoid'];
const ALERT_LABELS = ['NORM', 'CARE', 'ATTE', 'VIGI', 'PARA'];

const HEALTH_MAP: Record<string, { percent: number; color: string }> = {
    'Healthy': { percent: 100, color: '#22c55e' },
    'Fine': { percent: 83, color: '#4ade80' },
    'Hurt': { percent: 66, color: '#facc15' },
    'Wounded': { percent: 50, color: '#fb923c' },
    'Bad': { percent: 33, color: '#f87171' },
    'Awful': { percent: 16, color: '#ef4444' },
    'Dying': { percent: 0, color: '#991b1b' },
    'Stunned': { percent: 25, color: '#a855f7' },
    'None': { percent: 0, color: '#4b5563' }
};

const getManaPercent = (current: number, max: number): number => max > 0 ? (current / max) * 100 : 0;
const getMovePercent = (current: number, max: number): number => max > 0 ? (current / max) * 100 : 0;

const getTierStatus = (percent: number, tiers: readonly string[]): string => {
    if (tiers.length === 0) return '';
    const clamped = Math.max(0, Math.min(100, percent));
    if (clamped >= 100) return tiers[0];
    const bucketSize = 100 / tiers.length;
    const index = Math.min(tiers.length - 1, Math.floor((100 - clamped) / bucketSize));
    return tiers[index];
};

const normalizeTierStatus = (status: string | null | undefined, tiers: readonly string[]): string | null => {
    if (!status) return null;
    const normalized = status.trim().toLowerCase();
    return tiers.find((tier) => tier.toLowerCase() === normalized) ?? null;
};

const getTierPercent = (status: string | null | undefined, tiers: readonly string[]): number | null => {
    const normalized = normalizeTierStatus(status, tiers);
    if (!normalized) return null;
    const index = tiers.findIndex((tier) => tier === normalized);
    if (index < 0) return null;
    if (tiers.length === 1) return 100;
    return 100 - (index * (100 / (tiers.length - 1)));
};

const getFilledSegments = (status: string | null | undefined, tiers?: readonly string[], fallbackPercent?: number): number | null => {
    if (tiers && tiers.length > 0) {
        const normalized = normalizeTierStatus(status, tiers);
        if (normalized) {
            const index = tiers.findIndex((tier) => tier === normalized);
            if (index >= 0) return Math.max(0, (tiers.length - 1) - index);
        }
    }

    if (fallbackPercent === undefined || !tiers || tiers.length === 0) return null;
    const visibleSegments = Math.max(0, tiers.length - 1);
    const rawSegments = (Math.max(0, Math.min(100, fallbackPercent)) / 100) * visibleSegments;
    const rounded = Math.round(rawSegments);
    
    // Strict Healthy check: only 100% can show all segments
    if (fallbackPercent < 100 && rounded === visibleSegments && visibleSegments > 0) {
        return visibleSegments - 1;
    }
    
    return Math.max(0, Math.min(visibleSegments, rounded));
};

const ConditionBadge: React.FC<{ 
    status: string; 
    percent: number;
    colorClass: string; 
    onClick?: () => void;
    altStatus?: string;
    showAlt?: boolean;
    mirrored?: boolean;
    isFighting?: boolean;
    onPointerDown?: (e: React.PointerEvent) => void;
    wimpyRatio?: number;
    isDragging?: boolean;
    dragVal?: number | null;
    segments?: number;
    tiers?: readonly string[];
}> = ({ status, percent, colorClass, onClick, altStatus, showAlt, mirrored, isFighting, onPointerDown, wimpyRatio, isDragging, dragVal, segments = 5, tiers }) => {
    // --- Logic for Resource Loss "Magnitude" Bar ---
    const [lossMagnitude, setLossMagnitude] = useState(0);
    const filledSegments = getFilledSegments(status, tiers, percent) ?? 0;
    const prevSegmentsRef = useRef(filledSegments);

    useEffect(() => {
        const prev = prevSegmentsRef.current;
        prevSegmentsRef.current = filledSegments;

        if (filledSegments < prev) {
            const delta = prev - filledSegments;
            setLossMagnitude(delta);
            
            const timer = setTimeout(() => {
                setLossMagnitude(0);
            }, 500);
            return () => clearTimeout(timer);
        } else if (filledSegments > prev) {
            setLossMagnitude(0);
        }
    }, [filledSegments, percent]);

    return (
        <div className={`condition-badge ${colorClass} ${isFighting ? 'pulse-combat' : ''}`} onClick={onClick} onPointerDown={onPointerDown}>
            <div className={`status-bar-segment ${mirrored ? 'is-mirrored' : ''}`}>
                <div className="status-bar-segments-grid">
                    {[...Array(segments)].map((_, i) => {
                        const segmentIndex = mirrored ? (segments - 1 - i) : i;
                        const isFilled = segmentIndex < filledSegments;
                        const fill = isFilled ? 100 : 0;
                        const previousSegments = Math.min(segments, filledSegments + lossMagnitude);
                        const ghostFill = !isFilled && segmentIndex < previousSegments ? 100 : 0;

                        return (
                            <div key={i} className="bar-segment-block">
                                {ghostFill > 0 && (
                                    <div 
                                        className="status-bar-ghost"
                                        style={{ 
                                            width: `${ghostFill}%`,
                                            [mirrored ? 'right' : 'left']: `${fill}%`
                                        }}
                                    />
                                )}
                                <div 
                                    className="status-bar-fill"
                                    style={{ 
                                        width: `${fill}%`,
                                        ...(mirrored ? { right: 0 } : { left: 0 })
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
                
                {wimpyRatio !== undefined && (
                    <div 
                        className="wimpy-tick" 
                        style={{ 
                            left: `${wimpyRatio * 100}%`,
                            position: 'absolute',
                            top: '-3px',
                            bottom: '-3px',
                            width: '2px',
                            backgroundColor: '#fff',
                            boxShadow: '0 0 6px #fff',
                            zIndex: 25
                        }} 
                    />
                )}
                {isDragging && dragVal !== null && wimpyRatio !== undefined && (
                    <div className="wimpy-indicator" style={{ left: `${wimpyRatio * 100}%` }}>
                        <span className="wimpy-indicator-value">{dragVal}</span>
                        <div className="wimpy-indicator-arrow" />
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Custom Pose Icons ---
const PoseIcon: React.FC<{ pose: string; size?: number }> = ({ pose, size = 14 }) => {
    const strokeWidth = 2.5;
    const color = "currentColor";

    const renderPose = () => {
        switch (pose.toLowerCase()) {
            case 'standing':
                return (
                    <>
                        <circle cx="12" cy="5" r="3" fill="none" stroke={color} strokeWidth={strokeWidth} />
                        <path d="M12 8v8M9 22l3-6 3 6M8 10h8" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                    </>
                );
            case 'sitting': // 90 degree angle 
                return (
                    <>
                        <circle cx="9" cy="7" r="3" fill="none" stroke={color} strokeWidth={strokeWidth} />
                        <path d="M9 10v7h8M17 17v5M7 12h4" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                    </>
                );
            case 'resting': // Inclined back
                return (
                    <>
                        <circle cx="7" cy="8" r="3" fill="none" stroke={color} strokeWidth={strokeWidth} />
                        <path d="M6 11l4 6h8M18 17v5" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                    </>
                );
            case 'sleeping': // Lying flat
                return (
                    <>
                        <circle cx="18" cy="18" r="3" fill="none" stroke={color} strokeWidth={strokeWidth} />
                        <path d="M5 21h12M5 16h6" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                    </>
                );
            case 'riding':
                return (
                    <>
                        {/* Horse */}
                        <path d="M5 15c0-1.5 1.5-2.5 4-2.5h4c2.5 0 4 1 4 2.5s-1.5 2.5-4 2.5h-4c-2.5 0-4-1-4-2.5z" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} />
                        <path d="M17 14l2-5h-2.5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} />
                        <path d="M8 17.5v3.5M14 17.5v3.5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} />
                        {/* Rider */}
                        <circle cx="10" cy="6" r="2.5" fill="none" stroke={color} strokeWidth={strokeWidth} />
                        <path d="M10 8.5v4.5M7 11.5l3-1 3 1" fill="none" stroke={color} strokeWidth={strokeWidth} />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {renderPose()}
        </svg>
    );
};

const PromptBox: FC<PromptBoxProps> = ({
    processMessageHtml,
    processMessageTokens,
    onWimpyChange
}) => {
    const {
        triggerHaptic,
        executeCommand,
        setPlayerPosition,
        inlineCategories,
        isNewbieMode,
        viewport,
        mood,
        setMood,
        spellSpeed,
        setSpellSpeed,
        alertness,
        setAlertness
    } = useGame();
    const { handleTabClick, setPopoverState, popoverState } = useUI();
    const enemyColor = useSettingsStore(state => state.enemyColor);
    const targetColor = useSettingsStore(state => state.targetColor);
    const theme = useSettingsStore(state => state.theme);
    
    // --- Active View State Selectors ---
    const activeVitals = useActiveVitals();
    const target = activeVitals.target;
    const hp = activeVitals.gmcpVitals.hp;
    const maxHp = activeVitals.gmcpVitals.maxHp;
    const mana = activeVitals.gmcpVitals.mana;
    const maxMana = activeVitals.gmcpVitals.maxMana;
    const move = activeVitals.gmcpVitals.move;
    const maxMove = activeVitals.gmcpVitals.maxMove;
    const playerHealthStatus = activeVitals.gmcpVitals.hpStatus;
    const manaStatus = activeVitals.gmcpVitals.manaStatus;
    const moveStatus = activeVitals.gmcpVitals.moveStatus;
    const wimpy = activeVitals.wimpy;
    const affects = activeVitals.characterInfo?.affectedBy ?? [];
    const position = activeVitals.position;
    const inCombat = position === 'fighting';

    const isRiding = position === 'riding' || position === 'mounted';
    const playerPosition = position;

    const activeCombat = useActiveCombat();
    const opponentName = activeCombat.opponentName;
    const opponentId = activeCombat.opponentId;
    const opponentHealthStatus = activeCombat.opponentHealthStatus;
    const characterName = useActiveCharacter();
    const isSpectateMode = useModeStore(state => state.isSpectating);

    const [activeSlider, setActiveSlider] = useState<'pos' | 'disposition' | null>(null);
    const [activeButtonRect, setActiveButtonRect] = useState<DOMRect | null>(null);
    const [showNumbers, setShowNumbers] = useState(false);
    const numbersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastAffectsRefreshRef = useRef(0);
    const [isExpanded, setIsExpanded] = useState(false);

    // Dynamic scaling linked directly to the authoritative log font size
    const nameFontSize = `var(--dynamic-log-size)`;

    // --- Wimpy Slider Drag Logic ---
    const [isDragging, setIsDragging] = useState(false);
    const [dragVal, setDragVal] = useState<number | null>(null);
    const dragValRef = useRef<number | null>(null);
    const hpBarRef = useRef<HTMLDivElement>(null);

    const updateDrag = useCallback((e: PointerEvent | React.PointerEvent) => {
        if (!hpBarRef.current || maxHp <= 0) return;
        const rect = hpBarRef.current.getBoundingClientRect();
        
        let clientX = 0;
        if ('clientX' in e) {
            clientX = e.clientX;
        }

        let ratio = (clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));
        const val = Math.round(ratio * maxHp);
        dragValRef.current = val;
        setDragVal(val);
    }, [maxHp]);

    const handleHpPointerDown = (e: React.PointerEvent) => {
        if (!onWimpyChange) return;
        
        // Initial calculation
        if (!hpBarRef.current || maxHp <= 0) return;
        const rect = hpBarRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const val = Math.round(ratio * maxHp);
        
        dragValRef.current = val;
        setDragVal(val);
        setIsDragging(true);
        triggerHaptic(10);
    };

    useEffect(() => {
        if (!isDragging) return;
        
        const handleMove = (e: PointerEvent) => {
            updateDrag(e);
        };

        const handleUp = (e: PointerEvent) => {
            setIsDragging(false);
            if (dragValRef.current !== null && onWimpyChange) {
                onWimpyChange(dragValRef.current);
            }
            dragValRef.current = null;
            setDragVal(null);
            triggerHaptic(20);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [isDragging, onWimpyChange, updateDrag, triggerHaptic]);

    const displayWimpy = dragVal !== null ? dragVal : (wimpy ?? 0);
    const wimpyRatio = maxHp > 0 ? displayWimpy / maxHp : 0;

    // Dynamic color for opponent (NPC/Player/etc) to match log higlighter
    const opponentColor = React.useMemo(() => {
        if (!opponentName) return undefined;
        return getInlineGlowColor('cat-enemy', inlineCategories, { enemy: enemyColor }, theme) || undefined;
    }, [opponentName, inlineCategories, enemyColor, theme]);

    const triggerNumbers = useCallback(() => {
        triggerHaptic(15);
        setShowNumbers(true);
        if (numbersTimeoutRef.current) clearTimeout(numbersTimeoutRef.current);
        numbersTimeoutRef.current = setTimeout(() => {
            setShowNumbers(false);
            numbersTimeoutRef.current = null;
        }, 1000);
    }, [triggerHaptic]);

    const handlePosClick = useCallback((e: React.MouseEvent) => {
        triggerHaptic(10);
        const rect = e.currentTarget.getBoundingClientRect();
        setActiveButtonRect(rect);
        setActiveSlider(activeSlider === 'pos' ? null : 'pos');
    }, [activeSlider, triggerHaptic]);

    const handleDispositionClick = useCallback((e: React.MouseEvent) => {
        triggerHaptic(10);
        const rect = e.currentTarget.getBoundingClientRect();
        setActiveButtonRect(rect);
        setActiveSlider(activeSlider === 'disposition' ? null : 'disposition');
    }, [activeSlider, triggerHaptic]);

    const dispositionSliders: DispositionSliderConfig[] = React.useMemo(() => ([
        { id: 'mood', label: 'Mood', value: mood || 'normal', options: MOOD_OPTIONS, displayLabels: MOOD_LABELS },
        { id: 'speed', label: 'Spell Speed', value: spellSpeed || 'normal', options: SPEED_OPTIONS, displayLabels: SPEED_LABELS },
        { id: 'alert', label: 'Alertness', value: alertness || 'normal', options: ALERT_OPTIONS, displayLabels: ALERT_LABELS }
    ]), [alertness, mood, spellSpeed]);

    const handleBoxToggle = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        triggerHaptic(10);
        setIsExpanded(prev => {
            const nextExpanded = !prev;
            const now = Date.now();
            if (nextExpanded && !isSpectateMode && now - lastAffectsRefreshRef.current > 5000) {
                lastAffectsRefreshRef.current = now;
                executeCommand('info %f', true, true, true, true);
            }
            return nextExpanded;
        });
    }, [executeCommand, isSpectateMode, triggerHaptic]);

    const handleDispositionSelect = useCallback((id: DispositionSliderConfig['id'], val: string) => {
        if (id === 'mood') {
            setMood(val);
            executeCommand(`cha mood ${val}`);
        }
        if (id === 'speed') {
            setSpellSpeed(val);
            executeCommand(`cha speed ${val}`);
        }
        if (id === 'alert') {
            setAlertness(val);
            executeCommand(`cha alert ${val}`);
        }
        triggerHaptic(15);
    }, [executeCommand, setAlertness, setMood, setSpellSpeed, triggerHaptic]);

    const manaStatusFromGmcp = normalizeTierStatus(manaStatus, MANA_TIERS) ?? (maxMana <= 0 && mana > 0 ? 'Full' : null);
    const moveStatusFromGmcp = normalizeTierStatus(moveStatus, MOVE_TIERS) ?? (maxMove <= 0 && move > 0 ? 'Unwearied' : null);

    const manaPercent = manaStatusFromGmcp
        ? (getTierPercent(manaStatusFromGmcp, MANA_TIERS) ?? 0)
        : (maxMana > 0 ? getManaPercent(mana, maxMana) : 0);
    const movePercent = moveStatusFromGmcp
        ? (getTierPercent(moveStatusFromGmcp, MOVE_TIERS) ?? 0)
        : (maxMove > 0 ? getMovePercent(move, maxMove) : 0);

    const mpStatus = manaStatusFromGmcp ?? getTierStatus(manaPercent, MANA_TIERS);
    const stStatus = moveStatusFromGmcp ?? getTierStatus(movePercent, MOVE_TIERS);

    const getPositionIcon = () => {
        if (inCombat) return <Swords size={14} className="combat-divider-icon" />;
        if (isRiding) return <PoseIcon pose="riding" size={14} />;
        return <PoseIcon pose={playerPosition} size={14} />;
    };

    const renderStyledName = (name: string, isOpponent = false) => {
        if (processMessageTokens) {
            const clean = name.replace(/^[\[\]<>]+/, '').trim();
            const tokens = processMessageTokens(clean);
            return <TokenRenderer tokens={tokens} />;
        }
        if (!processMessageHtml) return name;
        // Strip any remaining prompt crud like brackets
        const clean = name.replace(/^[\[\]<>]+/, '').trim();
        const html = processMessageHtml(clean, `prompt-${isOpponent ? 'opp' : 'player'}`, false, isOpponent ? 'npc' : 'pc');
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    const opponentEntityId = opponentId != null
        ? `roomchars:${opponentId}`
        : opponentName
            ? `prompt-opponent:${opponentName.toLowerCase()}`
            : undefined;

    const handleOpponentClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
        if (!opponentName || !opponentEntityId) return;
        e.preventDefault();
        e.stopPropagation();

        if (popoverState?.entityId === opponentEntityId) {
            setPopoverState(null);
            triggerHaptic(10);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        setPopoverState({
            x: rect.right,
            y: rect.top + rect.height / 2,
            setId: 'cat-enemy',
            category: 'cat-enemy',
            context: opponentName,
            entityId: opponentEntityId,
            menuDisplay: 'list',
            accentColor: opponentColor || enemyColor,
            preferSide: 'right'
        });
        triggerHaptic(20);
    }, [enemyColor, opponentColor, opponentEntityId, opponentName, popoverState?.entityId, setPopoverState, triggerHaptic]);

    const renderOpponentInlineButton = () => {
        if (!opponentName || !opponentEntityId) return null;
        const isActive = popoverState?.entityId === opponentEntityId || targetTextMatchesEntity(target, opponentName);
        return (
            <span
                className={`inline-btn prompt-opponent-inline${isActive ? ' menu-active is-target' : ''}`}
                data-action="menu"
                data-category="cat-enemy"
                data-cmd="cat-enemy"
                data-context={opponentName}
                data-id={opponentEntityId}
                data-menu-display="list"
                style={{
                    '--glow-color': opponentColor || enemyColor,
                    '--target-color': targetColor
                } as React.CSSProperties & Record<'--glow-color' | '--target-color', string>}
                onClick={handleOpponentClick}
            >
                {opponentName}
            </span>
        );
    };

    return (
        <div className={`prompt-box-container${isExpanded ? ' is-expanded' : ''}`} id="prompt-box" style={{ '--prompt-name-font-size': nameFontSize } as any}>
            <div className="prompt-box-content" onClick={handleBoxToggle}>
                {/* Names Row — only shown in combat */}
                <div className="prompt-vitals-row-ascii">
                    {/* Player Side */}
                    <div className="vitals-side-container side-left">
                        <div className="player-vitals-stack">
                            <div className="prompt-top-stats-row">
                                {inCombat && (
                                    <div className="name-label player-name prompt-inline-name">
                                        {renderStyledName(characterName || 'YOU')}
                                    </div>
                                )}
                                <PromptCombatStatsLine />
                            </div>
                            <div className="player-stats-group">
                                <Heart size={11} className="vitals-icon hp-icon" strokeWidth={3} />
                                <div ref={hpBarRef} style={{ flex: 1, display: 'flex', minWidth: 0 }}>
                                    <ConditionBadge
                                        status={playerHealthStatus || 'Healthy'}
                                        percent={normalizeTierStatus(playerHealthStatus, HEALTH_TIERS) 
                                            ? (HEALTH_MAP[normalizeTierStatus(playerHealthStatus, HEALTH_TIERS)!]?.percent ?? 0)
                                            : (maxHp > 0 ? (hp / maxHp) * 100 : 0)
                                        }
                                        colorClass="hp"
                                        segments={HEALTH_SEGMENTS}
                                        tiers={HEALTH_TIERS}
                                        onClick={triggerNumbers}
                                        showAlt={showNumbers || isDragging}
                                        altStatus={isDragging ? `` : `${hp}/${maxHp}`}
                                        isFighting={inCombat}
                                        onPointerDown={handleHpPointerDown}
                                        wimpyRatio={wimpyRatio}
                                        isDragging={isDragging}
                                        dragVal={dragVal}
                                    />
                                </div>
                                <Zap size={11} className="vitals-icon mana-icon" strokeWidth={3} />
                                <ConditionBadge 
                                    status={mpStatus} 
                                    percent={manaPercent}
                                    colorClass="mana" 
                                    segments={MANA_SEGMENTS}
                                    tiers={MANA_TIERS}
                                    onClick={() => handleTabClick('status')}
                                    showAlt={showNumbers}
                                    altStatus={`${mana}/${maxMana}`}
                                    isFighting={inCombat}
                                />
                                <Footprints size={11} className="vitals-icon move-icon" strokeWidth={3} />
                                <ConditionBadge 
                                    status={stStatus} 
                                    percent={movePercent}
                                    colorClass="move" 
                                    segments={MOVE_SEGMENTS}
                                    tiers={MOVE_TIERS}
                                    onClick={() => handleTabClick('status')}
                                    showAlt={showNumbers}
                                    altStatus={`${move}/${maxMove}`}
                                    isFighting={inCombat}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Center Anchor */}
                    <div className="vitals-center-anchor" style={{ position: 'relative' }}>
                        <button
                            className={`pos-combat-square-btn disposition-square-btn ${activeSlider === 'disposition' ? 'active' : ''}`}
                            onClick={!isSpectateMode ? handleDispositionClick : undefined}
                            style={{ cursor: isSpectateMode ? 'default' : 'pointer' }}
                            title={`Disposition: ${mood || 'normal'} / ${spellSpeed || 'normal'} / ${alertness || 'normal'}`}
                        >
                            <Sliders size={13} strokeWidth={2.6} />
                        </button>
                        <button 
                            className={`pos-combat-square-btn ${inCombat ? 'is-fighting' : ''} ${activeSlider === 'pos' ? 'active' : ''}`}
                            onClick={!isSpectateMode ? handlePosClick : undefined}
                            style={{ cursor: isSpectateMode ? 'default' : 'pointer' }}
                            title={inCombat ? 'Fighting' : `Position: ${playerPosition}`}
                        >
                            {getPositionIcon()}
                        </button>
                    </div>

                    {/* Opponent Side */}
                    <div className="vitals-side-container side-right">
                        {inCombat && opponentName && (
                            <div className="opponent-vitals-stack animate-combat-mini">
                                <div className="prompt-top-stats-row opponent-top-stats-row">
                                    <div className="name-label opponent-name prompt-inline-name">
                                        {renderOpponentInlineButton()}
                                    </div>
                                </div>
                                <div className="opponent-stats-group">
                                <ConditionBadge 
                                    status="Unknown" 
                                    percent={100} 
                                    colorClass="move placeholder" 
                                    segments={MOVE_SEGMENTS}
                                    tiers={MOVE_TIERS}
                                    mirrored
                                    isFighting={inCombat}
                                />
                                <Footprints size={11} className="vitals-icon move-icon placeholder" strokeWidth={3} />

                                <ConditionBadge 
                                    status="Unknown" 
                                    percent={100} 
                                    colorClass="mana placeholder" 
                                    segments={MANA_SEGMENTS}
                                    tiers={MANA_TIERS}
                                    mirrored
                                    isFighting={inCombat}
                                />
                                <Zap size={11} className="vitals-icon mana-icon placeholder" strokeWidth={3} />

                                <ConditionBadge
                                    status={opponentHealthStatus || 'Fighting'}
                                    percent={HEALTH_MAP[opponentHealthStatus || 'Healthy']?.percent || 50}
                                    colorClass="opponent" 
                                    segments={HEALTH_SEGMENTS}
                                    tiers={HEALTH_TIERS}
                                    mirrored
                                    isFighting={inCombat}
                                />
                                    <Heart size={11} className="vitals-icon hp-icon is-mirrored" strokeWidth={3} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {isExpanded && <PromptInventoryChips affects={affects} />}

                {activeSlider === 'pos' && activeButtonRect && (
                    <CombatSliderPopout 
                        label="POSITION"
                        value={playerPosition}
                        options={['sleeping', 'resting', 'sitting', 'standing']}
                        anchorRect={activeButtonRect}
                        onSelect={(val, idx) => {
                            if (playerPosition === 'sleeping' && idx > 0) {
                                executeCommand('wake');
                            }
                            setPlayerPosition(val);
                            executeCommand(val === 'sleeping' ? 'sleep' : val === 'resting' ? 'rest' : val === 'sitting' ? 'sit' : 'stand');
                            triggerHaptic(15);
                            setActiveSlider(null);
                        }}
                        onClose={() => setActiveSlider(null)}
                        triggerHaptic={triggerHaptic}
                        race={activeVitals.characterInfo?.race}
                        subrace={activeVitals.characterInfo?.subrace}
                        onFormSelect={(newForm) => {
                            if (newForm === 'bear') {
                                executeCommand('metamorph');
                            } else {
                                executeCommand('return');
                            }
                            triggerHaptic(20);
                            setActiveSlider(null);
                        }}
                    />
                )}
                {activeSlider === 'disposition' && activeButtonRect && (
                    <DispositionSliderPopout
                        sliders={dispositionSliders}
                        anchorRect={activeButtonRect}
                        onSelect={handleDispositionSelect}
                        onClose={() => setActiveSlider(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default memo(PromptBox);
