/**
 * @file PromptBox.tsx
 * @description Enhanced prompt display with custom person-pose icons.
 */

import React, { memo, FC, useState, useRef, useCallback, useEffect } from 'react';
import { Swords, Heart, Zap, Info, Sliders } from 'lucide-react';
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
import RoomChipRows from '../Mapper/RoomChipRows';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { DispositionSliderPopout, DispositionSliderConfig } from './DispositionSliderPopout';
import { targetTextMatchesEntity } from '../../utils/selectionUtils';
import { useCharacterCardStore } from '../../stores/useCharacterCardStore';

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
const MOOD_LABELS = ['WIMPY', 'PRUDENT', 'NORMAL', 'BRAVE', 'AGGRESSIVE', 'BERSERK'];
const SPEED_OPTIONS = ['quick', 'fast', 'normal', 'careful', 'thorough'];
const SPEED_LABELS = ['QUICK', 'FAST', 'NORMAL', 'CAREFUL', 'THOROUGH'];
const ALERT_OPTIONS = ['normal', 'careful', 'attentive', 'vigilant', 'paranoid'];
const ALERT_LABELS = ['NORMAL', 'CAREFUL', 'ATTENTIVE', 'VIGILANT', 'PARANOID'];
const POSITION_CODES: Record<string, number> = { sleeping: 4, resting: 5, sitting: 6, standing: 8 };

export const RunnerIcon: React.FC<{ size?: number; className?: string }> = ({ size = 11, className }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <circle cx="15" cy="4.5" r="2.2" />
        <path d="M13.6 7.3l-3.2 4 3.9 2.6" />
        <path d="M12.9 8.2l3.2 1.1 2.7-1" />
        <path d="M10.4 11.3l-4 .7" />
        <path d="M14.3 13.9l2.7 2.8 3 .8" />
        <path d="M12.1 13.1l-2.1 3.8-3.1 2.6" />
    </svg>
);

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
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
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
                
                {wimpyRatio !== undefined && isDragging && (
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
                        {/* Rider */}
                        <circle cx="12.5" cy="4.5" r="2" fill="none" stroke={color} strokeWidth={strokeWidth} />
                        {/* Rider body & leg */}
                        <path d="M12.5 6.5c-1 1.5-1.5 3.5-1.5 5 0 1.5 1 2 2 3s.5 2.5.2 4.5" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                        {/* Rider arm */}
                        <path d="M11.8 8.5c1 .5 2 .8 3 0" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Horse Back & Tail */}
                        <path d="M3 16c0-2 1.5-3.5 3.5-3.5h5.5c1.5 0 3-1.5 4-3.5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" strokeLinejoin="round" />
                        {/* Horse Tail */}
                        <path d="M3.2 15.5c-1 1-1.2 3-1 4.5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" />
                        {/* Horse Neck, Head, Ear */}
                        <path d="M16 9c1-2 2-3 3-3 .5 0 .8.5.8 1l-.5 1.5M19.8 7c.8.5 1.5 1 2 2 .3.6 0 1.5-.8 1.8l-2 .5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" strokeLinejoin="round" />
                        {/* Ear */}
                        <path d="M18.8 6l.7-2 .3 1.5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Horse Underbelly & Chest */}
                        <path d="M6.5 16c0 1.5 2 2 4 2 2.5 0 4.5-1 5.5-3 .5-1 .5-2 1.5-3" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Horse Legs */}
                        {/* Back Left Leg */}
                        <path d="M5 14.5c-.5 2-1 3.5-1 6.5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" strokeLinejoin="round" />
                        {/* Back Right Leg */}
                        <path d="M8 15.5c-.2 1.5-1 3-1.5 5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" strokeLinejoin="round" />
                        {/* Front Left Leg */}
                        <path d="M15.5 15.5c.3 1.5.5 3 .5 5.5" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" strokeLinejoin="round" />
                        {/* Front Right Leg (Bent) */}
                        <path d="M17.2 13.5c.5.8.8 1.8 1.2 2.8-.2.8-.7 1.5-.7 2.2l.5 1" fill="none" stroke={color} strokeWidth={strokeWidth - 0.5} strokeLinecap="round" strokeLinejoin="round" />
                        
                        {/* Reins */}
                        <path d="M14.8 8.5c1.2.7 2.8 1.2 4.2.8" fill="none" stroke={color} strokeWidth={strokeWidth - 1} strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
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
        setAlertness,
        isRiding: isRidingFromGame
    } = useGame();
    const { handleTabClick, setPopoverState, popoverState } = useUI();
    const openCharacterCard = useCharacterCardStore(s => s.open);
    const closeCharacterCard = useCharacterCardStore(s => s.close);
    const isCharacterCardOpen = useCharacterCardStore(s => s.isOpen);
    const characterCardAnchorRect = useCharacterCardStore(s => s.anchorRect);
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

    const isRiding = isRidingFromGame || position === 'riding' || position === 'mounted';
    const playerPosition = position;

    const activeCombat = useActiveCombat();
    const opponentName = activeCombat.opponentName;
    const opponentId = activeCombat.opponentId;
    const opponentHealthStatus = activeCombat.opponentHealthStatus;
    const characterName = useActiveCharacter();
    const characterInfo = activeVitals.characterInfo;
    const level = characterInfo?.level ?? 0;
    const xp = characterInfo?.xp ?? 0;
    const xpMax = characterInfo?.xpMax ?? 0;
    const tp = characterInfo?.tp ?? 0;
    const tpMax = characterInfo?.tpMax ?? 0;

    // --- Level bounds tracking ---
    const prevLevelRef = useRef<number>(level);
    const prevXpMaxRef = useRef<number>(xpMax);
    const prevTpMaxRef = useRef<number>(tpMax);

    useEffect(() => {
        if (!characterName) return;
        
        const storageKey = `mume_level_bounds_${characterName}`;
        let bounds: { xpMin: Record<number, number>; tpMin: Record<number, number> } = {
            xpMin: { 1: 0, 2: 1000, 3: 3000, 4: 7000, 5: 14500 },
            tpMin: { 1: 0, 2: 100, 3: 300, 4: 600, 5: 1000 }
        };
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                bounds.xpMin = { ...bounds.xpMin, ...parsed.xpMin };
                bounds.tpMin = { ...bounds.tpMin, ...parsed.tpMin };
            }
        } catch (e) {
            console.error('Failed to parse level bounds', e);
        }

        let changed = false;

        if (level > prevLevelRef.current && prevLevelRef.current > 0) {
            if (prevXpMaxRef.current > 0) {
                bounds.xpMin[level] = prevXpMaxRef.current;
                changed = true;
            }
            if (prevTpMaxRef.current > 0) {
                bounds.tpMin[level] = prevTpMaxRef.current;
                changed = true;
            }
        }

        if (level > 0 && xpMax > 0) {
            const nextLevel = level + 1;
            if (bounds.xpMin[nextLevel] !== xpMax) {
                bounds.xpMin[nextLevel] = xpMax;
                changed = true;
            }
        }
        if (level > 0 && tpMax > 0) {
            const nextLevel = level + 1;
            if (bounds.tpMin[nextLevel] !== tpMax) {
                bounds.tpMin[nextLevel] = tpMax;
                changed = true;
            }
        }

        if (changed) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(bounds));
            } catch (e) {
                console.error('Failed to save level bounds', e);
            }
        }

        prevLevelRef.current = level;
        prevXpMaxRef.current = xpMax;
        prevTpMaxRef.current = tpMax;
    }, [characterName, level, xpMax, tpMax]);
    const isSpectateMode = useModeStore(state => state.isSpectating);

    const [activeSlider, setActiveSlider] = useState<'pos' | 'disposition' | null>(null);
    const [activeButtonRect, setActiveButtonRect] = useState<DOMRect | null>(null);
    const [showNumbers, setShowNumbers] = useState(false);
    const numbersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastAffectsRefreshRef = useRef(0);
    const isExpanded = true;

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

    const handleHpBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        triggerNumbers();
    }, [triggerNumbers]);

    const handleResourceBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (viewport.isMobile) {
            triggerNumbers();
            return;
        }
        handleTabClick('status');
    }, [handleTabClick, triggerNumbers, viewport.isMobile]);

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

    useEffect(() => {
        const now = Date.now();
        if (isSpectateMode || now - lastAffectsRefreshRef.current <= 5000) return;
        lastAffectsRefreshRef.current = now;
        executeCommand('info %f', true, true, true, true);
    }, [executeCommand, isSpectateMode]);

    const handlePromptCharacterClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
        if (!viewport.isMobile || viewport.isLandscape) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const anchorRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        if (isCharacterCardOpen && characterCardAnchorRect) {
            closeCharacterCard();
            triggerHaptic(10);
            return;
        }
        openCharacterCard(anchorRect);
        triggerHaptic(20);
    }, [characterCardAnchorRect, closeCharacterCard, isCharacterCardOpen, openCharacterCard, triggerHaptic, viewport.isLandscape, viewport.isMobile]);

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
    const estimatePrevXpMax = (lvl: number, nextXpMax: number): number => {
        if (lvl <= 1) return 0;
        if (lvl === 2) return 1000;
        if (lvl === 3) return 3000;
        if (lvl === 4) return 7000;
        if (lvl === 5) return 14500;
        
        // For lvl > 5, estimate ratio = 1.1 + 0.9 * exp(-0.1 * (lvl - 5))
        const ratio = 1.1 + 0.9 * Math.exp(-0.1 * (lvl - 5));
        return Math.round(nextXpMax / ratio);
    };

    const estimatePrevTpMax = (lvl: number, nextTpMax: number): number => {
        if (lvl <= 1) return 0;
        if (lvl < 25) {
            return 50 * (lvl - 1) * lvl;
        }
        return Math.max(30000, 4000 * (lvl - 1) - 37500);
    };

    const getXpPercent = () => {
        if (!characterInfo || xpMax <= 0) return 0;
        
        let minXp = 0;
        if (level > 1) {
            if (characterName) {
                const storageKey = `mume_level_bounds_${characterName}`;
                try {
                    const saved = localStorage.getItem(storageKey);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (parsed.xpMin && parsed.xpMin[level] !== undefined) {
                            minXp = parsed.xpMin[level];
                        }
                    }
                } catch (e) {}
            }
            if (minXp === 0) {
                minXp = estimatePrevXpMax(level, xpMax);
            }
        }
        
        const safeMinXp = Math.min(minXp, xpMax - 1);
        const range = xpMax - safeMinXp;
        const currentProgress = xp - safeMinXp;
        return Math.max(0, Math.min(100, (currentProgress / range) * 100));
    };

    const getTpPercent = () => {
        if (!characterInfo || tpMax <= 0) return 0;
        
        let minTp = 0;
        if (level > 1) {
            if (characterName) {
                const storageKey = `mume_level_bounds_${characterName}`;
                try {
                    const saved = localStorage.getItem(storageKey);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (parsed.tpMin && parsed.tpMin[level] !== undefined) {
                            minTp = parsed.tpMin[level];
                        }
                    }
                } catch (e) {}
            }
            if (minTp === 0) {
                minTp = estimatePrevTpMax(level, tpMax);
            }
        }
        
        const safeMinTp = Math.min(minTp, tpMax - 1);
        const range = tpMax - safeMinTp;
        const currentProgress = tp - safeMinTp;
        return Math.max(0, Math.min(100, (currentProgress / range) * 100));
    };

    const xpPercent = getXpPercent();
    const tpPercent = getTpPercent();

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
            x: rect.left + rect.width / 2,
            y: rect.bottom,
            sourceHeight: rect.height,
            sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            setId: 'cat-enemy',
            category: 'cat-enemy',
            context: opponentName,
            entityId: opponentEntityId,
            menuDisplay: 'list',
            accentColor: opponentColor || enemyColor,
            preferSide: 'top'
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
            <div className="prompt-box-content">
                {/* Names Row — only shown in combat */}
                <div className="prompt-vitals-row-ascii">
                    {/* Player Side */}
                    <div className="vitals-side-container side-left">
                        <div className="prompt-player-hud">
                            <div
                                className="prompt-avatar-module prompt-character-trigger"
                                onClick={handlePromptCharacterClick}
                                role={viewport.isMobile && !viewport.isLandscape ? 'button' : undefined}
                                tabIndex={viewport.isMobile && !viewport.isLandscape ? 0 : undefined}
                                aria-label="Open character drawer"
                            >
                                <div className="prompt-avatar-pixel" aria-hidden="true">
                                    <div className="terrain-pin-sprite-head" />
                                    <div className="terrain-pin-sprite-body" />
                                </div>
                                <div className="prompt-level-progress-wrapper">
                                    <div className="prompt-progress-rails" aria-label="Level progress">
                                        <div className="prompt-progress-rail xp" title={`${characterInfo?.xp ?? 0} XP`}>
                                            <span style={{ height: `${xpPercent}%` }} />
                                        </div>
                                        <div className="prompt-progress-rail tp" title={`${characterInfo?.tp ?? 0} TP`}>
                                            <span style={{ height: `${tpPercent}%` }} />
                                        </div>
                                    </div>
                                    <div className="prompt-level-badge">{characterInfo?.level || '?'}</div>
                                </div>
                            </div>

                            <div className="player-vitals-stack">
                              <div className="prompt-top-stats-row player-top-stats-row">
                                <div
                                    className="name-label prompt-player-name prompt-inline-name prompt-character-trigger"
                                    onClick={handlePromptCharacterClick}
                                    role={viewport.isMobile && !viewport.isLandscape ? 'button' : undefined}
                                    tabIndex={viewport.isMobile && !viewport.isLandscape ? 0 : undefined}
                                    aria-label="Open character drawer"
                                >
                                    {characterName || ''}
                                </div>
                                <button
                                    type="button"
                                    className={`prompt-combat-stat-stack disposition-stat-button ${activeSlider === 'disposition' ? 'active' : ''}`}
                                    onClick={!isSpectateMode ? handleDispositionClick : undefined}
                                    style={{ cursor: isSpectateMode ? 'default' : 'pointer' }}
                                    title={`Disposition: ${mood || 'normal'} / ${spellSpeed || 'normal'} / ${alertness || 'normal'}`}
                                >
                                    <PromptCombatStatsLine />
                                    {!inCombat && (
                                        <span className="disposition-square-btn disposition-stat-icon" aria-hidden="true">
                                            <Sliders size={13} strokeWidth={2.6} />
                                        </span>
                                    )}
                                </button>
                                {!inCombat && (
                                    <button
                                        className={`pos-combat-square-btn ${activeSlider === 'pos' ? 'active' : ''}`}
                                        onClick={!isSpectateMode ? handlePosClick : undefined}
                                        style={{ cursor: isSpectateMode ? 'default' : 'pointer' }}
                                        title={`Position: ${playerPosition}`}
                                    >
                                        {getPositionIcon()}
                                    </button>
                                )}
                              </div>
                              <div className="player-stats-group player-stats-stack">
                                <div className="prompt-vital-row">
                                    <Heart size={11} className="vitals-icon hp-icon" strokeWidth={3} />
                                    <div ref={hpBarRef} className="prompt-vital-bar-shell">
                                        <ConditionBadge
                                            status={playerHealthStatus || 'Healthy'}
                                            percent={normalizeTierStatus(playerHealthStatus, HEALTH_TIERS)
                                                ? (HEALTH_MAP[normalizeTierStatus(playerHealthStatus, HEALTH_TIERS)!]?.percent ?? 0)
                                                : (maxHp > 0 ? (hp / maxHp) * 100 : 0)
                                            }
                                            colorClass="hp"
                                            segments={HEALTH_SEGMENTS}
                                            tiers={HEALTH_TIERS}
                                            onClick={handleHpBarClick}
                                            showAlt={showNumbers || isDragging}
                                            altStatus={isDragging ? `` : `${hp}/${maxHp}`}
                                            isFighting={inCombat}
                                            onPointerDown={handleHpPointerDown}
                                            wimpyRatio={wimpyRatio}
                                            isDragging={isDragging}
                                            dragVal={dragVal}
                                        />
                                    </div>
                                </div>
                                <div className="prompt-vital-row">
                                    <Zap size={11} className="vitals-icon mana-icon" strokeWidth={3} />
                                    <ConditionBadge
                                        status={mpStatus}
                                        percent={manaPercent}
                                        colorClass="mana"
                                        segments={MANA_SEGMENTS}
                                        tiers={MANA_TIERS}
                                        onClick={handleResourceBarClick}
                                        showAlt={showNumbers}
                                        altStatus={`${mana}/${maxMana}`}
                                        isFighting={inCombat}
                                    />
                                </div>
                                <div className="prompt-vital-row">
                                    <RunnerIcon size={11} className="vitals-icon move-icon" />
                                    <ConditionBadge
                                        status={stStatus}
                                        percent={movePercent}
                                        colorClass="move"
                                        segments={MOVE_SEGMENTS}
                                        tiers={MOVE_TIERS}
                                        onClick={handleResourceBarClick}
                                        showAlt={showNumbers}
                                        altStatus={`${move}/${maxMove}`}
                                        isFighting={inCombat}
                                    />
                                </div>
                              </div>
                            </div>
                        </div>
                    </div>

                    {/* Center Anchor */}
                    {inCombat && <div className="vitals-center-anchor" style={{ position: 'relative' }}>
                        <button 
                            className={`pos-combat-square-btn ${inCombat ? 'is-fighting' : ''} ${activeSlider === 'pos' ? 'active' : ''}`}
                            onClick={!isSpectateMode ? handlePosClick : undefined}
                            style={{ cursor: isSpectateMode ? 'default' : 'pointer' }}
                            title={inCombat ? 'Fighting' : `Position: ${playerPosition}`}
                        >
                            {getPositionIcon()}
                        </button>
                    </div>}

                    {/* Opponent Side */}
                    <div className="vitals-side-container side-right">
                        {inCombat && opponentName && (
                          <>
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
                                <RunnerIcon size={11} className="vitals-icon move-icon placeholder" />

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
                            <div
                                className="prompt-avatar-pixel prompt-opponent-avatar-pixel"
                                aria-hidden="true"
                                title={opponentName}
                            >
                                <div className="terrain-pin-sprite-head" />
                                <div className="terrain-pin-sprite-body" />
                            </div>
                          </>
                        )}
                    </div>
                </div>

                <PromptInventoryChips affects={affects} showGear={false} />
                <div className="prompt-room-occupants" aria-label="Room occupants">
                    <RoomChipRows variant="occupants-row" />
                </div>

                {activeSlider === 'pos' && activeButtonRect && (
                    <CombatSliderPopout 
                        label="POSITION"
                        value={playerPosition}
                        options={['sleeping', 'resting', 'sitting', 'standing']}
                        codes={['sleeping', 'resting', 'sitting', 'standing'].map(opt => POSITION_CODES[opt])}
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
