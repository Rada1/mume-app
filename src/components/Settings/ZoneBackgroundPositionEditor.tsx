/**
 * @file ZoneBackgroundPositionEditor.tsx
 * @description Drag preview for panning the atmospheric background image.
 */

// --- Logic Section ---
import React from 'react';
import type { ZoneBackgroundPosition } from '../../types';

interface ZoneBackgroundPositionEditorProps {
    imageUrl: string;
    position: ZoneBackgroundPosition;
    brightness: number;
    blur: number;
    zoom: number;
    onCommit: (position: ZoneBackgroundPosition) => void;
}

interface DragStart {
    pointerX: number;
    pointerY: number;
    position: ZoneBackgroundPosition;
    width: number;
    height: number;
}

const clampOffset = (value: number): number => Math.max(-300, Math.min(300, value));

const ZoneBackgroundPositionEditor: React.FC<ZoneBackgroundPositionEditorProps> = ({
    imageUrl,
    position,
    brightness,
    blur,
    zoom,
    onCommit
}) => {
    const [draft, setDraft] = React.useState(position);
    const [isDragging, setIsDragging] = React.useState(false);
    const draftRef = React.useRef(position);
    const dragStartRef = React.useRef<DragStart | null>(null);
    const viewportAspect = typeof window === 'undefined' ? '16 / 9' : `${window.innerWidth} / ${window.innerHeight}`;

    React.useEffect(() => {
        setDraft(position);
        draftRef.current = position;
    }, [position.x, position.y]);

    const updateDraft = (next: ZoneBackgroundPosition) => {
        const clamped = { x: clampOffset(next.x), y: clampOffset(next.y) };
        draftRef.current = clamped;
        setDraft(clamped);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        dragStartRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            position: draftRef.current,
            width: bounds.width,
            height: bounds.height
        };
        setIsDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const start = dragStartRef.current;
        if (!start) return;
        updateDraft({
            x: start.position.x + ((event.clientX - start.pointerX) / start.width) * 100,
            y: start.position.y + ((event.clientY - start.pointerY) / start.height) * 100
        });
    };

    const handlePointerUp = () => {
        if (!dragStartRef.current) return;
        dragStartRef.current = null;
        setIsDragging(false);
        onCommit(draftRef.current);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const increments: Record<string, ZoneBackgroundPosition> = {
            ArrowLeft: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 },
            ArrowUp: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 }
        };
        const increment = increments[event.key];
        if (!increment) return;
        event.preventDefault();
        const next = {
            x: draftRef.current.x + increment.x,
            y: draftRef.current.y + increment.y
        };
        updateDraft(next);
        onCommit({ x: clampOffset(next.x), y: clampOffset(next.y) });
    };

    const resetPosition = () => {
        updateDraft({ x: 0, y: 0 });
        onCommit({ x: 0, y: 0 });
    };

    return (
        <div>
            <div
                role="group"
                aria-label="Background image position preview. Drag to pan, or use arrow keys."
                tabIndex={0}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={handleKeyDown}
                style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: viewportAspect,
                    overflow: 'hidden',
                    border: '1px solid var(--border-modal)',
                    borderRadius: '6px',
                    background: '#080b12',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    outlineOffset: '2px'
                }}
            >
                <img
                    src={imageUrl}
                    alt=""
                    draggable={false}
                    style={{
                        position: 'absolute',
                        left: `calc(50% + ${draft.x}%)`,
                        top: `calc(50% + ${draft.y}%)`,
                        width: `${800 * zoom}%`,
                        height: `${800 * zoom}%`,
                        objectFit: 'contain',
                        transform: 'translate(-50%, -50%)',
                        opacity: 0.75,
                        filter: `sepia(0.35) brightness(${brightness}) contrast(1.05) blur(${blur}px)`,
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}
                />
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 24px rgba(0,0,0,0.65)' }} />
                <div style={{
                    position: 'absolute', left: '50%', top: '50%', width: '8px', height: '8px',
                    border: '1px solid rgba(255,255,255,0.7)', borderRadius: '50%',
                    transform: 'translate(-50%, -50%)', pointerEvents: 'none'
                }} />
                <span style={{
                    position: 'absolute', left: '8px', bottom: '7px', padding: '3px 6px',
                    borderRadius: '4px', background: 'rgba(0,0,0,0.7)',
                    color: 'var(--text-main)', fontSize: '0.68rem', pointerEvents: 'none'
                }}>
                    Drag image to pan
                </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                    X {draft.x.toFixed(1)}% · Y {draft.y.toFixed(1)}%
                </span>
                <button type="button" className="btn-secondary" onClick={resetPosition} style={{ width: 'auto', marginTop: 0, padding: '3px 8px', fontSize: '0.7rem' }}>
                    Reset Position
                </button>
            </div>
        </div>
    );
};

export default ZoneBackgroundPositionEditor;
