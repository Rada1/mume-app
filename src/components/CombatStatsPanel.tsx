import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVitals, useGame } from '../context/GameContext';
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

const CombatStatsPanel: React.FC = () => {
    const { stats } = useVitals();
    const { inCombat, mood, executeCommand } = useGame();
    const [moodMenuOpen, setMoodMenuOpen] = useState(false);
    const [hoveredMood, setHoveredMood] = useState<string | null>(null);
    const isDraggingRef = useRef(false);

    const fmt = (v: number | undefined) => v !== undefined ? `${v}%` : '—';
    const moodAbbr = mood ? mood.slice(0, 4).toUpperCase() : '—';
    const currentMoodLower = mood?.toLowerCase() ?? '';

    const getMoodAtPoint = (x: number, y: number): string | null => {
        const el = document.elementFromPoint(x, y);
        return (el?.closest('[data-mood]') as HTMLElement | null)?.dataset.mood ?? null;
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!isDraggingRef.current) return;
        setHoveredMood(getMoodAtPoint(e.clientX, e.clientY));
    }, []);

    const handlePointerUp = useCallback((e: PointerEvent) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        const selected = getMoodAtPoint(e.clientX, e.clientY);
        if (selected) {
            executeCommand(`cha mood ${selected}`);
            setMoodMenuOpen(false);
        }
        setHoveredMood(null);
    }, [executeCommand]);

    useEffect(() => {
        if (!moodMenuOpen) return;
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
        };
    }, [moodMenuOpen, handlePointerMove, handlePointerUp]);

    // Close menu if combat ends
    useEffect(() => {
        if (!inCombat) setMoodMenuOpen(false);
    }, [inCombat]);

    const handleTriggerPointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        isDraggingRef.current = true;
        if (!moodMenuOpen) setMoodMenuOpen(true);
    };

    // Tapping anywhere inside the open menu also starts a drag session
    const handleMenuPointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        isDraggingRef.current = true;
    };

    return (
        <div className={`combat-stats-panel${inCombat ? ' active' : ''}`}>
            <StatRow label="OB"  value={fmt(stats.ob)} />
            <StatRow label="DB"  value={fmt(stats.db)} />
            <StatRow label="PB"  value={fmt(stats.pb)} />
            <StatRow label="ARM" value={fmt(stats.armour)} />
            <div className="csp-divider" />
            <div
                className="csp-row csp-mood-trigger"
                onPointerDown={handleTriggerPointerDown}
            >
                <span className="csp-label">MOOD</span>
                <span className="csp-value">{moodAbbr}</span>
            </div>
            {moodMenuOpen && (
                <div className="csp-mood-menu" onPointerDown={handleMenuPointerDown}>
                    {MOODS.map(m => (
                        <button
                            key={m.abbr}
                            data-mood={m.full}
                            className={`csp-mood-btn${currentMoodLower.startsWith(m.abbr) ? ' active' : ''}${hoveredMood === m.full ? ' drag-hover' : ''}`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default React.memo(CombatStatsPanel);
