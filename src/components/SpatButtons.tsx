import React from 'react';
import { createPortal } from 'react-dom';
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
    const [containerWidth, setContainerWidth] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            // Find the parent input-area or form to estimate the spit distance
            const parent = containerRef.current.closest('.input-area');
            if (parent) {
                setContainerWidth(parent.getBoundingClientRect().width);
            }
        }
    }, [spatButtons.length]);

    return (
        <div className="spat-container" ref={containerRef}>
            {spatButtons.map((sb, idx) => {
                const activeDir = activeDirMap[sb.id] || null;

                // The .spat-container uses row-reverse, so idx 0 (oldest) is on the right.
                // We animate from the left side of the bar towards the right position.
                // --spit-distance is roughly the negative of the offset from the left edge.
                const spitOffset = containerWidth ? -(containerWidth * 0.7) : -300;

                return (
                    <div
                        key={sb.id}
                        className={`spat-button ${activeDir ? 'is-swiping' : ''}`}
                        style={{
                            '--spit-distance': `${spitOffset}px`,
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
                        {activeDir && createPortal(
                            <div className="swipe-wheel-container" style={{ zIndex: 50000 }}>
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
                            </div>,
                            document.body
                        )}
                        <div className="swipe-ray" />
                        <div className="cancel-indicator">Cancel</div>
                        {sb.icon ? (
                            <img src={sb.icon} className="button-icon" alt="" />
                        ) : (
                            <div className="button-label">{sb.label}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
