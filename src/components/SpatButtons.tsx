import React, { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SpatButton } from '../types';

interface SpatButtonsProps {
    spatButtons: SpatButton[];
    isMobile: boolean;
    setActiveSet: (setId: string) => void;
    executeCommand: (cmd: string) => void;
    setSpatButtons: React.Dispatch<React.SetStateAction<SpatButton[]>>;
}

const SpatButtonItem: React.FC<{
    sb: SpatButton;
    promptLeft: number;
    activeDir: string | null;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
}> = ({ sb, promptLeft, activeDir, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }) => {
    const elRef = useRef<HTMLDivElement>(null);
    const [spitDistance, setSpitDistance] = useState(0);

    // Measure the landing spot relative to the prompt on mount
    useLayoutEffect(() => {
        if (elRef.current && promptLeft) {
            const rect = elRef.current.getBoundingClientRect();
            // The distance to translate FROM to reach the prompt
            setSpitDistance(promptLeft - rect.left);
        }
    }, [promptLeft]);

    return (
        <div
            ref={elRef}
            className={`spat-button ${activeDir ? 'is-swiping' : ''}`}
            style={{
                '--spit-distance': `${spitDistance}px`,
                borderColor: sb.color,
                boxShadow: `0 4px 15px rgba(0, 0, 0, 0.5), 0 0 10px ${sb.color}`,
                '--accent': sb.color
            } as any}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
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
};

export const SpatButtons: React.FC<SpatButtonsProps> = ({
    spatButtons,
    isMobile,
    setActiveSet,
    executeCommand,
    setSpatButtons
}) => {
    const [activeDirMap, setActiveDirMap] = React.useState<Record<string, string | null>>({});
    const [promptLeft, setPromptLeft] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Keep track of the prompt position within the command bar
    useLayoutEffect(() => {
        const updatePromptPos = () => {
            const prompt = document.querySelector('.cmd-prompt');
            if (prompt) {
                setPromptLeft(prompt.getBoundingClientRect().left);
            }
        };

        updatePromptPos();
        window.addEventListener('resize', updatePromptPos);
        return () => window.removeEventListener('resize', updatePromptPos);
    }, []);

    return (
        <div className="spat-container" ref={containerRef}>
            {spatButtons.map((sb) => (
                <SpatButtonItem
                    key={sb.id}
                    sb={sb}
                    promptLeft={promptLeft}
                    activeDir={activeDirMap[sb.id] || null}
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
                            const snappedAngle = Math.round(angle / 45) * 45;
                            el.style.setProperty('--ray-angle', `${snappedAngle}deg`);
                            el.style.setProperty('--ray-length', `${dist + 50}px`);
                            el.style.setProperty('--ray-opacity', dist > 25 ? '1' : '0');

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

                        if (maxDist < 10 || (activeDirMap[sb.id] && maxDist > 20)) {
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
                />
            ))}
        </div>
    );
};
