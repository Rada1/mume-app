import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CustomButton } from '../../types';

interface DialMenuProps {
    setId: string;
    initialX: number;
    initialY: number;
    buttons: CustomButton[];
    onClose: () => void;
    onExecute: (button: CustomButton, e: PointerEvent) => void;
    triggerHaptic: (ms: number) => void;
    themeColor?: string;
}

export const DialMenu: React.FC<DialMenuProps> = ({
    setId,
    initialX,
    initialY,
    buttons,
    onClose,
    onExecute,
    triggerHaptic,
    themeColor
}) => {
    const menuButtons = useMemo(() => buttons.filter(b => b.setId === setId && b.isVisible !== false), [buttons, setId]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const activeIndexRef = useRef<number | null>(null);
    const lastHapticIndex = useRef<number | null>(null);

    // Dynamic Layout Calculation - Always centering now
    const layout = useMemo(() => {
        const radius = 130; // Slightly larger for center display
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

    useEffect(() => {
        const handleGlobalMove = (e: PointerEvent) => {
            if (e.cancelable) e.preventDefault();
            const dx = e.clientX - initialX;
            const dy = e.clientY - initialY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 20) {
                if (activeIndexRef.current !== null) {
                    setActiveIndex(null);
                    activeIndexRef.current = null;
                    lastHapticIndex.current = null;
                }
                return;
            }

            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;

            let bestIndex: number | null = null;
            let minDiff = Infinity;

            if (layout.items.length > 0) {
                layout.items.forEach((item, i) => {
                    let diff = Math.abs(angle - item.angle);
                    if (diff > 180) diff = 360 - diff;
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestIndex = i;
                    }
                });
            }

            if (bestIndex !== activeIndexRef.current) {
                setActiveIndex(bestIndex);
                activeIndexRef.current = bestIndex;
                if (bestIndex !== null && lastHapticIndex.current !== bestIndex) {
                    triggerHaptic(10);
                    lastHapticIndex.current = bestIndex;
                }
            }
        };

        const handleGlobalUp = (e: PointerEvent) => {
            if (e.cancelable) e.preventDefault();
            if (activeIndexRef.current !== null && menuButtons[activeIndexRef.current]) {
                onExecute(menuButtons[activeIndexRef.current], e);
            }
            onClose();
        };

        window.addEventListener('pointermove', handleGlobalMove, true);
        window.addEventListener('pointerup', handleGlobalUp, true);

        return () => {
            window.removeEventListener('pointermove', handleGlobalMove, true);
            window.removeEventListener('pointerup', handleGlobalUp, true);
        };
    }, [initialX, initialY, menuButtons, onClose, onExecute, triggerHaptic, layout]);

    if (!menuButtons || menuButtons.length === 0) {
        return (
            <div className="dial-menu-overlay" onPointerUp={onClose} onPointerDown={onClose}>
                <div className="dial-menu-center" style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '20px',
                    borderRadius: '20px',
                    color: '#fff',
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
                top: 'var(--wheel-center-y, 50%)',
                left: 'var(--wheel-center-x, 50%)',
                transform: 'translate(-50%, -50%)'
            } as any}>
                <div className="dial-selection-center" style={{
                    '--accent': (activeIndex !== null && menuButtons[activeIndex]) ? (menuButtons[activeIndex].style.borderColor || menuButtons[activeIndex].style.backgroundColor || themeColor || 'var(--set-accent, var(--accent))') : 'rgba(255,255,255,0.2)',
                    width: '120px',
                    height: '120px',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                } as any}>
                    {activeIndex !== null && menuButtons[activeIndex] ? (
                        <div className="dial-center-highlight">
                            <div className="dial-center-icon">
                                {menuButtons[activeIndex].icon ? (
                                    <img src={menuButtons[activeIndex].icon} style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain', transform: `scale(${menuButtons[activeIndex].style.iconScale || 1})` }} alt="" />
                                ) : (
                                    menuButtons[activeIndex].label.length <= 3 ? menuButtons[activeIndex].label : menuButtons[activeIndex].label.substring(0, 2)
                                )}
                            </div>
                            <div className="dial-center-label">{menuButtons[activeIndex].label}</div>
                        </div>
                    ) : (
                        <div className="dial-center-placeholder">
                            <div className="dial-center-icon" style={{ opacity: 0.3, background: 'rgba(255,255,255,0.1)', color: '#fff', boxShadow: 'none' }}>...</div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase', fontWeight: 800 }}>Select</div>
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
                                style={{
                                    transform: `translate(-50%, -50%) translate(${item.x}px, ${item.y}px)`,
                                    '--accent': button.style.borderColor || button.style.backgroundColor || themeColor || 'var(--set-accent, var(--accent))'
                                } as any}
                            >
                                <div className="dial-item-icon">
                                    {button.icon ? (
                                        <img src={button.icon} style={{ maxWidth: '75%', maxHeight: '75%', objectFit: 'contain', transform: `scale(${button.style.iconScale || 1})` }} alt="" />
                                    ) : (
                                        button.label.length <= 3 ? button.label : button.label.substring(0, 2)
                                    )}
                                </div>
                                <div className="dial-item-label">{button.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
