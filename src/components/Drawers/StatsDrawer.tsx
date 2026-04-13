import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useGame, useVitals } from '../../context/GameContext';
import { DrawerLine } from '../../types';
import { CombatSliderPopout } from './StatsDrawer/CombatSliderPopout';
import { CombatSettingControl } from './StatsDrawer/CombatSettingControl';
import { isObjectSelected } from '../../utils/selectionUtils';
import { getCategoryForName } from '../../utils/categorizationUtils';
import { sanitizeMumeHtml } from '../../utils/securityUtils';

interface CharacterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    statsLines: DrawerLine[];
    scoreLines: DrawerLine[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    isLandscape?: boolean;
}

export const StatsDrawer: React.FC<CharacterDrawerProps> = ({
    isOpen,
    onClose,
    statsLines,
    scoreLines = [],
    executeCommand: propsExecuteCommand,
    isLandscape = false
}) => {
    const {
        mood, setMood, spellSpeed, setSpellSpeed, alertness, setAlertness,
        triggerHaptic, 
        handleLogPointerDown,
        handleLogPointerUp,
        handleLogClick,
        selectedObjectIds,
        clearObjectSelection,
        executeCommand: contextExecuteCommand
    } = useGame();
    const executeCommand = contextExecuteCommand || propsExecuteCommand;
    const [activeSlider, setActiveSlider] = useState<'mood' | 'spell' | 'alert' | null>(null);
    const [activeButtonRect, setActiveButtonRect] = useState<DOMRect | null>(null);

    const drawerRef = useRef<HTMLDivElement>(null);
    const infoContainerRef = useRef<HTMLDivElement>(null);
    const [infoFontSize, setInfoFontSize] = useState<string>('var(--dynamic-log-size, 16px)');
    const swipePos = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        if (!infoContainerRef.current) return;
        const measure = () => {
            const width = infoContainerRef.current?.clientWidth;
            // Scale font so 80 monospace chars fit safely within the container
            if (width) setInfoFontSize(`${(width - 24) / 48}px`);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(infoContainerRef.current);
        return () => ro.disconnect();
    }, [isOpen]);

    // Silent refresh on open: old lines stay visible until new capture swaps in
    useEffect(() => {
        if (!isOpen) return;
        executeCommand('stat', true, true, true, true);
        const t1 = setTimeout(() => executeCommand('score', true, true, true, true), 100);
        const t2 = setTimeout(() => executeCommand('info %m', true, true, true, true), 200);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isOpen, executeCommand]);

    const onPointerDownInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        const container = e.currentTarget as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT' || target.closest('.drawer-tab')) {
            if (target.closest('.inline-btn')) handleLogPointerDown(e);
            return;
        }
        swipePos.current = { x: e.clientX, y: e.clientY };
        container.setPointerCapture(e.pointerId);
    };

    const onPointerUpInternal = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('.inline-btn') || target.tagName === 'INPUT' || target.closest('.drawer-tab')) {
            if (target.closest('.inline-btn')) handleLogPointerUp(e);
            return;
        }
        if (swipePos.current) {
            const deltaX = e.clientX - swipePos.current.x;
            const deltaY = e.clientY - swipePos.current.y;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if ((deltaY > 50 && absY > absX) || (deltaX < -40 && absX > absY)) {
                onClose();
            }
        }
        swipePos.current = null;
    };

    const onClickInternal = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.inline-btn') as HTMLElement;
        if (btn) {
            handleLogClick(e);
        } else if (!target.closest('.drawer-tab')) {
            if (selectedObjectIds.size > 0) {
                clearObjectSelection();
                triggerHaptic(20);
            } else if (e.target === e.currentTarget) {
                onClose();
            }
        }
    };

    return (
        <div 
            className={`character-drawer-overlay ${isOpen ? 'open' : ''}`}
            onClick={(e) => { if (e.target === e.currentTarget && window.innerWidth > 1024) onClose(); }}
        >
            <div
                ref={drawerRef}
                className={`stats-drawer log-card-drawer left-drawer ${isOpen ? 'open' : ''}`}
                onPointerDown={onPointerDownInternal}
                onPointerUp={onPointerUpInternal}
                onPointerCancel={onPointerUpInternal}
                onClick={onClickInternal}
                style={{ touchAction: 'pan-y' }}
            >
                <div className="drawer-header" style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', background: 'transparent' }}>
                    {window.innerWidth > 1024 && (
                        <button 
                            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} 
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="drawer-body" style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: 0, 
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div ref={infoContainerRef} style={{
                        fontFamily: 'var(--font-main, monospace)',
                        fontSize: infoFontSize,
                        lineHeight: '1.5',
                        padding: '8px 12px',
                        flex: 1,
                        textAlign: 'left'
                    }}>
                        {/* 1. Score / Vitals Section */}
                        {scoreLines.length > 0 && (
                            <div className="info-block" style={{ marginBottom: '16px' }}>
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
                                    // Skip redundant tags that keep getting captured
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
        </div>
    );
};
