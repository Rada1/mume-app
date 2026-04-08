/**
 * @file PromptBox.tsx
 * @description Enhanced prompt display with custom person-pose icons.
 */

import React, { memo, FC, useState, useRef, useCallback } from 'react';
import { Swords } from 'lucide-react';
import './PromptBox.css';
import { GameStats, CharacterInfo, CombatHealthStatus } from '../types';
import { useGame, useVitals } from '../context/GameContext';
import { CombatSliderPopout } from './Drawers/StatsDrawer/CombatSliderPopout';

interface PromptBoxProps {
    stats: GameStats;
    characterInfo: CharacterInfo;
    inCombat: boolean;
    playerPosition: string;
    opponentName: string | null;
    opponentHealthStatus: CombatHealthStatus | null;
    playerHealthStatus: CombatHealthStatus | null;
    isRiding?: boolean;
}

const HEALTH_MAP: Record<string, { percent: number; color: string }> = {
    'Healthy': { percent: 100, color: '#22c55e' },
    'Fine': { percent: 90, color: '#4ade80' },
    'Hurt': { percent: 70, color: '#facc15' },
    'Wounded': { percent: 50, color: '#fb923c' },
    'Bad': { percent: 30, color: '#f87171' },
    'Awful': { percent: 15, color: '#ef4444' },
    'Dying': { percent: 5, color: '#991b1b' },
    'Stunned': { percent: 25, color: '#a855f7' },
    'None': { percent: 0, color: '#4b5563' }
};

const getManaStatus = (current: number, max: number): string => {
    const p = max > 0 ? (current / max) * 100 : 0;
    if (p > 90) return 'Full';
    if (p > 70) return 'High';
    if (p > 40) return 'Half';
    if (p > 15) return 'Low';
    return 'Empty';
};

const getMoveStatus = (current: number, max: number): string => {
    const p = max > 0 ? (current / max) * 100 : 0;
    if (p > 90) return 'unwearied';
    if (p > 70) return 'Strong';
    if (p > 40) return 'Tired';
    if (p > 15) return 'Exhausted';
    return 'Fainting';
};

const ConditionBadge: React.FC<{ 
    status: string; 
    colorClass: string; 
    onClick?: () => void;
    altStatus?: string;
    showAlt?: boolean;
    flash?: boolean;
}> = ({ status, colorClass, onClick, altStatus, showAlt, flash }) => (
    <div className={`condition-badge ${colorClass} ${flash ? 'blink-hit' : ''}`} onClick={onClick} style={{ cursor: 'pointer' }}>
        <span className="status-bracket-wrapper">
            <span className="bracket">|</span>
            <span className="status-text">{showAlt && altStatus ? altStatus : status.toLowerCase()}</span>
            <span className="bracket">|</span>
        </span>
    </div>
);

// --- Custom Pose Icons ---
const PoseIcon: React.FC<{ pose: string; size?: number }> = ({ pose, size = 16 }) => {
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
    inCombat,
    playerPosition,
    opponentName,
    opponentHealthStatus,
    playerHealthStatus,
    isRiding
}) => {
    const { triggerHaptic, executeCommand, setPlayerPosition } = useGame();
    const { hitFlash, opponentHitFlash, hitFlashCounter, opponentHitFlashCounter } = useVitals();
    const [activeSlider, setActiveSlider] = useState<'pos' | null>(null);
    const [activeButtonRect, setActiveButtonRect] = useState<DOMRect | null>(null);
    const [showNumbers, setShowNumbers] = useState(false);
    const numbersTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        if (inCombat) return <Swords size={16} className="combat-divider-icon" />;
        if (isRiding) return <PoseIcon pose="riding" size={16} />;
        return <PoseIcon pose={playerPosition} size={16} />;
    };

    return (
        <div className="prompt-box-container" id="prompt-box">
            <div className="prompt-box-content">
                {/* Unified Vitals Row (Player + Opponent) */}
                <div className="prompt-vitals-row-ascii">
                    <div className="vitals-side-container side-left">
                        <div className="player-stats-group">
                            <div key={`hp-flash-${hitFlashCounter}`} className={hitFlash ? 'blink-hit' : ''}>
                                <ConditionBadge 
                                    status={playerHealthStatus || 'Healthy'} 
                                    colorClass="hp" 
                                    onClick={triggerNumbers}
                                    showAlt={showNumbers}
                                    altStatus={`${stats.hp}/${stats.maxHp}`}
                                    flash={hitFlash}
                                />
                            </div>
                            <ConditionBadge 
                                status={mpStatus} 
                                colorClass="mana" 
                                onClick={triggerNumbers}
                                showAlt={showNumbers}
                                altStatus={`${stats.mana}/${stats.maxMana}`}
                            />
                            <ConditionBadge 
                                status={stStatus} 
                                colorClass="move" 
                                onClick={triggerNumbers}
                                showAlt={showNumbers}
                                altStatus={`${stats.move}/${stats.maxMove}`}
                            />
                        </div>
                    </div>

                    <div className="vitals-center-anchor">
                        <button 
                            className={`pos-combat-square-btn ${inCombat ? 'is-fighting' : ''} ${activeSlider === 'pos' ? 'active' : ''}`}
                            onClick={handlePosClick}
                            title={inCombat ? 'Fighting' : `Position: ${playerPosition}`}
                        >
                            {getPositionIcon()}
                        </button>

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

                    <div className="vitals-side-container side-right">
                        {(inCombat || opponentName) && (
                            <div className="animate-combat-mini" style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
                                <div 
                                    key={`opp-hit-${opponentHitFlashCounter}`}
                                    className={`opponent-stats-group ${opponentHitFlash ? 'blink-hit' : ''}`}
                                >
                                    <span className="opponent-label">{opponentName || 'target'}</span>
                                    <span className="status-bracket-wrapper">
                                        <span className="bracket">|</span>
                                        <span className="status-text">{opponentHealthStatus?.toLowerCase() || 'targeting'}</span>
                                        <span className="bracket">|</span>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(PromptBox);
