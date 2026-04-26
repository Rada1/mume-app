/**
 * @file StatsView.tsx
 * @description Renders the player's stats and score.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DrawerLine } from '../../../types';
import { useStatsLines } from '../../../hooks/drawers/useStatsLines';
import { LineItem } from '../LineItem';
import { CombatSettingControl } from '../StatsDrawer/CombatSettingControl';

interface StatsViewProps {
    statsLines: DrawerLine[];
    scoreLines: DrawerLine[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    mood: string;
    setMood: (val: string) => void;
    spellSpeed: string;
    setSpellSpeed: (val: string) => void;
    alertness: string;
    setAlertness: (val: string) => void;
    triggerHaptic: (intensity: number) => void;
    activeSlider: string | null;
    setActiveSlider: (val: any) => void;
    activeButtonRect: DOMRect | null;
    setActiveButtonRect: (val: DOMRect | null) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
    statsLines: rawStats,
    scoreLines: rawScore,
    executeCommand,
    mood, setMood,
    spellSpeed, setSpellSpeed,
    alertness, setAlertness,
    triggerHaptic,
    activeSlider, setActiveSlider,
    activeButtonRect, setActiveButtonRect
}) => {
    const { statsLines: processedStats, scoreLines: processedScore } = useStatsLines({
        statsLines: rawStats,
        scoreLines: rawScore
    });

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div className="drawer-section" data-drawer-section="stats">
                <div style={{ padding: '0 12px' }}>
                    {/* Score Section */}
                    {processedScore.length > 0 && (
                        <div className="stats-block" style={{ marginBottom: '16px' }}>
                            <div className="section-label" style={{ opacity: 0.6, fontSize: '0.8rem', padding: '4px 8px' }}>score</div>
                            {processedScore.map(line => (
                                <LineItem key={line.id} line={line} />
                            ))}
                        </div>
                    )}

                    {/* Stats Section */}
                    {processedStats.length > 0 ? (
                        <div className="stats-block">
                            <div className="section-label" style={{ opacity: 0.6, fontSize: '0.8rem', padding: '4px 8px' }}>stat</div>
                            {processedStats.map(line => (
                                <LineItem key={line.id} line={line} />
                            ))}
                            <div style={{ height: '50px', flexShrink: 0 }} />
                        </div>
                    ) : (
                        processedScore.length === 0 && (
                            <div className="empty-stats" style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.3)', marginTop: '40px', fontStyle: 'italic' }}>
                                No character stats data captured. Tap refresh to update.
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Combat Controls */}
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', gap: '6px', pointerEvents: 'auto' }}>
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
                    />
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
                    />
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
                    />
                </div>
            </div>

            <button
                className="refresh-button floating-refresh"
                onClick={() => {
                    triggerHaptic(15);
                    executeCommand('stat', true, true, true, true);
                    executeCommand('score', true, true, true, true);
                    executeCommand('info %m', true, true, true, true);
                }}
                style={{
                    position: 'absolute', bottom: '8px', right: '8px', zIndex: 110,
                    background: 'rgba(40, 40, 45, 0.4)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
                    width: '32px', height: '32px', borderRadius: '16px', cursor: 'pointer'
                }}
            >
                <RefreshCw size={16} />
            </button>
        </div>
    );
};
