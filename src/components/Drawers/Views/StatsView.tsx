import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DrawerLine } from '../../../types';
import { CombatSettingControl } from '../StatsDrawer/CombatSettingControl';
import { sanitizeMumeHtml } from '../../../utils/securityUtils';

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
    statsLines,
    scoreLines,
    executeCommand,
    mood, setMood,
    spellSpeed, setSpellSpeed,
    alertness, setAlertness,
    triggerHaptic,
    activeSlider, setActiveSlider,
    activeButtonRect, setActiveButtonRect
}) => {
    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div className="drawer-section" data-drawer-section="stats">
                <div style={{ padding: '0 12px' }}>
                    {/* 1. Score / Info Section */}
                    {scoreLines.length > 0 && (
                        <div className="stats-block" style={{ marginBottom: '16px' }}>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                margin: '0.5px 0',
                                padding: '1px 8px',
                                color: '#ffffff',
                                opacity: 0.9
                            }}>score</div>
                            {scoreLines.map(line => (
                                <div
                                    key={line.id}
                                    style={{
                                        background: 'rgba(0, 0, 0, 0.6)',
                                        borderRadius: '4px',
                                        margin: '0.5px 0',
                                        padding: '1px 8px',
                                        width: '100%',
                                        display: 'block',
                                        whiteSpace: 'pre',
                                        boxSizing: 'border-box'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html.trim()) }}
                                />
                            ))}
                        </div>
                    )}

                    {/* 2. Stats / Combat Section */}
                    {statsLines.length > 0 ? (
                        <div className="stats-block">
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                margin: '0.5px 0',
                                padding: '1px 8px',
                                color: '#ffffff',
                                opacity: 0.9
                            }}>stat</div>
                            {statsLines.map(line => {
                                const lowerText = line.text.toLowerCase().trim();
                                if (lowerText === '[stat]' || lowerText === '[at]' || lowerText === 'at' || lowerText === 'ok.') return null;

                                return (
                                    <div
                                        key={line.id}
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.6)',
                                            borderRadius: '4px',
                                            margin: '0.5px 0',
                                            padding: '1px 8px',
                                            width: '100%',
                                            display: 'block',
                                            whiteSpace: 'pre',
                                            boxSizing: 'border-box'
                                        }}
                                        dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(line.html.trim()) }}
                                    />
                                );
                            })}
                            <div style={{ height: '50px', flexShrink: 0 }} />
                        </div>
                    ) : (
                        scoreLines.length === 0 && (
                            <div className="empty-stats" style={{
                                textAlign: 'center',
                                color: 'rgba(255, 255, 255, 0.3)',
                                fontSize: '0.9rem',
                                marginTop: '40px',
                                fontStyle: 'italic'
                            }}>
                                No character stats data captured. Tap refresh to update.
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Bottom Section: Action Buttons in Floating Tabs style */}
            <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                right: '12px',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
                zIndex: 100,
                pointerEvents: 'none'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                    pointerEvents: 'auto',
                    maxWidth: '90%'
                }}>
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
                title="Refresh Stats"
                onClick={(e) => {
                    triggerHaptic(15);
                    console.log('[StatsDrawer] Manual refresh triggered (stat, score, info %m)');
                    executeCommand('stat', true, true, true, true);
                    executeCommand('score', true, true, true, true);
                    executeCommand('info %m', true, true, true, true);
                }}
                style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    zIndex: 110,
                    background: 'rgba(40, 40, 45, 0.4)',
                    backdropFilter: 'blur(10px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(160%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.8)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    pointerEvents: 'auto'
                }}
            >
                <RefreshCw size={16} />
            </button>
        </div>
    );
};
