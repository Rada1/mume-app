import React from 'react';
import { SpatButton } from '../types';

interface SpatButtonsProps {
    spatButtons: SpatButton[];
    isMobile: boolean;
    setActiveSet: (setId: string) => void;
    executeCommand: (cmd: string) => void;
    setSpatButtons: React.Dispatch<React.SetStateAction<SpatButton[]>>;
}

export const SpatButtons: React.FC<SpatButtonsProps> = ({
    spatButtons,
    isMobile,
    setActiveSet,
    executeCommand,
    setSpatButtons
}) => {
    const [activeDirMap, setActiveDirMap] = React.useState<Record<string, string | null>>({});

    return (
        <>
            {spatButtons.map((sb, idx) => {
                const activeDir = activeDirMap[sb.id] || null;
                const hSlotWidth = 130;
                const vSlotSpacing = 60; // Better spacing for mobile

                let dynamicTargetX = sb.targetX;
                let dynamicTargetY = sb.targetY;

                if (isMobile) {
                    // Stack vertically upward on the right
                    // idx 0 (oldest) is at the bottom. 
                    // Set base to 60% height to stay clear of joystick/controls
                    dynamicTargetY = (window.innerHeight * 0.6) - (idx * vSlotSpacing);
                    // Land 15px from the right edge.
                    dynamicTargetX = window.innerWidth - 15;
                } else {
                    // Desktop: horizontal stack from right to left
                    dynamicTargetX = sb.targetX - (idx * hSlotWidth);
                }

                return (
                    <div
                        key={sb.id}
                        className={`spat-button ${activeDir ? 'is-swiping' : ''}`}
                        style={{
                            '--start-x': `${Math.round(sb.startX)}px`,
                            '--start-y': `${Math.round(sb.startY)}px`,
                            '--target-x': `${Math.round(dynamicTargetX)}px`,
                            '--target-y': `${Math.round(dynamicTargetY)}px`,
                            '--target-transform': isMobile ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                            borderColor: sb.color,
                            boxShadow: `0 4px 15px rgba(0, 0, 0, 0.5), 0 0 10px ${sb.color}`,
                            '--accent': sb.color
                        } as any}
                        onPointerDown={(e) => {
                            if (e.cancelable) e.preventDefault();
                            const el = e.currentTarget as any;
                            el._startX = e.clientX;
                            el._startY = e.clientY;
                            el._maxDist = 0;
                        }}
                        onPointerMove={(e) => {
                            const el = e.currentTarget as any;
                            if (!el._startX) return;
                            const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            el._maxDist = Math.max(el._maxDist || 0, dist);

                            if (dist > 15) {
                                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                                const index = (Math.round(angle / 45) + 8) % 8;
                                const directions = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'];
                                const dir = directions[index];
                                if (activeDirMap[sb.id] !== dir) {
                                    setActiveDirMap(prev => ({ ...prev, [sb.id]: dir }));
                                }
                                // Update Ray for visual feedback
                                const snappedAngle = Math.round(angle / 45) * 45;
                                el.style.setProperty('--ray-angle', `${snappedAngle}deg`);
                                el.style.setProperty('--ray-length', `${dist + 50}px`);
                                el.style.setProperty('--ray-opacity', dist > 25 ? '1' : '0');

                                // Cancel logic
                                if (el._maxDist > 20) {
                                    el.style.setProperty('--cancel-opacity', '1');
                                    if (dist < 18) {
                                        el.style.setProperty('--cancel-scale', '1.2');
                                        el.style.setProperty('--ray-opacity', '0.3');
                                    } else {
                                        el.style.setProperty('--cancel-scale', '1');
                                    }
                                }
                            } else {
                                if (activeDirMap[sb.id] !== null) {
                                    setActiveDirMap(prev => ({ ...prev, [sb.id]: null }));
                                }
                                el.style.setProperty('--ray-opacity', '0');
                                el.style.setProperty('--cancel-opacity', '0');
                                el.style.setProperty('--cancel-scale', '0.5');
                            }
                        }}
                        onPointerUp={(e) => {
                            const el = e.currentTarget as any;
                            const maxDist = el._maxDist || 0;
                            const startX = el._startX;

                            if (startX === null) return;
                            const dx = e.clientX - startX, dy = e.clientY - el._startY;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            el._startX = null;
                            setActiveDirMap(prev => ({ ...prev, [sb.id]: null }));
                            el.style.setProperty('--ray-opacity', '0');
                            el.style.setProperty('--cancel-opacity', '0');
                            el.style.setProperty('--cancel-scale', '0');

                            if (maxDist > 20 && dist < 18) {
                                return;
                            }

                            // Execute logic: tap or swipe in any direction
                            if (maxDist < 10 || (activeDir && maxDist > 20)) {
                                e.stopPropagation();
                                if (sb.action === 'nav') setActiveSet(sb.command);
                                else executeCommand(sb.command);
                                setSpatButtons(prev => prev.filter(x => x.id !== sb.id));
                            }
                        }}
                        onPointerCancel={(e) => {
                            const el = e.currentTarget as any;
                            el._startX = null;
                            setActiveDirMap(prev => ({ ...prev, [sb.id]: null }));
                            el.style.setProperty('--ray-opacity', '0');
                            el.style.setProperty('--cancel-opacity', '0');
                        }}
                    >
                        <div className="swipe-wheel-container">
                            {['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'].map((d, i) => (
                                <div
                                    key={d}
                                    className={`swipe-slice ${activeDir === d ? 'active' : ''}`}
                                    style={{ transform: `rotate(${i * 45}deg)`, opacity: 0.35 }}
                                >
                                    <span className="swipe-slice-label" style={{ '--self-rotation': `${-i * 45}deg` } as any}>
                                        {d === 'up' ? sb.label : d.toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="swipe-ray" />
                        <div className="cancel-indicator">Cancel</div>
                        <div className="button-label">{sb.label}</div>
                    </div>
                );
            })}
        </>
    );
};
