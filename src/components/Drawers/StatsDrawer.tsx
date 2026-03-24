import React, { useMemo } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { CombatSliderPopout } from './StatsDrawer/CombatSliderPopout';
import { EffectIndicators } from './StatsDrawer/EffectIndicators';

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
    const [activeSlider, setActiveSlider] = React.useState<'mood' | 'spell' | 'alert' | 'pos' | null>(null);
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
                    const spell = text.substring(2).trim();
                    if (!spells.some(s => s.toLowerCase() === spell.toLowerCase())) {
                        spells.push(spell);
                    }
                } else if (text.length > 0) {
                    inSpellsSection = false;
                }
            }
        }

        // 2. Check modern characterInfo.affectedBy
        if (characterInfo?.affectedBy) {
            characterInfo.affectedBy.forEach(s => {
                if (!spells.some(existing => existing.toLowerCase() === s.toLowerCase())) {
                    spells.push(s);
                }
            });
        }

        return spells;
    }, [statsLines, characterInfo?.affectedBy]);


    return (
        <div
            className={`stats-drawer log-card-drawer left-drawer ${isOpen ? 'open' : ''} ${isLandscape ? 'landscape-mode' : ''}`}
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
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - (startY || 0);
                    const absX = Math.abs(deltaX);
                    const absY = Math.abs(deltaY);
                    
                    // Swipe down OR swipe left to close (since it's on the left edge)
                    if ((deltaY > 50 && absY > absX) || (deltaX < -40 && absX > absY)) {
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
                    background: 'rgba(10, 13, 21, 0.65)',
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

                    <span style={{ fontWeight: '900', fontSize: '0.75rem', letterSpacing: '1.5px', color: '#ffffff', textTransform: 'uppercase' }}>Combat Stats</span>
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

                            <div className="drawer-section" style={{ pointerEvents: 'auto', marginBottom: '15px', padding: '10px 15px' }}>
                                <div className="section-header">Affected By</div>
                                <EffectIndicators activeSpells={activeSpells} stats={stats} />
                            </div>

                        </div>

                        {/* RIGHT COLUMN (or Bottom in Portrait) */}
                        <div className="drawer-col-right" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Combat Percentages Section */}
                            <div className="drawer-section" style={{ pointerEvents: 'auto', marginBottom: '10px', padding: '10px 15px' }}>
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
                                            <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '0px', fontWeight: 800 }}>{stat.label}</div>
                                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: '#4ade80', fontWeight: 'bold', marginTop: '-1px' }}>{stat.value !== undefined ? `${stat.value}%` : '--'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="drawer-section" style={{ pointerEvents: 'auto', marginBottom: '10px', padding: '10px 15px', position: 'relative' }}>
                                <div className="section-header">Combat Settings</div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', position: 'relative' }}>
                                    {/* MOOD */}
                                    <div 
                                        style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '6px 4px', borderRadius: '8px', textAlign: 'center', position: 'relative', zIndex: activeSlider === 'mood' ? 101 : 1 }}
                                        onClick={() => { triggerHaptic(10); setActiveSlider(activeSlider === 'mood' ? null : 'mood'); }}
                                    >
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, marginBottom: '2px' }}>MOOD</div>
                                        <div style={{ fontSize: '0.7rem', color: mood === 'berserk' ? '#f87171' : 'var(--accent)', fontWeight: 'bold' }}>{mood === 'berserk' ? 'BERSERK' : mood.toUpperCase()}</div>
                                        {activeSlider === 'mood' && (
                                            <CombatSliderPopout 
                                                label="SET MOOD"
                                                value={mood}
                                                options={['wimpy', 'prudent', 'normal', 'brave', 'aggressive', 'berserk']}
                                                onSelect={(val) => {
                                                    setMood(val);
                                                    executeCommand(`change mood ${val} `);
                                                    triggerHaptic(15);
                                                }}
                                                onClose={() => setActiveSlider(null)}
                                                triggerHaptic={triggerHaptic}
                                            />
                                        )}
                                    </div>

                                    {/* SPELL SPEED */}
                                    <div 
                                        style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '6px 4px', borderRadius: '8px', textAlign: 'center', position: 'relative', zIndex: activeSlider === 'spell' ? 101 : 1 }}
                                        onClick={() => { triggerHaptic(10); setActiveSlider(activeSlider === 'spell' ? null : 'spell'); }}
                                    >
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, marginBottom: '2px' }}>SPEED</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 'bold' }}>{spellSpeed.toUpperCase()}</div>
                                        {activeSlider === 'spell' && (
                                            <CombatSliderPopout 
                                                label="SPELL SPEED"
                                                value={spellSpeed}
                                                options={['quick', 'fast', 'normal', 'careful', 'thorough']}
                                                onSelect={(val) => {
                                                    setSpellSpeed(val);
                                                    executeCommand(`change spell ${val} `);
                                                    triggerHaptic(15);
                                                }}
                                                onClose={() => setActiveSlider(null)}
                                                triggerHaptic={triggerHaptic}
                                            />
                                        )}
                                    </div>

                                    {/* ALERTNESS */}
                                    <div 
                                        style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '6px 4px', borderRadius: '8px', textAlign: 'center', position: 'relative', zIndex: activeSlider === 'alert' ? 101 : 1 }}
                                        onClick={() => { triggerHaptic(10); setActiveSlider(activeSlider === 'alert' ? null : 'alert'); }}
                                    >
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, marginBottom: '2px' }}>ALERT</div>
                                        <div style={{ fontSize: '0.7rem', color: alertness === 'paranoid' ? '#fbbf24' : 'var(--accent)', fontWeight: 'bold' }}>{alertness.toUpperCase()}</div>
                                        {activeSlider === 'alert' && (
                                            <CombatSliderPopout 
                                                label="ALERTNESS"
                                                value={alertness}
                                                options={['normal', 'careful', 'attentive', 'vigilant', 'paranoid']}
                                                onSelect={(val) => {
                                                    setAlertness(val);
                                                    executeCommand(`change alert ${val} `);
                                                    triggerHaptic(15);
                                                }}
                                                onClose={() => setActiveSlider(null)}
                                                triggerHaptic={triggerHaptic}
                                            />
                                        )}
                                    </div>

                                    {/* PLAYER POSITION */}
                                    <div 
                                        style={{ flex: 1, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '6px 2px', borderRadius: '8px', textAlign: 'center', position: 'relative', zIndex: activeSlider === 'pos' ? 101 : 1 }}
                                        onClick={() => { triggerHaptic(10); setActiveSlider(activeSlider === 'pos' ? null : 'pos'); }}
                                    >
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, marginBottom: '2px', whiteSpace: 'nowrap' }}>POS</div>
                                        <div style={{ fontSize: '0.62rem', color: playerPosition === 'standing' ? 'var(--accent)' : '#94a3b8', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playerPosition.toUpperCase()}</div>
                                        {activeSlider === 'pos' && (
                                            <CombatSliderPopout 
                                                label="POSITION"
                                                value={playerPosition}
                                                options={['sleeping', 'sitting', 'resting', 'standing']}
                                                onSelect={(val, idx) => {
                                                    if (playerPosition === 'sleeping' && idx > 0) {
                                                        executeCommand('wake');
                                                    }
                                                    setPlayerPosition(val);
                                                    executeCommand(val === 'sleeping' ? 'sleep' : val === 'resting' ? 'rest' : val === 'sitting' ? 'sit' : 'stand');
                                                    triggerHaptic(15);
                                                }}
                                                onClose={() => setActiveSlider(null)}
                                                triggerHaptic={triggerHaptic}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
