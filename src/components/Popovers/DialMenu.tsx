import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CustomButton } from '../../types';
import { canonicalizeCategoryId } from '../../utils/categorizationUtils';
import { CircleHelp } from 'lucide-react';

interface DialMenuProps {
    setId: string | string[];
    initialX: number;
    initialY: number;
    buttons: CustomButton[];
    onClose: () => void;
    onExecute: (button: CustomButton, e: PointerEvent) => void;
    triggerHaptic: (ms: number) => void;
    themeColor?: string;
    instruction?: string;
    targetName?: string;
    categoryLabel?: string;
    onHelp?: () => void;
    onTag?: () => void;
}

export const DialMenu: React.FC<DialMenuProps> = ({
    setId,
    initialX,
    initialY,
    buttons,
    onClose,
    onExecute,
    triggerHaptic,
    themeColor,
    instruction,
    targetName,
    categoryLabel,
    onHelp,
    onTag
}) => {
    const menuButtons = useMemo(() => {
        const ids = Array.isArray(setId) ? setId : [setId];
        const seenCommands = new Set<string>();
        const result: CustomButton[] = [];

        // Distribute buttons into buckets by setId to preserve chain order
        ids.forEach(id => {
            const canonicalId = canonicalizeCategoryId(id);
            const setButtons = buttons.filter(b => (
                (b.setId === id || canonicalizeCategoryId(b.setId) === canonicalId) &&
                b.isVisible !== false
            ));
            setButtons.forEach(b => {
                if (!seenCommands.has(b.command)) {
                    seenCommands.add(b.command);
                    result.push(b);
                }
            });
        });
        return result;
    }, [buttons, setId]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const activeIndexRef = useRef<number | null>(null);
    const lastHapticIndex = useRef<number | null>(null);

    const executeButton = useCallback((button: CustomButton, e: PointerEvent | React.PointerEvent) => {
        onExecute(button, e as PointerEvent);
        const isMenu = ['nav', 'menu', 'select-assign', 'select-recipient', 'select-container', 'assign', 'teleport-manage'].includes(button.actionType || '') || button.label === 'Look In';
        if (!isMenu) onClose();
    }, [onExecute, onClose]);

    // Dynamic Layout Calculation - Always centering now
    const layout = useMemo(() => {
        const radius = 96;
        const arcLength = 360;
        const startAngle = -90; // Start from top

        const items = menuButtons.map((_, i) => {
            const angle = startAngle + (i * (arcLength / menuButtons.length));
            const rad = (angle * Math.PI) / 180;
            return {
                angle: (angle + 360) % 360,
                x: Math.cos(rad) * radius,
                y: Math.sin(rad) * radius
            };
        });

        return { items, startAngle, arcLength };
    }, [menuButtons]);

    const getIndexFromPointer = useCallback((e: PointerEvent | React.PointerEvent): number | null => {
        const dx = e.clientX - initialX;
        const dy = e.clientY - initialY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20 || layout.items.length === 0) return null;

        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle < 0) angle += 360;

        let bestIndex: number | null = null;
        let minDiff = Infinity;
        layout.items.forEach((item, i) => {
            let diff = Math.abs(angle - item.angle);
            if (diff > 180) diff = 360 - diff;
            if (diff < minDiff) {
                minDiff = diff;
                bestIndex = i;
            }
        });

        return bestIndex;
    }, [initialX, initialY, layout]);

    useEffect(() => {
        const handleGlobalMove = (e: PointerEvent) => {
            if (e.cancelable) e.preventDefault();
            const bestIndex = getIndexFromPointer(e);

            if (bestIndex === null) {
                if (activeIndexRef.current !== null) {
                    setActiveIndex(null);
                    activeIndexRef.current = null;
                    lastHapticIndex.current = null;
                }
                return;
            }

            if (bestIndex !== activeIndexRef.current) {
                setActiveIndex(bestIndex);
                activeIndexRef.current = bestIndex;
                if (lastHapticIndex.current !== bestIndex) {
                    triggerHaptic(10);
                    lastHapticIndex.current = bestIndex;
                }
            }
        };

        const handleGlobalUp = (e: PointerEvent) => {
            if (e.cancelable) e.preventDefault();
            const target = e.target instanceof Element ? e.target : null;
            if (target?.closest('.dial-menu-header-action')) return;

            const releaseIndex = getIndexFromPointer(e);
            const indexToExecute = releaseIndex ?? activeIndexRef.current;
            if (indexToExecute !== null && menuButtons[indexToExecute]) {
                executeButton(menuButtons[indexToExecute], e);
            } else {
                onClose();
            }
        };

        window.addEventListener('pointermove', handleGlobalMove, true);
        window.addEventListener('pointerup', handleGlobalUp, true);

        return () => {
            window.removeEventListener('pointermove', handleGlobalMove, true);
            window.removeEventListener('pointerup', handleGlobalUp, true);
        };
    }, [menuButtons, onClose, executeButton, triggerHaptic, getIndexFromPointer]);

    if (!menuButtons || menuButtons.length === 0) {
        return (
            <div className="dial-menu-overlay" onPointerUp={onClose} onPointerDown={onClose}>
                <div className="dial-menu-center" style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'var(--bg-panel, rgba(0,0,0,0.8))',
                    padding: '20px',
                    borderRadius: '20px',
                    color: 'var(--text-primary, #fff)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}>
                    <div style={{ opacity: 0.5, marginBottom: '4px' }}>Empty Set</div>
                    <div style={{ fontSize: '0.8rem' }}>{setId}</div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="dial-menu-overlay"
            onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }}
        >
            <div className="dial-menu-center" style={{
                position: 'fixed',
                top: (initialY !== undefined && !isNaN(initialY)) ? `${initialY}px` : '50%',
                left: (initialX !== undefined && !isNaN(initialX)) ? `${initialX}px` : '50%',
                transform: 'translate(-50%, -50%)',
                '--accent': themeColor || 'var(--set-accent, var(--accent))'
            } as any}>
                {(targetName || categoryLabel) && (
                    <div
                        className="dial-menu-header"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onPointerUp={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <div className="dial-menu-header-copy">
                            {targetName && <div className="dial-menu-title">{targetName}</div>}
                            <div className="dial-menu-subtitle">
                                {categoryLabel && <span>{categoryLabel}</span>}
                                <span>{instruction || 'select to fire'}</span>
                            </div>
                        </div>
                        <div className="dial-menu-header-actions">
                            {targetName && onHelp && (
                                <button
                                    type="button"
                                    className="dial-menu-header-action"
                                    title={`Help for ${targetName}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onHelp();
                                    }}
                                >
                                    <CircleHelp size={14} />
                                </button>
                            )}
                            {onTag && (
                                <button
                                    type="button"
                                    className="dial-menu-header-action dial-menu-tag-action"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTag();
                                    }}
                                >
                                    TAG
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <div className="dial-selection-center" style={{
                    '--accent': themeColor || 'var(--set-accent, var(--accent))',
                    width: '120px',
                    height: '120px',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                } as any}>
                    {activeIndex !== null && menuButtons[activeIndex] ? (
                        <div className="dial-center-highlight">
                            <div className="dial-center-label">{menuButtons[activeIndex].label}</div>
                            {targetName && <div className="dial-center-target">{targetName}</div>}
                        </div>
                    ) : (
                        <div className="dial-center-placeholder">
                            <div className="dial-center-icon" style={{ opacity: 0.3, background: 'var(--input-bg, rgba(255,255,255,0.1))', color: 'var(--text-primary, #fff)', boxShadow: 'none' }}>...</div>
                            <div style={{ fontSize: '0.62rem', opacity: 0.7, textTransform: 'uppercase', fontWeight: 800, marginTop: '4px', maxWidth: '100px', lineHeight: 1.1 }}>{instruction || 'Select'}</div>
                        </div>
                    )}
                </div>
                <div className="dial-menu-ring">
                    {menuButtons.map((button, i) => {
                        const item = layout.items[i];
                        return (
                            <div
                                key={button.id}
                                className={`dial-item ${activeIndex === i ? 'active' : ''}`}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveIndex(i);
                                    activeIndexRef.current = i;
                                    triggerHaptic(10);
                                }}
                                style={{
                                    transform: `translate(-50%, -50%) translate(${item.x}px, ${item.y}px)`,
                                    '--accent': themeColor || 'var(--set-accent, var(--accent))'
                                } as any}
                            >
                                <div className="dial-item-label">{button.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
