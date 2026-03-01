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
}

export const DialMenu: React.FC<DialMenuProps> = ({
    setId,
    initialX,
    initialY,
    buttons,
    onClose,
    onExecute,
    triggerHaptic
}) => {
    const menuButtons = useMemo(() => buttons.filter(b => b.setId === setId && b.isVisible), [buttons, setId]);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const activeIndexRef = useRef<number | null>(null);
    const lastHapticIndex = useRef<number | null>(null);

    // Dynamic Layout Calculation
    const layout = useMemo(() => {
        const radius = 110;
        const itemSize = 60; // Approximate size of a dial item
        const margin = 20;
        const safeMargin = (itemSize / 2) + margin;

        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const spaceLeft = initialX;
        const spaceRight = winW - initialX;
        const spaceTop = initialY;
        const spaceBottom = winH - initialY;

        let startAngle = 0;
        let arcLength = 360;

        // Determine if we need to bunch
        const isNearLeft = spaceLeft < (radius + safeMargin);
        const isNearRight = spaceRight < (radius + safeMargin);
        const isNearTop = spaceTop < (radius + safeMargin);
        const isNearBottom = spaceBottom < (radius + safeMargin);

        if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
            // Calculate a "Preferred Direction" towards the center of the screen
            const dxCenter = (winW / 2) - initialX;
            const dyCenter = (winH / 2) - initialY;
            const centerAngle = Math.atan2(dyCenter, dxCenter) * 180 / Math.PI;

            // Bunch them into an arch (180 to 240 degrees depending on count)
            arcLength = menuButtons.length <= 4 ? 120 : (menuButtons.length <= 6 ? 180 : 240);
            startAngle = centerAngle - (arcLength / 2);
        }

        const items = menuButtons.map((_, i) => {
            const angle = menuButtons.length === 1
                ? (isNearLeft || isNearRight || isNearTop || isNearBottom ? startAngle + arcLength / 2 : 0)
                : startAngle + (i * (arcLength / (arcLength === 360 ? menuButtons.length : menuButtons.length - 1)));
            const rad = (angle * Math.PI) / 180;
            return {
                angle: (angle + 360) % 360,
                x: Math.cos(rad) * radius,
                y: Math.sin(rad) * radius
            };
        });

        return { items, startAngle, arcLength };
    }, [menuButtons, initialX, initialY]);

    useEffect(() => {
        const handleGlobalMove = (e: PointerEvent) => {
            if (e.cancelable) e.preventDefault();
            // Allow propagation so the source button can update its ray/preview
            const dx = e.clientX - initialX;
            const dy = e.clientY - initialY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 40) {
                if (activeIndexRef.current !== null) {
                    setActiveIndex(null);
                    activeIndexRef.current = null;
                    lastHapticIndex.current = null;
                }
                return;
            }

            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            if (angle < 0) angle += 360;

            // Selection logic: Find closest button by angle
            let bestIndex = 0;
            let minDiff = Infinity;

            layout.items.forEach((item, i) => {
                let diff = Math.abs(angle - item.angle);
                if (diff > 180) diff = 360 - diff;
                if (diff < minDiff) {
                    minDiff = diff;
                    bestIndex = i;
                }
            });

            // If it's a bunched menu, we might want a "cutoff" angle so they don't select buttons from across the circle
            if (layout.arcLength < 360 && minDiff > 45) {
                if (activeIndexRef.current !== null) {
                    setActiveIndex(null);
                    activeIndexRef.current = null;
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
            // Allow propagation so the source button can perform cleanup (clear ray, held status, etc.)
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

    return (
        <div
            className="dial-menu-overlay"
            onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            <div className="dial-menu-center" style={{ transform: `translate3d(${initialX}px, ${initialY}px, 0)` }}>
                <div className="dial-selection-center" style={{ '--accent': activeIndex !== null ? (menuButtons[activeIndex].style.borderColor || menuButtons[activeIndex].style.backgroundColor || 'var(--accent)') : 'rgba(255,255,255,0.2)' } as any}>
                    {activeIndex !== null ? (
                        <div className="dial-center-highlight">
                            <div className="dial-center-icon">
                                {menuButtons[activeIndex].label.length <= 3 ? menuButtons[activeIndex].label : menuButtons[activeIndex].label.substring(0, 2)}
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
                                    '--accent': button.style.borderColor || button.style.backgroundColor || 'var(--accent)'
                                } as any}
                            >
                                <div className="dial-item-icon">
                                    {button.label.length <= 3 ? button.label : button.label.substring(0, 2)}
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
