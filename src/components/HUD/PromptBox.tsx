/**
 * @file PromptBox.tsx
 * @description Enhanced prompt display with custom person-pose icons.
 */

import React, { memo, FC, useState, useRef, useCallback, useEffect } from 'react';
import { Swords } from 'lucide-react';
import './PromptBox.css';
import { GameStats, CharacterInfo, CombatHealthStatus } from '../../types';
import { useGame, useVitals } from '../../context/GameContext';
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
    processMessageHtml?: (html: string, mid: string, isRoomName: boolean, type?: string, isCombat?: boolean, side?: string) => string;
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
    flash?: boolean;
}> = ({ status, percent, colorClass, onClick, altStatus, showAlt, flash }) => (
    <div className={`condition-badge ${colorClass} ${flash ? 'blink-hit' : ''}`} onClick={onClick}>
        <div className="status-bar-segment">
            <div 
                className="status-bar-fill" 
                style={{ 
                    width: `${Math.max(0, Math.min(100, percent))}%`,
                }} 
            />
            <div className="status-bar-dividers">
                <div className="bar-divider" />
                <div className="bar-divider" />
                <div className="bar-divider" />
                <div className="bar-divider" />
            </div>
            <span className="status-text">{showAlt && altStatus ? altStatus : ""}</span>
        </div>
    </div>
);

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
    processMessageHtml
}) => {
    const { triggerHaptic, executeCommand, setPlayerPosition, inlineCategories } = useGame();
    const { hitFlashEvent, oppHitFlashEvent } = useVitals();
    const [activeSlider, setActiveSlider] = useState<'pos' | null>(null);
    const [activeButtonRect, setActiveButtonRect] = useState<DOMRect | null>(null);
    const [showNumbers, setShowNumbers] = useState(false);
    const numbersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Dynamic color for opponent (NPC/Player/etc) to match log higlighter
    const opponentColor = React.useMemo(() => {
        if (!opponentName) return undefined;
        const cat = getCategoryForName(opponentName, inlineCategories);
        return getGlowColorForCategory(cat, inlineCategories) || undefined;
    }, [opponentName, inlineCategories]);

    // Flash on combat impact (triggered by parser on each hit)
    const [hitFlash, setHitFlash] = useState(false);
    const [oppHitFlash, setOppHitFlash] = useState(false);

    useEffect(() => {
        if (hitFlashEvent === 0) return;
        setHitFlash(true);
        const t = setTimeout(() => setHitFlash(false), 350);
        return () => clearTimeout(t);
    }, [hitFlashEvent]);

    useEffect(() => {
        if (oppHitFlashEvent === 0) return;
        setOppHitFlash(true);
        const t = setTimeout(() => setOppHitFlash(false), 350);
        return () => clearTimeout(t);
    }, [oppHitFlashEvent]);

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
        <div className="prompt-box-container" id="prompt-box">
            <div className="prompt-box-content">
                {/* Names Row — only shown in combat */}
                {inCombat && (
                    <div className="vitals-names-row">
                        <div className={`name-label player-name ${hitFlash ? 'blink-hit' : ''}`}>
                            {renderStyledName(characterName || 'YOU')}
                        </div>
                        {opponentName && (
                            <div className={`name-label opponent-name ${oppHitFlash ? 'blink-hit' : ''} animate-combat-mini`}>
                                {renderStyledName(opponentName, true)}
                            </div>
                        )}
                    </div>
                )}

                <div className="prompt-vitals-row-ascii">
                    {/* Player Side */}
                    <div className="vitals-side-container side-left">
                        <div className="player-stats-group">
                            <ConditionBadge
                                status={playerHealthStatus || 'Healthy'}
                                percent={stats.maxHp > 0 ? (stats.hp / stats.maxHp) * 100 : (HEALTH_MAP[playerHealthStatus || 'Healthy']?.percent || 0)}
                                colorClass="hp"
                                onClick={triggerNumbers}
                                showAlt={showNumbers}
                                altStatus={`${stats.hp}/${stats.maxHp}`}
                            />
                            <ConditionBadge 
                                status={mpStatus} 
                                percent={getManaPercent(stats.mana, stats.maxMana)}
                                colorClass="mana" 
                                onClick={triggerNumbers}
                                showAlt={showNumbers}
                                altStatus={`${stats.mana}/${stats.maxMana}`}
                            />
                            <ConditionBadge 
                                status={stStatus} 
                                percent={getMovePercent(stats.move, stats.maxMove)}
                                colorClass="move" 
                                onClick={triggerNumbers}
                                showAlt={showNumbers}
                                altStatus={`${stats.move}/${stats.maxMove}`}
                            />

                            <button 
                                className={`pos-combat-square-btn ${inCombat ? 'is-fighting' : ''} ${activeSlider === 'pos' ? 'active' : ''}`}
                                onClick={handlePosClick}
                                title={inCombat ? 'Fighting' : `Position: ${playerPosition}`}
                                style={{ marginLeft: '4px' }}
                            >
                                {getPositionIcon()}
                            </button>
                        </div>
                    </div>

                    {/* Center Anchor */}
                    <div className="vitals-center-anchor" style={{ width: inCombat ? '20px' : '0' }}></div>

                    {/* Opponent Side */}
                    <div className="vitals-side-container side-right">
                        {opponentName && (
                            <div className="opponent-stats-group animate-combat-mini">
                                <ConditionBadge
                                    status={opponentHealthStatus || 'Fighting'}
                                    percent={HEALTH_MAP[opponentHealthStatus || 'Healthy']?.percent || 50}
                                    colorClass="opponent" 
                                />
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
