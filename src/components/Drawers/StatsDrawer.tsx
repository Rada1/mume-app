import React, { useMemo } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import { DrawerLine } from '../../types';

interface CharacterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    statsLines: DrawerLine[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    isLandscape?: boolean;
}

export const StatsDrawer: React.FC<CharacterDrawerProps> = ({
    isOpen,
    onClose,
    statsLines,
    executeCommand,
    isLandscape = false
}) => {
    const {
        mood, setMood, spellSpeed, setSpellSpeed, alertness, setAlertness,
        playerPosition, setPlayerPosition, triggerHaptic, inCombat
    } = useGame();
    const { stats, setStats, characterInfo } = useVitals();

    const activeSpells = useMemo(() => {
        const spells: string[] = [];
        let inSpellsSection = false;
        for (const line of statsLines) {
            const text = line.text.trim();
            if (text.startsWith('Affecting Spells:')) {
                inSpellsSection = true;
                continue;
            }
            if (inSpellsSection) {
                if (text.startsWith('- ')) {
                    spells.push(text.substring(2).trim());
                } else if (text.length > 0) {
                    // Reached end of spells section or another header
                    inSpellsSection = false;
                }
            }
        }
        return spells;
    }, [statsLines]);

    const renderTicks = (labels?: string[]) => (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', justifyContent: 'space-between', padding: '0 12px', pointerEvents: 'none', zIndex: 1, alignItems: 'center' }}>
            {(labels || ['', '', '', '', '']).map((label, tick) => (
                <div key={tick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <div style={{ width: '2px', height: '10px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
                    {label && (
                        <div style={{ 
                            position: 'absolute', 
                            top: '12px', 
                            fontSize: '0.42rem', 
                            color: 'rgba(255,255,255,0.4)', 
                            textTransform: 'uppercase', 
                            whiteSpace: 'nowrap',
                            fontWeight: 800,
                            letterSpacing: '0.5px'
                        }}>
                            {label}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const renderConditions = () => {
        const conds = stats.conditions || {};
        const activeConds = Object.keys(conds).filter(k => conds[k]);
        
        if (activeConds.length === 0) {
            return <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No active conditions</div>;
        }

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeConds.map(c => (
                    <div key={c} style={{
                        padding: '4px 10px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        borderRadius: '12px',
                        color: '#fca5a5',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                    }}>
                        {c}
                    </div>
                ))}
            </div>
        );
    };

    const renderSpells = () => {
        if (activeSpells.length === 0) {
            return <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No active spells</div>;
        }

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeSpells.map((s, i) => (
                    <div key={i} style={{
                        padding: '4px 10px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.5)',
                        borderRadius: '12px',
                        color: '#93c5fd',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                    }}>
                        {s}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div
            className={`stats-drawer ${isOpen ? 'open' : ''} ${isLandscape ? 'landscape-mode' : ''}`}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT') return;
                e.currentTarget.setPointerCapture(e.pointerId);
                (e.currentTarget as any)._startX = e.clientX;
                (e.currentTarget as any)._startY = e.clientY;
            }}
            onPointerUp={(e) => {
                const startX = (e.currentTarget as any)._startX;
                const startY = (e.currentTarget as any)._startY;
                if (startX !== undefined && startX !== null) {
                    const deltaX = startX - e.clientX;
                    const deltaY = Math.abs(e.clientY - (startY || 0));
                    if (deltaX > 20 && deltaX > deltaY) {
                        triggerHaptic(40);
                        onClose();
                    }
                }
                (e.currentTarget as any)._startX = null;
                (e.currentTarget as any)._startY = null;
            }}
            onPointerCancel={(e) => {
                (e.currentTarget as any)._startX = null;
            }}
            style={{ touchAction: 'pan-y' }}
        >
            <div className="drawer-content" style={{ 
                flex: 1, 
                overflowY: 'auto', 
                WebkitOverflowScrolling: 'touch', 
                padding: isLandscape ? '12px 15px 40px 15px' : '20px', 
                position: 'relative', 
                touchAction: 'pan-y',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px', zIndex: 1, pointerEvents: 'none' }}>
                    <div style={{ width: '6px', height: '80px', background: 'rgba(255,255,255,0.4)', borderRadius: '3px' }} />
                </div>
                
                <div className="drawer-header" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 20px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    margin: '10px 15px 5px 15px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 10
                }}>

                    <div className="swipe-indicator" style={{ position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)', width: '30px', height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px', color: 'var(--accent)' }}>Combat Stats</span>
                    <button onClick={() => { triggerHaptic(20); onClose(); }} style={{ 
                        marginLeft: 'auto',
                        background: 'rgba(255,255,255,0.08)', 
                        border: 'none', 
                        color: '#fff', 
                        width: '30px', 
                        height: '30px', 
                        borderRadius: '15px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '1rem', 
                        cursor: 'pointer'
                    }}>✕</button>
                </div>
                
                <div className="drawer-content" style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '10px 15px 40px 15px', 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0'
                }}>
                    <div className="drawer-main-layout" style={{ 
                        display: 'flex', 
                        flexDirection: isLandscape ? 'row' : 'column', 
                        gap: isLandscape ? '15px' : '0',
                        flex: 1
                    }}>
                        {/* LEFT COLUMN (or Top in Portrait) */}
                        <div className="drawer-col-left" style={{ flex: isLandscape ? 1.2 : 'none', display: 'flex', flexDirection: 'column' }}>

                            <div className="drawer-section" style={{ pointerEvents: 'auto', marginBottom: '15px' }}>
                                <div className="section-header">Status & Spells</div>
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Conditions</div>
                                    {renderConditions()}
                                </div>
                                
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Active Spells</div>
                                    {renderSpells()}
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN (or Bottom in Portrait) */}
                        <div className="drawer-col-right" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Combat Percentages Section */}
                            <div className="drawer-section" style={{ pointerEvents: 'auto', marginBottom: '15px' }}>
                                <div className="section-header">Combat Potential</div>
                                <div style={{ 
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: '8px'
                                }}>
                                    {[
                                        { label: 'OB', value: stats.ob },
                                        { label: 'DB', value: stats.db },
                                        { label: 'PB', value: stats.pb },
                                        { label: 'ARM', value: stats.armour }
                                    ].map(stat => (
                                        <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px', fontWeight: 800 }}>{stat.label}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold' }}>{stat.value !== undefined ? `${stat.value}%` : '--'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="drawer-section" style={{ pointerEvents: 'auto', marginBottom: '15px' }}>
                                <div className="section-header">Combat Settings</div>
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                                        <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px', fontWeight: 800 }}>MOOD</div>
                                        <div style={{ fontSize: isLandscape ? '0.75rem' : '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{mood === 'berserk' ? 'Berserk' : mood}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ position: 'relative', flex: 1, height: '32px', display: 'flex', alignItems: 'center' }}>
                                            {renderTicks(['wimpy', 'prudent', 'normal', 'brave', 'aggr'])}
                                            <input
                                                type="range"
                                                min="0"
                                                max="4"
                                                step="1"
                                                value={['wimpy', 'prudent', 'normal', 'brave', 'aggressive'].indexOf(mood === 'berserk' ? 'aggressive' : mood)}
                                                onChange={(e) => {
                                                    const options = ['wimpy', 'prudent', 'normal', 'brave', 'aggressive'];
                                                    const val = options[parseInt(e.target.value)];
                                                    setMood(val);
                                                    executeCommand(`change mood ${val} `);
                                                    setTimeout(() => executeCommand('stat', true, true, true, true), 100);
                                                    triggerHaptic(15);
                                                }}
                                                className="mobile-slider"
                                                style={{ width: '100%', position: 'relative', zIndex: 2, background: 'transparent' }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newVal = mood === 'berserk' ? 'aggressive' : 'berserk';
                                                setMood(newVal);
                                                executeCommand(`change mood ${newVal} `);
                                                setTimeout(() => executeCommand('stat', true, true, true, true), 100);
                                                triggerHaptic(30);
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                border: mood === 'berserk' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)',
                                                background: mood === 'berserk' ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
                                                color: mood === 'berserk' ? 'var(--accent)' : '#fff',
                                                fontSize: '0.55rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            BERSERK
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                                        <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px', fontWeight: 800 }}>SPELL SPEED</div>
                                        <div style={{ fontSize: isLandscape ? '0.75rem' : '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{spellSpeed}</div>
                                    </div>
                                    <div style={{ position: 'relative', width: '100%', height: '32px', display: 'flex', alignItems: 'center' }}>
                                        {renderTicks(['quick', 'fast', 'normal', 'careful', 'thorough'])}
                                        <input
                                            type="range"
                                            min="0"
                                            max="4"
                                            step="1"
                                            value={['quick', 'fast', 'normal', 'careful', 'thorough'].indexOf(spellSpeed)}
                                            onChange={(e) => {
                                                const options = ['quick', 'fast', 'normal', 'careful', 'thorough'];
                                                const val = options[parseInt(e.target.value)];
                                                setSpellSpeed(val);
                                                executeCommand(`change spell ${val} `);
                                                triggerHaptic(15);
                                            }}
                                            className="mobile-slider"
                                            style={{ width: '100%', position: 'relative', zIndex: 2, background: 'transparent' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '5px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                                        <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '1px', fontWeight: 800 }}>ALERTNESS</div>
                                        <div style={{ fontSize: isLandscape ? '0.75rem' : '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{alertness}</div>
                                    </div>
                                    <div style={{ position: 'relative', width: '100%', height: '32px', display: 'flex', alignItems: 'center' }}>
                                        {renderTicks(['norm', 'careful', 'attent', 'vigil', 'parano'])}
                                        <input
                                            type="range"
                                            min="0"
                                            max="4"
                                            step="1"
                                            value={['normal', 'careful', 'attentive', 'vigilant', 'paranoid'].indexOf(alertness)}
                                            onChange={(e) => {
                                                const options = ['normal', 'careful', 'attentive', 'vigilant', 'paranoid'];
                                                const val = options[parseInt(e.target.value)];
                                                setAlertness(val);
                                                executeCommand(`change alert ${val} `);
                                                triggerHaptic(15);
                                            }}
                                            className="mobile-slider"
                                            style={{ width: '100%', position: 'relative', zIndex: 2, background: 'transparent' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="drawer-section" style={{ pointerEvents: 'auto' }}>
                                <div className="section-header">Player Position</div>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between', width: '100%', flexWrap: 'nowrap' }}>
                                    {[
                                        { label: 'sleep', cmd: 'sleep', isHighlighted: playerPosition === 'sleeping' },
                                        { label: 'wake', cmd: 'wake', isHighlighted: playerPosition !== 'sleeping' },
                                        { label: 'rest', cmd: 'rest', isHighlighted: playerPosition === 'resting' },
                                        { label: 'sit', cmd: 'sit', isHighlighted: playerPosition === 'sitting' },
                                        { label: 'stand', cmd: 'stand', isHighlighted: playerPosition === 'standing' },
                                    ].map(item => (
                                        <button
                                            key={item.label}
                                            onClick={() => {
                                                triggerHaptic(20);
                                                executeCommand(item.cmd);
                                                if (item.cmd === 'sleep') setPlayerPosition('sleeping');
                                                else if (item.cmd === 'wake' && playerPosition === 'sleeping') setPlayerPosition('resting');
                                                else if (['rest', 'sit', 'stand'].includes(item.cmd)) {
                                                    const posMap: Record<string, string> = { 'rest': 'resting', 'sit': 'sitting', 'stand': 'standing' };
                                                    setPlayerPosition(posMap[item.cmd]);
                                                }
                                            }}
                                            style={{
                                                height: '32px',
                                                padding: '0 2px',
                                                borderRadius: '6px',
                                                border: item.isHighlighted ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
                                                background: item.isHighlighted ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                                                color: item.isHighlighted ? 'var(--accent)' : '#fff',
                                                fontSize: '0.55rem',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flex: 1,
                                                minWidth: '0'
                                            }}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
