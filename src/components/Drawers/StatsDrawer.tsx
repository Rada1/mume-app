import React, { useMemo, useState } from 'react';
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
    const [activeSlider, setActiveSlider] = useState<'mood' | 'spell' | 'alert' | 'pos' | null>(null);
    const [activeButtonRect, setActiveButtonRect] = useState<DOMRect | null>(null);
    const { stats, characterInfo } = useVitals();

    const activeSpells = useMemo(() => {
        const spells: string[] = [];
        let inSpellsSection = false;
        
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
                padding: isLandscape ? '5px 15px 40px 15px' : '20px 15px 40px 15px', 
                position: 'relative', 
                touchAction: 'pan-y',
                display: 'flex',
                flexDirection: 'column'
            }}>
                
                <div className="inner-container" style={{ 
                    flex: 1, 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                }}>
                    {/* Top Section: Settings & Potential in Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '90px 1fr',
                        gap: '4px 6px',
                        alignItems: 'stretch',
                        paddingTop: '5px'
                    }}>
                        {/* MOOD (Col 1, Row 1) */}
                        <div 
                            style={{ 
                                cursor: 'pointer', 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '1px 6px', 
                                borderRadius: '10px', 
                                textAlign: 'center', 
                                position: 'relative', 
                                zIndex: activeSlider === 'mood' ? 101 : 1, 
                                border: '1px solid rgba(255,255,255,0.05)',
                                minHeight: '34px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gridColumn: '1',
                                gridRow: '1',
                                boxSizing: 'border-box'
                            }}
                            onClick={(e) => { 
                                triggerHaptic(10); 
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveButtonRect(rect);
                                setActiveSlider(activeSlider === 'mood' ? null : 'mood'); 
                            }}
                        >
                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1' }}>MOOD</div>
                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: mood === 'berserk' ? '#f87171' : 'var(--accent)', fontWeight: '900', letterSpacing: '0.3px', marginTop: '0px', lineHeight: '1' }}>{mood.toUpperCase()}</div>

                            {activeSlider === 'mood' && activeButtonRect && (
                                <CombatSliderPopout 
                                    label="SET MOOD"
                                    value={mood}
                                    options={['wimpy', 'prudent', 'normal', 'brave', 'aggressive', 'berserk']}
                                    anchorRect={activeButtonRect}
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

                        {/* Right: Potential Stats (Col 2, Row 1-4) - We'll keep it next to Mood */}
                        <div style={{ 
                            display: 'flex',
                            flexWrap: 'nowrap',
                            gap: '4px',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '1px 8px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            justifyContent: 'space-around',
                            gridRow: '1',
                            gridColumn: '2',
                            minHeight: '34px',
                            alignItems: 'center',
                            boxSizing: 'border-box'
                        }}>
                            {[
                                { label: 'OB', value: stats.ob },
                                { label: 'DB', value: stats.db },
                                { label: 'PB', value: stats.pb },
                                { label: 'ARM', value: stats.armour }
                            ].map(stat => {
                                const valStr = stat.value !== undefined ? String(stat.value) : '--';
                                return (
                                    <div key={stat.label} style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        flex: 1
                                    }}>
                                        <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1' }}>{stat.label}</div>
                                        <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: '#4ade80', fontWeight: '900', marginTop: '0px', lineHeight: '1' }}>{valStr !== '--' && !valStr.includes('%') ? `${valStr}%` : valStr}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* SPEED (Col 1, Row 2) */}
                        <div 
                            style={{ 
                                cursor: 'pointer', 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '1px 6px', 
                                borderRadius: '10px', 
                                textAlign: 'center', 
                                position: 'relative', 
                                zIndex: activeSlider === 'spell' ? 101 : 1, 
                                border: '1px solid rgba(255,255,255,0.05)',
                                minHeight: '34px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gridColumn: '1',
                                gridRow: '2',
                                boxSizing: 'border-box'
                            }}
                            onClick={(e) => { 
                                triggerHaptic(10); 
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveButtonRect(rect);
                                setActiveSlider(activeSlider === 'spell' ? null : 'spell'); 
                            }}
                        >
                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1' }}>SPEED</div>
                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: 'var(--accent)', fontWeight: '900', letterSpacing: '0.3px', marginTop: '0px', lineHeight: '1' }}>{spellSpeed.toUpperCase()}</div>

                            {activeSlider === 'spell' && activeButtonRect && (
                                <CombatSliderPopout 
                                    label="SPELL SPEED"
                                    value={spellSpeed}
                                    options={['quick', 'fast', 'normal', 'careful', 'thorough']}
                                    anchorRect={activeButtonRect}
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

                        {/* ALERT (Col 1, Row 3) */}
                        <div 
                            style={{ 
                                cursor: 'pointer', 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '1px 6px', 
                                borderRadius: '10px', 
                                textAlign: 'center', 
                                position: 'relative', 
                                zIndex: activeSlider === 'alert' ? 101 : 1, 
                                border: '1px solid rgba(255,255,255,0.05)',
                                minHeight: '34px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gridColumn: '1',
                                gridRow: '3',
                                boxSizing: 'border-box'
                            }}
                            onClick={(e) => { 
                                triggerHaptic(10); 
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveButtonRect(rect);
                                setActiveSlider(activeSlider === 'alert' ? null : 'alert'); 
                            }}
                        >
                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1' }}>ALERT</div>
                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: alertness === 'paranoid' ? '#fbbf24' : 'var(--accent)', fontWeight: '900', letterSpacing: '0.3px', marginTop: '0px', lineHeight: '1' }}>{alertness.toUpperCase()}</div>

                            {activeSlider === 'alert' && activeButtonRect && (
                                <CombatSliderPopout 
                                    label="ALERTNESS"
                                    value={alertness}
                                    options={['normal', 'careful', 'attentive', 'vigilant', 'paranoid']}
                                    anchorRect={activeButtonRect}
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

                        {/* POSITION (Col 1, Row 4) */}
                        <div 
                            style={{ 
                                cursor: 'pointer', 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '1px 6px', 
                                borderRadius: '10px', 
                                textAlign: 'center', 
                                position: 'relative', 
                                pointerEvents: 'auto', 
                                zIndex: activeSlider === 'pos' ? 101 : 1, 
                                border: '1px solid rgba(255,255,255,0.05)',
                                minHeight: '34px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gridColumn: '1',
                                gridRow: '4',
                                boxSizing: 'border-box'
                            }}
                            onClick={(e) => { 
                                triggerHaptic(10); 
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveButtonRect(rect);
                                setActiveSlider(activeSlider === 'pos' ? null : 'pos'); 
                            }}
                        >
                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', lineHeight: '1' }}>POS</div>
                            <div style={{ fontSize: 'var(--dynamic-log-size, 16px)', color: playerPosition === 'standing' ? 'var(--accent)' : '#94a3b8', fontWeight: '900', letterSpacing: '0.3px', marginTop: '0px', lineHeight: '1' }}>{playerPosition.toUpperCase()}</div>

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
                                    }}
                                    onClose={() => setActiveSlider(null)}
                                    triggerHaptic={triggerHaptic}
                                />
                            )}
                        </div>
                    </div>

                    {/* Bottom Section: Affected By */}
                    <div className="drawer-section" style={{ pointerEvents: 'auto', marginTop: 'auto', padding: '15px 0' }}>
                        <div className="section-header" style={{ marginBottom: '12px', fontSize: 'var(--dynamic-log-size, 16px)', fontWeight: '800' }}>Affected By</div>
                        <EffectIndicators activeSpells={activeSpells} stats={stats} />
                    </div>
                </div>
            </div>
        </div>
    );
};
