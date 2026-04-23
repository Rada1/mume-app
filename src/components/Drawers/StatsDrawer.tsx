import { StatsView } from './Views/StatsView';
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

    // Refresh commands are fired by handleTabClick when the drawer opens.
    // No useEffect needed here — firing again would double-send commands
    // and race with the tab-click commands on rapid drawer switching.

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

                               <StatsView
                    statsLines={statsLines}
                    scoreLines={scoreLines}
                    executeCommand={propsExecuteCommand}
                    mood={mood} setMood={setMood}
                    spellSpeed={spellSpeed} setSpellSpeed={setSpellSpeed}
                    alertness={alertness} setAlertness={setAlertness}
                    triggerHaptic={triggerHaptic}
                    activeSlider={activeSlider} setActiveSlider={setActiveSlider}
                    activeButtonRect={activeButtonRect} setActiveButtonRect={setActiveButtonRect}
                />
            </div>
        </div>
    );
};
