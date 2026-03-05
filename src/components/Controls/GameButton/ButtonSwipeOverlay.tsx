import React from 'react';
import { createPortal } from 'react-dom';
import { CustomButton, SwipeDirection } from '../../../types';

interface ButtonSwipeOverlayProps {
    button: CustomButton;
    activeDir: SwipeDirection | null;
    isCancelling: boolean;
}

export const ButtonSwipeOverlay: React.FC<ButtonSwipeOverlayProps> = ({ button, activeDir, isCancelling }) => {
    if (!activeDir && !isCancelling) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 50000,
            '--wheel-center-x': '50%',
            '--wheel-center-y': '50%',
            '--set-accent': button.style.borderColor || 'var(--set-accent, var(--accent))',
            '--set-accent-rgb': button.style.borderColor ? (() => {
                const hex = button.style.borderColor.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return !isNaN(r) ? `${r}, ${g}, ${b}` : 'var(--set-accent-rgb, var(--accent-rgb))';
            })() : 'var(--set-accent-rgb, var(--accent-rgb))'
        } as any}>
            <div className="swipe-wheel-container">
                {['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'].map((d, i) => {
                    const cmdVal = (button.swipeCommands?.[d as SwipeDirection] || '').trim();
                    const longCmdVal = (button.longSwipeCommands?.[d as SwipeDirection] || '').trim();
                    const angle = i * 45;
                    const isActive = activeDir === d;
                    const shouldFlip = angle > 90 && angle < 270;
                    return (
                        <div
                            key={d}
                            className={`swipe-slice ${isActive ? 'active' : ''}`}
                            style={{
                                transform: `rotate(${angle}deg)`,
                                opacity: (cmdVal || longCmdVal || isActive) ? 1 : 0,
                                pointerEvents: 'auto',
                            } as any}
                        >
                            <div className="slice-separator" />
                            {(cmdVal || longCmdVal) && (
                                <span className={`swipe-slice-label ${shouldFlip ? 'flip' : ''}`}>
                                    {cmdVal || longCmdVal}
                                </span>
                            )}
                        </div>
                    );
                })}
                <div className={`swipe-center ${(activeDir as any) === 'center' ? 'active' : ''}`}>
                    <svg className="curved-label-svg" viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                        <path id={`swipe-curve-${button.id}`} d="M 18,50 A 32,32 0 1 1 82,50 A 32,32 0 1 1 18,50" fill="transparent" />
                        <text style={{ fontSize: '12.5px', fontWeight: '900', fill: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <textPath href={`#swipe-curve-${button.id}`} startOffset="25%" textAnchor="middle">
                                {button.command || button.label}
                            </textPath>
                        </text>
                    </svg>
                </div>
            </div>
            <div className="cancel-indicator" style={{
                '--cancel-x': `calc(var(--wheel-center-x, 50%) + 100px)`,
                '--cancel-y': `calc(var(--wheel-center-y, 50%) + 100px)`
            } as any}>Cancel</div>
        </div>,
        document.body
    );
};
