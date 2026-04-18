/**
 * @file PromptBox.tsx
 * @description Enhanced prompt display with custom person-pose icons.
 */

import React, { memo, FC, useState, useRef, useCallback, useEffect } from 'react';
import { Swords, Heart, Zap, Footprints, Info, Sliders } from 'lucide-react';
import './PromptBox.css';
import { GameStats, CharacterInfo, CombatHealthStatus } from '../../types';
import { useGame, useVitals } from '../../context/GameContext';
import XpTicker from '../Combat/XpTicker';
import { CombatSliderPopout } from '../Drawers/StatsDrawer/CombatSliderPopout';
import { getCategoryForName, getGlowColorForCategory } from '../../utils/categorizationUtils';

interface PromptBoxProps {
    stats: GameStats;
    characterInfo: CharacterInfo;
    characterName: string | null;
    inCombat: boolean;
    playerPosition: string;
    opponentName: string | null;
    opponentHealthStatus: CombatHealthStatus | null;
    playerHealthStatus: CombatHealthStatus | null;
    isRiding?: boolean;
    isSpectateMode?: boolean;
    processMessageHtml?: (html: string, mid: string, isRoomName: boolean, type?: string, isCombat?: boolean, side?: string) => string;
    onWimpyChange?: (val: number) => void;
}

const HEALTH_MAP: Record<string, { percent: number; color: string }> = {
    'Healthy': { percent: 100, color: '#22c55e' },
    'Fine': { percent: 90, color: '#4ade80' },
    'Hurt': { percent: 70, color: '#facc15' },
    'Wounded': { percent: 45, color: '#fb923c' },
    'Bad': { percent: 25, color: '#f87171' },
    'Awful': { percent: 12, color: '#ef4444' },
    'Dying': { percent: 5, color: '#991b1b' },
    'Stunned': { percent: 25, color: '#a855f7' },
    'None': { percent: 0, color: '#4b5563' }
};

const getManaPercent = (current: number, max: number): number => max > 0 ? (current / max) * 100 : 0;
const getMovePercent = (current: number, max: number): number => max > 0 ? (current / max) * 100 : 0;

const getManaStatus = (current: number, max: number): string => {
    const p = getManaPercent(current, max);
    if (p > 90) return 'Full';
    if (p > 70) return 'High';
    if (p > 40) return 'Half';
    if (p > 15) return 'Low';
    return 'Empty';
};

const getMoveStatus = (current: number, max: number): string => {
    const p = getMovePercent(current, max);
    if (p > 90) return 'unwearied';
    if (p > 70) return 'Strong';
    if (p > 40) return 'Tired';
    if (p > 15) return 'Exhausted';
    return 'Fainting';
};

const ConditionBadge: React.FC<{ 
    status: string; 
    percent: number;
    colorClass: string; 
    onClick?: () => void;
    altStatus?: string;
    showAlt?: boolean;
    mirrored?: boolean;
    onPointerDown?: (e: React.PointerEvent) => void;
    wimpyRatio?: number;
    isDragging?: boolean;
    dragVal?: number | null;
}> = ({ status, percent, colorClass, onClick, altStatus, showAlt, mirrored, onPointerDown, wimpyRatio, isDragging, dragVal }) => {
    // --- Logic for Resource Loss "Magnitude" Bar ---
    const [lossMagnitude, setLossMagnitude] = useState(0);
    const prevPercentRef = useRef(percent);

    useEffect(() => {
        const prev = prevPercentRef.current;
        prevPercentRef.current = percent;

        if (percent < prev) {
            // Health lost - show only the magnitude of this specific hit
            const delta = prev - percent;
            setLossMagnitude(delta);
            
            const timer = setTimeout(() => {
                setLossMagnitude(0);
            }, 500);
            return () => clearTimeout(timer);
        } else if (percent > prev) {
            // Health gained - reset loss indicator
            setLossMagnitude(0);
        }
    }, [percent]);

    const segments = 5;

    return (
        <div className={`condition-badge ${colorClass}`} onClick={onClick} onPointerDown={onPointerDown}>
            <div className={`status-bar-segment ${mirrored ? 'is-mirrored' : ''}`}>
                <div className="status-bar-segments-grid">
                    {[...Array(segments)].map((_, i) => {
                        const segmentIndex = mirrored ? (segments - 1 - i) : i;
                        const start = (segmentIndex / segments) * 100;
                        const end = ((segmentIndex + 1) / segments) * 100;
                        
                        // Fill logic
                        let fill = 0;
                        if (percent >= end) fill = 100;
                        else if (percent > start) fill = ((percent - start) / (end - start)) * 100;

                        // Ghost logic
                        let ghostFill = 0;
                        if (lossMagnitude > 0) {
                            const ghostStart = percent;
                            const ghostEnd = percent + lossMagnitude;
                            if (ghostEnd >= end) {
                                ghostFill = Math.max(0, 100 - fill); 
                            } else if (ghostEnd > start) {
                                const segmentLocalGhostEnd = ((ghostEnd - start) / (end - start)) * 100;
                                ghostFill = Math.max(0, segmentLocalGhostEnd - fill);
                            }
                        }

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
    stats,
    characterInfo,
    characterName,
    inCombat,
    playerPosition,
    opponentName,
    opponentHealthStatus,
    playerHealthStatus,
    isRiding,
    isSpectateMode,
    processMessageHtml,
    onWimpyChange
}) => {
    const { triggerHaptic, executeCommand, setPlayerPosition, inlineCategories, isNewbieMode, viewport } = useGame();
    const [activeSlider, setActiveSlider] = useState<'pos' | null>(null);
    const [activeButtonRect, setActiveButtonRect] = useState<DOMRect | null>(null);
    const [showNumbers, setShowNumbers] = useState(false);
    const numbersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Dynamic scaling linked directly to the authoritative log font size
    const nameFontSize = `var(--dynamic-log-size)`;

    // --- Wimpy Slider Drag Logic ---
    const [isDragging, setIsDragging] = useState(false);
    const [dragVal, setDragVal] = useState<number | null>(null);
    const dragValRef = useRef<number | null>(null);
    const hpBarRef = useRef<HTMLDivElement>(null);

    const updateDrag = useCallback((e: PointerEvent | React.PointerEvent) => {
        if (!hpBarRef.current || stats.maxHp <= 0) return;
        const rect = hpBarRef.current.getBoundingClientRect();
        
        let clientX = 0;
        if ('clientX' in e) {
            clientX = e.clientX;
        }

        let ratio = (clientX - rect.left) / rect.width;
        ratio = Math.max(0, Math.min(1, ratio));
        const val = Math.round(ratio * stats.maxHp);
        dragValRef.current = val;
        setDragVal(val);
    }, [stats.maxHp]);

    const handleHpPointerDown = (e: React.PointerEvent) => {
        if (!onWimpyChange) return;
        
        // Initial calculation
        if (!hpBarRef.current || stats.maxHp <= 0) return;
        const rect = hpBarRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const val = Math.round(ratio * stats.maxHp);
        
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

    const displayWimpy = dragVal !== null ? dragVal : (stats.wimpy ?? 0);
    const wimpyRatio = stats.maxHp > 0 ? displayWimpy / stats.maxHp : 0;

    // Dynamic color for opponent (NPC/Player/etc) to match log higlighter
    const opponentColor = React.useMemo(() => {
        if (!opponentName) return undefined;
        const cat = getCategoryForName(opponentName, inlineCategories);
        return getGlowColorForCategory(cat, inlineCategories) || undefined;
    }, [opponentName, inlineCategories]);

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

    const mpStatus = getManaStatus(stats.mana, stats.maxMana);
    const stStatus = getMoveStatus(stats.move, stats.maxMove);

    const getPositionIcon = () => {
        if (inCombat) return <Swords size={14} className="combat-divider-icon" />;
        if (isRiding) return <PoseIcon pose="riding" size={14} />;
        return <PoseIcon pose={playerPosition} size={14} />;
    };

    const renderStyledName = (name: string, isOpponent = false) => {
        if (!processMessageHtml) return name;
        // Strip any remaining prompt crud like brackets
        const clean = name.replace(/^[\[\]<>]+/, '').trim();
        const html = processMessageHtml(clean, `prompt-${isOpponent ? 'opp' : 'player'}`, false, isOpponent ? 'npc' : 'pc');
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div className="prompt-box-container" id="prompt-box" style={{ '--prompt-name-font-size': nameFontSize } as any}>
            <div className="prompt-box-content">
                {/* Names Row — only shown in combat */}
                {inCombat && (
                    <div className="vitals-names-row">
                        <div className="name-label player-name">
                            {renderStyledName(characterName || 'YOU')}
                        </div>
                        {opponentName && (
                            <div className="name-label opponent-name animate-combat-mini">
                                {renderStyledName(opponentName, true)}
                            </div>
                        )}
                    </div>
                )}

                <div className="prompt-vitals-row-ascii">
                    {/* Player Side */}
                    <div className="vitals-side-container side-left">
                        <div className="player-stats-group">
                            <Heart size={11} className="vitals-icon hp-icon" strokeWidth={3} />
                            <div ref={hpBarRef} style={{ flex: 1, display: 'flex', minWidth: 0 }}>
                                <ConditionBadge
                                    status={playerHealthStatus || 'Healthy'}
                                    percent={stats.maxHp > 0 ? (stats.hp / stats.maxHp) * 100 : (HEALTH_MAP[playerHealthStatus || 'Healthy']?.percent || 0)}
                                    colorClass="hp"
                                    onClick={triggerNumbers}
                                    showAlt={showNumbers || isDragging}
                                    altStatus={isDragging ? `` : `${stats.hp}/${stats.maxHp}`}
                                    onPointerDown={handleHpPointerDown}
                                    wimpyRatio={wimpyRatio}
                                    isDragging={isDragging}
                                    dragVal={dragVal}
                                />
                            </div>
                            <Zap size={11} className="vitals-icon mana-icon" strokeWidth={3} />
                            <ConditionBadge 
                                status={mpStatus} 
                                percent={getManaPercent(stats.mana, stats.maxMana)}
                                colorClass="mana" 
                                onClick={triggerNumbers}
                                showAlt={showNumbers}
                                altStatus={`${stats.mana}/${stats.maxMana}`}
                            />
                            <Footprints size={11} className="vitals-icon move-icon" strokeWidth={3} />
                            <ConditionBadge 
                                status={stStatus} 
                                percent={getMovePercent(stats.move, stats.maxMove)}
                                colorClass="move" 
                                onClick={triggerNumbers}
                                showAlt={showNumbers}
                                altStatus={`${stats.move}/${stats.maxMove}`}
                            />
                        </div>
                    </div>

                    {/* Center Anchor */}
                    <div className="vitals-center-anchor" style={{ position: 'relative' }}>
                        <XpTicker isLandscape={viewport.isLandscape} align="center" />
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
                        {opponentName && (
                            <div className="opponent-stats-group animate-combat-mini">
                                <ConditionBadge 
                                    status="Unknown" 
                                    percent={100} 
                                    colorClass="move placeholder" 
                                    mirrored
                                />
                                <Footprints size={11} className="vitals-icon move-icon placeholder" strokeWidth={3} />

                                <ConditionBadge 
                                    status="Unknown" 
                                    percent={100} 
                                    colorClass="mana placeholder" 
                                    mirrored
                                />
                                <Zap size={11} className="vitals-icon mana-icon placeholder" strokeWidth={3} />

                                <ConditionBadge
                                    status={opponentHealthStatus || 'Fighting'}
                                    percent={HEALTH_MAP[opponentHealthStatus || 'Healthy']?.percent || 50}
                                    colorClass="opponent" 
                                    mirrored
                                />
                                <Heart size={11} className="vitals-icon hp-icon is-mirrored" strokeWidth={3} />
                            </div>
                        )}
                    </div>
                </div>

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
                    />
                )}
            </div>
        </div>
    );
};

export default memo(PromptBox);
