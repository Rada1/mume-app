import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVitals, useGame } from '../../context/GameContext';
import './CombatStatsPanel.css';

const MOODS = [
    { abbr: 'wim', label: 'WIM', full: 'wimpy' },
    { abbr: 'pru', label: 'PRU', full: 'prudent' },
    { abbr: 'nor', label: 'NOR', full: 'normal' },
    { abbr: 'bra', label: 'BRA', full: 'brave' },
    { abbr: 'agg', label: 'AGG', full: 'aggressive' },
    { abbr: 'ber', label: 'BER', full: 'berserk' },
];

const StatRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="csp-row">
        <span className="csp-label">{label}</span>
        <span className="csp-value">{value}</span>
    </div>
);

const SPEEDS = [
    { label: 'SLOW', val: 'slow' },
    { label: 'NORM', val: 'normal' },
    { label: 'FAST', val: 'fast' },
];

const ALERTS = [
    { label: 'OFF', val: 'off' },
    { label: 'NORM', val: 'normal' },
    { label: 'ACT', val: 'active' },
];

const CombatStatsPanel: React.FC = () => {
    const { stats } = useVitals();
    const { inCombat, mood, spellSpeed, alertness, executeCommand, isSpectateMode, viewport, btn } = useGame();
    const { isMobile } = viewport;
    
    // Menu States
    const [openMenu, setOpenMenu] = useState<'mood' | 'speed' | 'alert' | null>(null);
    const [hoveredOption, setHoveredOption] = useState<string | null>(null);
    const isDraggingRef = useRef(false);

    const fmt = (v: number | undefined) => v !== undefined ? `${v}%` : '—';
    
    // Formatting current values
    const moodAbbr = mood ? mood.slice(0, 4).toUpperCase() : '—';
    const speedAbbr = spellSpeed ? spellSpeed.slice(0, 4).toUpperCase() : '—';
    const alertAbbr = alertness ? alertness.slice(0, 4).toUpperCase() : '—';

    const getOptionAtPoint = (x: number, y: number): string | null => {
        const el = document.elementFromPoint(x, y);
        return (el?.closest('[data-opt]') as HTMLElement | null)?.dataset.opt ?? null;
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!isDraggingRef.current) return;
        setHoveredOption(getOptionAtPoint(e.clientX, e.clientY));
    }, []);

    const handlePointerUp = useCallback((e: PointerEvent) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        const selected = getOptionAtPoint(e.clientX, e.clientY);
        if (selected && openMenu) {
            if (openMenu === 'mood') executeCommand(`cha mood ${selected}`);
            if (openMenu === 'speed') executeCommand(`cha speed ${selected}`);
            if (openMenu === 'alert') executeCommand(`alert ${selected}`);
            setOpenMenu(null);
        }
        setHoveredOption(null);
    }, [executeCommand, openMenu]);

    useEffect(() => {
        if (!openMenu) return;
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };
    }, [openMenu, handlePointerMove, handlePointerUp]);

    // Close menu if combat ends
    useEffect(() => {
        if (!inCombat) setOpenMenu(null);
    }, [inCombat]);

    const handleTriggerPointerDown = (type: 'mood' | 'speed' | 'alert') => (e: React.PointerEvent) => {
        e.stopPropagation();
        isDraggingRef.current = true;
        setOpenMenu(type);
    };

    const handleMenuPointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        isDraggingRef.current = true;
    };

    if (isSpectateMode) return null;

    // Show on mobile always during combat.
    // On desktop, hide during play mode entirely to keep the log clear.
    // Use can still see it in "Edit Mode" to position it for mobile.
    const isVisible = btn.isEditMode || (isMobile && inCombat);

    return (
        <div className={`combat-stats-panel${isVisible ? ' active' : ''}`}>
            <div className="csp-l-container">
                {/* Horizontal Stat Bar (Long part of L) */}
                <div className="csp-stats-bar">
                    <StatRow label="OB"  value={fmt(stats.ob)} />
                    <StatRow label="DB"  value={fmt(stats.db)} />
                    <StatRow label="PB"  value={fmt(stats.pb)} />
                    <StatRow label="ARM" value={fmt(stats.armour)} />
                </div>

                {/* Vertical Control Column (Short part of L) */}
                <div className="csp-controls-column">
                    {/* MOOD */}
                    <div className="csp-row csp-trigger" onPointerDown={handleTriggerPointerDown('mood')}>
                        <span className="csp-label">MOOD</span>
                        <span className="csp-value">{moodAbbr}</span>
                        {openMenu === 'mood' && (
                            <div className="csp-menu" onPointerDown={handleMenuPointerDown}>
                                {MOODS.map(m => (
                                    <button
                                        key={m.abbr}
                                        data-opt={m.full}
                                        className={`csp-menu-btn${(mood?.toLowerCase() || '').startsWith(m.abbr) ? ' active' : ''}${hoveredOption === m.full ? ' drag-hover' : ''}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SPEED */}
                    <div className="csp-row csp-trigger" onPointerDown={handleTriggerPointerDown('speed')}>
                        <span className="csp-label">SPEED</span>
                        <span className="csp-value">{speedAbbr}</span>
                        {openMenu === 'speed' && (
                            <div className="csp-menu" onPointerDown={handleMenuPointerDown}>
                                {SPEEDS.map(s => (
                                    <button
                                        key={s.val}
                                        data-opt={s.val}
                                        className={`csp-menu-btn${(spellSpeed?.toLowerCase() || '') === s.val ? ' active' : ''}${hoveredOption === s.val ? ' drag-hover' : ''}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ALERT */}
                    <div className="csp-row csp-trigger" onPointerDown={handleTriggerPointerDown('alert')}>
                        <span className="csp-label">ALERT</span>
                        <span className="csp-value">{alertAbbr}</span>
                        {openMenu === 'alert' && (
                            <div className="csp-menu" onPointerDown={handleMenuPointerDown}>
                                {ALERTS.map(a => (
                                    <button
                                        key={a.val}
                                        data-opt={a.val}
                                        className={`csp-menu-btn${(alertness?.toLowerCase() || '') === a.val ? ' active' : ''}${hoveredOption === a.val ? ' drag-hover' : ''}`}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CombatStatsPanel);
