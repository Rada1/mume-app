import React, { useMemo, useState } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { CombatSliderPopout } from './StatsDrawer/CombatSliderPopout';
import { EffectIndicators } from './StatsDrawer/EffectIndicators';
import { CombatSettingControl } from './StatsDrawer/CombatSettingControl';

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
        triggerHaptic, inCombat
    } = useGame();
    const [activeSlider, setActiveSlider] = useState<'mood' | 'spell' | 'alert' | null>(null);
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
                        if (!viewport.isMobile) onClose();
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
                        <CombatSettingControl
                            id="mood"
                            label="MOOD"
                            value={mood}
                            options={['wimpy', 'prudent', 'normal', 'brave', 'aggressive', 'berserk']}
                            isActive={activeSlider === 'mood'}
                            activeButtonRect={activeButtonRect}
                            activeColor={mood === 'berserk' ? '#f87171' : 'var(--accent)'}
                            onToggle={(e) => {
                                triggerHaptic(10); 
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveButtonRect(rect);
                                setActiveSlider(activeSlider === 'mood' ? null : 'mood'); 
                            }}
                            onSelect={(val) => {
                                setMood(val);
                                executeCommand(`change mood ${val} `);
                                triggerHaptic(15);
                            }}
                            onClose={() => setActiveSlider(null)}
                            triggerHaptic={triggerHaptic}
                            gridColumn="1"
                            gridRow="1"
                        />

                        {/* Right: Potential Stats (Col 2, Row 1-4) - We'll keep it next to Mood */}
                        <div style={{ 
                            display: 'flex',
                            flexWrap: 'nowrap',
                            gap: '4px',
                            background: 'rgb(0, 0, 0)',
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
                        <CombatSettingControl
                            id="spell"
                            label="SPEED"
                            value={spellSpeed}
                            options={['quick', 'fast', 'normal', 'careful', 'thorough']}
                            isActive={activeSlider === 'spell'}
                            activeButtonRect={activeButtonRect}
                            activeColor="var(--accent)"
                            onToggle={(e) => {
                                triggerHaptic(10); 
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveButtonRect(rect);
                                setActiveSlider(activeSlider === 'spell' ? null : 'spell'); 
                            }}
                            onSelect={(val) => {
                                setSpellSpeed(val);
                                executeCommand(`change spell ${val} `);
                                triggerHaptic(15);
                            }}
                            onClose={() => setActiveSlider(null)}
                            triggerHaptic={triggerHaptic}
                            gridColumn="1"
                            gridRow="2"
                        />

                        {/* ALERT (Col 1, Row 3) */}
                        <CombatSettingControl
                            id="alert"
                            label="ALERT"
                            value={alertness}
                            options={['normal', 'careful', 'attentive', 'vigilant', 'paranoid']}
                            isActive={activeSlider === 'alert'}
                            activeButtonRect={activeButtonRect}
                            activeColor={alertness === 'paranoid' ? '#fbbf24' : 'var(--accent)'}
                            onToggle={(e) => {
                                triggerHaptic(10); 
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveButtonRect(rect);
                                setActiveSlider(activeSlider === 'alert' ? null : 'alert'); 
                            }}
                            onSelect={(val) => {
                                setAlertness(val);
                                executeCommand(`change alert ${val} `);
                                triggerHaptic(15);
                            }}
                            onClose={() => setActiveSlider(null)}
                            triggerHaptic={triggerHaptic}
                            gridColumn="1"
                            gridRow="3"
                        />

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
