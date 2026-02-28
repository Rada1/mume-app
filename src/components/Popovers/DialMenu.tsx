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
    const center = useMemo(() => ({ x: initialX, y: initialY }), [initialX, initialY]);
    const lastHapticIndex = useRef<number | null>(null);

    useEffect(() => {
        const handleGlobalMove = (e: PointerEvent) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            const dx = e.clientX - center.x;
            const dy = e.clientY - center.y;
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

            const sliceSize = 360 / menuButtons.length;
            const index = Math.floor(angle / sliceSize);

            if (index !== activeIndexRef.current) {
                setActiveIndex(index);
                activeIndexRef.current = index;
                if (lastHapticIndex.current !== index) {
                    triggerHaptic(10);
                    lastHapticIndex.current = index;
                }
            }
        };

        const handleGlobalUp = (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
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
    }, [center, menuButtons, onClose, onExecute, triggerHaptic]);

    return (
        <div
            className="dial-menu-overlay"
            onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            <div className="dial-menu-center" style={{ left: center.x, top: center.y }}>
                <div className="dial-selection-center" style={{ '--accent': activeIndex !== null ? (menuButtons[activeIndex].style.borderColor || menuButtons[activeIndex].style.backgroundColor || 'var(--accent)') : 'rgba(255,255,255,0.2)' } as any}>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '4px' }}>
                        {activeIndex !== null ? 'Selected' : 'Select'}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: activeIndex !== null ? 'var(--accent)' : '#fff' }}>
                        {activeIndex !== null ? menuButtons[activeIndex].label : '...'}
                    </div>
                </div>
                <div className="dial-menu-ring">
                    {menuButtons.map((button, i) => {
                        const sliceSize = 360 / menuButtons.length;
                        const angle = i * sliceSize;
                        const rad = (angle * Math.PI) / 180;
                        const radius = 110;
                        const x = Math.cos(rad) * radius;
                        const y = Math.sin(rad) * radius;

                        return (
                            <div
                                key={button.id}
                                className={`dial-item ${activeIndex === i ? 'active' : ''}`}
                                style={{
                                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
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
