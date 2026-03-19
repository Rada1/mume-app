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
        
        // 1. Check legacy statsLines
        for (const line of statsLines) {
            const text = line.text.trim();
            if (text.startsWith('Affecting Spells:') || text.startsWith('Affected by:')) {
                inSpellsSection = true;
                continue;
            }
            if (inSpellsSection) {
                if (text.startsWith('- ')) {
                    spells.push(text.substring(2).trim());
                } else if (text.length > 0) {
                    inSpellsSection = false;
                }
            }
        }

        // 2. Check modern characterInfo.affectedBy
        if (characterInfo?.affectedBy) {
            characterInfo.affectedBy.forEach(s => {
                if (!spells.includes(s)) spells.push(s);
            });
        }

        return spells;
    }, [statsLines, characterInfo?.affectedBy]);

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

    const renderAffectedBy = () => {
        const conds = stats.conditions || {};
        const activeConds = Object.keys(conds).filter(k => conds[k]);
        
        if (activeConds.length === 0 && activeSpells.length === 0) {
            return <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>No active effects</div>;
        }

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeConds.map(c => (
                    <div key={c} style={{
                        padding: '3px 8px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '10px',
                        color: '#fca5a5',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                    }}>
                        {c}
                    </div>
                ))}
                {activeSpells.map((s, i) => (
                    <div key={i} style={{
                        padding: '3px 8px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '10px',
                        color: '#93c5fd',
                        fontSize: '0.68rem',
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
                
                <div className="drawer-header" style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 20px',
                    background: 'rgba(10, 13, 21, 0.92)',
                    backdropFilter: 'blur(25px)',
                    WebkitBackdropFilter: 'blur(25px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    margin: '10px 15px 5px 15px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 10
                }}>

                    <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px', color: '#ffffff' }}>Combat Stats</span>
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
                                <div className="section-header">Affected By</div>
                                {renderAffectedBy()}
                            </div>

                        </div>

                        {/* RIGHT COLUMN (or Bottom in Portrait) */}
                        <div className="drawer-col-right" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Combat Percentages Section */}
                            <div className="drawer-section" style={{ pointerEvents: 'auto', marginBottom: '10px', padding: '10px 15px' }}>
                                <div className="section-header" style={{ marginBottom: '6px', paddingBottom: '6px' }}>Combat Potential</div>
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
                                            <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '0px', fontWeight: 800 }}>{stat.label}</div>
                                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: 'var(--accent)', fontWeight: 'bold', marginTop: '-1px' }}>{stat.value !== undefined ? `${stat.value}%` : '--'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="drawer-section" style={{ pointerEvents: 'auto', marginBottom: '10px', padding: '10px 15px' }}>
                                <div className="section-header">Combat Settings</div>
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1px' }}>
                                        <div style={{ fontSize: isLandscape ? '0.65rem' : '0.75rem', color: '#ffffff', letterSpacing: '1px', fontWeight: 800 }}>MOOD</div>
                                        <div style={{ fontSize: isLandscape ? '0.65rem' : '0.75rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{mood === 'berserk' ? 'Berserk' : mood}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ position: 'relative', flex: 1, height: '22px', display: 'flex', alignItems: 'center' }}>
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
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                border: mood === 'berserk' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.15)',
                                                background: mood === 'berserk' ? 'rgba(153, 27, 27, 0.4)' : 'transparent',
                                                color: mood === 'berserk' ? '#fca5a5' : 'rgba(255,255,255,0.7)',
                                                fontSize: '0.52rem',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                height: '20px'
                                            }}
                                        >
                                            BERSERK
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1px' }}>
                                        <div style={{ fontSize: isLandscape ? '0.65rem' : '0.75rem', color: '#ffffff', letterSpacing: '1px', fontWeight: 800 }}>SPELL SPEED</div>
                                        <div style={{ fontSize: isLandscape ? '0.65rem' : '0.75rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{spellSpeed}</div>
                                    </div>
                                    <div style={{ position: 'relative', width: '100%', height: '22px', display: 'flex', alignItems: 'center' }}>
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

                                <div style={{ marginBottom: '1px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1px' }}>
                                        <div style={{ fontSize: isLandscape ? '0.65rem' : '0.75rem', color: '#ffffff', letterSpacing: '1px', fontWeight: 800 }}>ALERTNESS</div>
                                        <div style={{ fontSize: isLandscape ? '0.65rem' : '0.75rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{alertness}</div>
                                    </div>
                                    <div style={{ position: 'relative', width: '100%', height: '22px', display: 'flex', alignItems: 'center' }}>
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
                                                border: item.isHighlighted ? '1px solid #b8860b' : '1px solid rgba(255,255,255,0.1)',
                                                background: item.isHighlighted ? '#b8860b' : 'rgba(255,255,255,0.05)',
                                                color: '#fff',
                                                fontSize: 'calc(var(--dynamic-log-size, 16px) * 0.7)',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flex: 1,
                                                minWidth: '0',
                                                boxShadow: item.isHighlighted ? '0 0 10px rgba(184, 134, 11, 0.3)' : 'none'
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
