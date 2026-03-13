import React, { useRef, useMemo } from 'react';
import { SpatButtons } from './SpatButtons';
import { SpatButton, PopoverState } from '../types';
import { useUI, useBaseGame } from '../context/GameContext';


interface InputAreaProps {
    input: string;
    setInput: (val: string) => void;
    onSend: (e?: React.FormEvent) => void;
    target?: string | null;
    onTargetClick?: () => void;
    terrain?: string;
    onSwipe?: (dir: string) => void;
    isMobile?: boolean;
    isKeyboardOpen?: boolean;
    commandPreview?: string | null;
    spatButtons: SpatButton[];
    setActiveSet: (setId: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean }) => void;
    setSpatButtons: React.Dispatch<React.SetStateAction<SpatButton[]>>;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    parley: import('../types').ParleyState;
    setParley: React.Dispatch<React.SetStateAction<import('../types').ParleyState>>;
    whoList: string[];
}

const normalizeTerrain = (t: string): string => {
    t = t.trim();
    const low = t.toLowerCase();

    // MUME GMCP Symbols & Keywords
    if (t === 'f' || low.includes('forest') || low.includes('jungle') || low.includes('wood') || low.includes('tree') || low.includes('leaf') || low.includes('thicket')) return 'forest';
    if (t === '.' || low.includes('field') || low.includes('plain') || low.includes('grass') || low.includes('meadow') || low.includes('heath') || low.includes('tundra')) return 'field';
    if (t === ':' || low.includes('brush') || low.includes('bush') || low.includes('scrub') || low.includes('shrub') || low.includes('swamp')) return 'brush';
    if (t === '~' || t === '%' || t === 'W' || t === 'U' || low.includes('water') || low.includes('river') || low.includes('lake') || low.includes('ocean') || low.includes('swim') || low.includes('sea') || low.includes('bog') || low.includes('shallow') || low.includes('rapid') || low.includes('underwater')) return 'water';
    if (t === '+' || low.includes('road') || low.includes('trail') || low.includes('path') || low.includes('bridge') || low.includes('cobble')) return 'road';
    if (t === '<' || low.includes('mountain') || low.includes('rock') || low.includes('cliff') || low.includes('peak') || low.includes('glacier')) return 'mountain';
    if (t === '(' || low.includes('hill')) return 'hills';
    if (t === '=' || t === '0' || low.includes('tunnel') || low.includes('cave') || low.includes('underground') || low.includes('mine') || low.includes('dark') || low.includes('crypt') || low.includes('cavern')) return 'underground';
    if (t === '[' || t === '#' || low.includes('city') || low.includes('town') || low.includes('street') || low.includes('shop') || low.includes('inside') || low.includes('inn') || low.includes('building') || low.includes('room')) return 'city';

    return low.replace(/\s+/g, '-');
};

const InputArea: React.FC<InputAreaProps> = ({
    input, setInput, onSend, target, onTargetClick, terrain, onSwipe, isMobile, isKeyboardOpen, commandPreview,
    spatButtons, setActiveSet, executeCommand, setSpatButtons, setPopoverState, parley, setParley, whoList
}) => {
    const { ui } = useUI();
    const { viewport } = useBaseGame();
    const terrainClass = terrain ? `terrain-${normalizeTerrain(terrain)}` : '';
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const startPos = useRef<{ x: number, y: number } | null>(null);
    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const isSwiping = useRef(false);

    // Global listeners to catch fast swipes that leave the element bounds
    React.useEffect(() => {
        const handleGlobalPointerMove = (e: PointerEvent) => {
            if (isSwiping.current && startPos.current) {
                const dx = e.clientX - startPos.current.x;
                const dy = e.clientY - startPos.current.y;

                setOffset({
                    x: Math.abs(dx) > Math.abs(dy) ? Math.max(-40, Math.min(40, dx)) : 0,
                    y: Math.abs(dy) > Math.abs(dx) ? Math.max(-20, Math.min(20, dy)) : 0
                });
            }
        };

        const handleGlobalPointerUp = (e: PointerEvent) => {
            if (isSwiping.current && startPos.current) {
                const deltaX = e.clientX - startPos.current.x;
                const deltaY = e.clientY - startPos.current.y;
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);

                // High sensitivity threshold (35px) for quick flicks
                if (Math.max(absX, absY) > 35) {
                    if (absY > absX) {
                        onSwipe?.(deltaY < 0 ? 'up' : 'down');
                    } else {
                        onSwipe?.(deltaX < 0 ? 'left' : 'right');
                    }
                }
            }
            isSwiping.current = false;
            startPos.current = null;
            setOffset({ x: 0, y: 0 });
        };

        const handleGlobalPointerCancel = () => {
            isSwiping.current = false;
            startPos.current = null;
            setOffset({ x: 0, y: 0 });
        };

        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerCancel);

        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerCancel);
        };
    }, [onSwipe]);

    // Reset height when input is cleared
    React.useEffect(() => {
        if (!input && inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
    }, [input]);

    const handleParleyCommandClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPopoverState({
            x: rect.left + rect.width / 2,
            y: rect.top,
            type: 'select-parley-command',
            setId: 'parley-commands',
            context: 'Select Command',
            menuDisplay: 'list'
        });
    };

    const handleParleyTargetClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPopoverState({
            x: rect.left + rect.width / 2,
            y: rect.top,
            type: 'select-parley-target',
            setId: 'parley-targets',
            context: 'Select Target',
            menuDisplay: 'list'
        });
    };

    const TARGETLESS_COMMANDS = ['say', 'narrate', 'shout', 'yell', 'sing'];

    const handleParleyClear = () => {
        setParley({ ...parley, active: false });
    };


    // Hide spat buttons in portrait mode when map is expanded
    const shouldShowSpat = viewport.isLandscape || !ui.mapExpanded;

    return (
        <div
            className={`input-area ${terrainClass} input-container`}
            onPointerDown={(e) => {
                const targetElement = e.target as HTMLElement;
                // Allow prompt and target badge to be clicked normally
                if (targetElement.classList.contains('cmd-prompt') || targetElement.closest('.target-badge')) return;

                startPos.current = { x: e.clientX, y: e.clientY };
                isSwiping.current = true;

                // For input field, we don't capture immediately to allow focus, 
                // but we still record startPos to detect the bubble-up swipe.
                if (targetElement.tagName !== 'INPUT' && targetElement.tagName !== 'TEXTAREA') {
                    if (e.cancelable) e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                }
            }}
            onPointerMove={(e) => {
                if (isSwiping.current && startPos.current) {
                    const dx = e.clientX - startPos.current.x;
                    const dy = e.clientY - startPos.current.y;

                    // Limit the visual shift for subtle feedback
                    setOffset({
                        x: Math.abs(dx) > Math.abs(dy) ? Math.max(-40, Math.min(40, dx)) : 0,
                        y: Math.abs(dy) > Math.abs(dx) ? Math.max(-20, Math.min(20, dy)) : 0
                    });
                }
            }}
            onPointerUp={(e) => {
                isSwiping.current = false;
                if (startPos.current) {
                    const deltaX = e.clientX - startPos.current.x;
                    const deltaY = e.clientY - startPos.current.y;
                    const absX = Math.abs(deltaX);
                    const absY = Math.abs(deltaY);

                    // High sensitivity threshold (35px) for quick flicks
                    if (Math.max(absX, absY) > 35) {
                        if (absY > absX) {
                            onSwipe?.(deltaY < 0 ? 'up' : 'down');
                        } else {
                            onSwipe?.(deltaX < 0 ? 'left' : 'right');
                        }
                    }
                    startPos.current = null;
                }
                setOffset({ x: 0, y: 0 });
            }}
            onPointerCancel={() => {
                isSwiping.current = false;
                startPos.current = null;
                setOffset({ x: 0, y: 0 });
            }}
            style={{
                touchAction: 'none',
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                transition: isSwiping.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
        >
            <div className="swipe-handle" style={{
                position: 'absolute',
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40px',
                height: '4px',
                background: 'var(--text-faded, rgba(255, 255, 255, 0.2))',
                borderRadius: '2px',
                pointerEvents: 'none'
            }} />
            <form className="input-form" onSubmit={onSend} style={{ position: 'relative' }}>
                <span className="cmd-prompt" onPointerDown={(e) => e.preventDefault()} style={{ pointerEvents: 'auto' }}>{'>'}</span>
                
                {parley.active && (() => {
                    const isTargetless = TARGETLESS_COMMANDS.includes(parley.command);
                    return (
                        <div className="parley-indicator-container">
                            <div className="parley-indicator parley-command" onClick={handleParleyCommandClick}>
                                {parley.command}
                            </div>
                            <div
                                className="parley-indicator parley-target"
                                onClick={handleParleyTargetClick}
                                title={isTargetless ? 'This command has no target' : undefined}
                            >
                                {isTargetless ? '' : (parley.target ?? '')}
                            </div>
                            <div className="parley-clear-btn" onClick={handleParleyClear}>
                                ×
                            </div>
                        </div>
                    );
                })()}
                <div 
                    onClick={() => inputRef.current?.focus()}
                    style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', cursor: 'text' }}
                >
                    {commandPreview && !input && (
                        <div style={{
                            position: 'absolute',
                            left: '0',
                            color: 'var(--accent)',
                            opacity: 0.9,
                            fontWeight: '500',
                            pointerEvents: 'none',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            padding: '0',
                            marginLeft: '0'
                        }}>
                            {commandPreview}
                        </div>
                    )}
                    <textarea
                        ref={inputRef}
                        className="input-field"
                        value={input}
                        rows={1}
                        onChange={(e) => {
                            setInput(e.target.value);
                            // Auto-resize logic
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                        onFocus={(e) => {
                            // Clear startPos on focus to prevent the 'keyboard pop-up' 
                            // from being detected as a swipe-up.
                            startPos.current = null;
                            e.currentTarget.parentElement?.parentElement?.parentElement?.classList.add('focused');
                        }}
                        onBlur={(e) => {
                            e.currentTarget.parentElement?.parentElement?.parentElement?.classList.remove('focused');
                        }}
                        onClick={(e) => {
                            if (isMobile && inputRef.current) {
                                inputRef.current.focus();
                            }
                        }}
                        placeholder={commandPreview ? "" : "Enter command..."}
                        style={{
                            pointerEvents: 'auto',
                            background: 'transparent',
                            width: '100%',
                            position: 'relative',
                            zIndex: 1,
                            resize: 'none',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            padding: '4px 0',
                            border: 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            color: 'inherit',
                            lineHeight: '1.4',
                            caretColor: '#ffffff',
                            display: 'block',
                            visibility: 'visible',
                            opacity: 1,
                            userSelect: 'text',
                            WebkitUserSelect: 'text',
                            touchAction: 'none'
                        }}
                    />
                </div>

                {target && (
                    <div
                        className="target-badge"
                        draggable="true"
                        onDragStart={(e) => {
                            const dragData = {
                                type: 'inline-btn',
                                cmd: 'target',
                                context: 'target',
                                id: 'meta-target'
                            };
                            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                            e.dataTransfer.effectAllowed = 'move';
                            (e.currentTarget as HTMLElement).classList.add('dragging');
                        }}
                        onDragEnd={(e) => {
                            (e.currentTarget as HTMLElement).classList.remove('dragging');
                        }}
                        onPointerDown={(e) => {
                            // Don't prevent default here or drag-and-drop won't start
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onTargetClick?.();
                            if (!isMobile) inputRef.current?.focus();
                        }}
                        style={{
                            marginLeft: '10px',
                            padding: '2px 8px',
                            background: 'var(--input-bg, rgba(var(--accent-rgb), 0.1))',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--ansi-yellow, #facc15)',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'grab',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'auto'
                        }}
                        title={`Current Target: ${target} (Click to insert, Drag to drawer to get)`}
                    >
                        @{target}
                    </div>
                )}
                <button type="submit" style={{ display: 'none' }}>Send</button>
            </form>

            {shouldShowSpat && (
                <SpatButtons
                    spatButtons={spatButtons}
                    isMobile={!!isMobile}
                    isKeyboardOpen={isKeyboardOpen}
                    setActiveSet={setActiveSet}
                    executeCommand={executeCommand}
                    setSpatButtons={setSpatButtons}
                    setPopoverState={setPopoverState}
                />
            )}
        </div>
    );
};

export default React.memo(InputArea);
