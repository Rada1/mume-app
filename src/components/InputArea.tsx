import React, { useRef } from 'react';

interface InputAreaProps {
    input: string;
    setInput: (val: string) => void;
    onSend: (e?: React.FormEvent) => void;
    target?: string | null;
    onTargetClick?: () => void;
    terrain?: string;
    onSwipe?: (dir: string) => void;
    isMobile?: boolean;
    commandPreview?: string | null;
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
    input, setInput, onSend, target, onTargetClick, terrain, onSwipe, isMobile, commandPreview
}) => {
    const terrainClass = terrain ? `terrain-${normalizeTerrain(terrain)}` : '';
    const inputRef = useRef<HTMLInputElement>(null);
    const startPos = useRef<{ x: number, y: number } | null>(null);
    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const isSwiping = useRef(false);

    return (
        <div
            className={`input-area ${terrainClass}`}
            onPointerDown={(e) => {
                const targetElement = e.target as HTMLElement;
                // Allow prompt to be clicked normally
                if (targetElement.classList.contains('cmd-prompt')) return;

                startPos.current = { x: e.clientX, y: e.clientY };
                isSwiping.current = true;

                // For input field, we don't capture immediately to allow focus, 
                // but we still record startPos to detect the bubble-up swipe.
                if (targetElement.tagName !== 'INPUT') {
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
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
                pointerEvents: 'none'
            }} />
            <form className="input-form" onSubmit={onSend} style={{ pointerEvents: 'none', position: 'relative' }}>
                <span className="cmd-prompt" onPointerDown={(e) => e.preventDefault()} style={{ pointerEvents: 'auto' }}>{'>'}</span>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                    {commandPreview && !input && (
                        <div style={{
                            position: 'absolute',
                            left: '0',
                            color: 'var(--text-faded)',
                            opacity: 0.5,
                            pointerEvents: 'none',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            padding: '0',
                            marginLeft: '0'
                        }}>
                            {commandPreview}
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        className="input-field"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => {
                            // Clear startPos on focus to prevent the 'keyboard pop-up' 
                            // from being detected as a swipe-up.
                            startPos.current = null;
                        }}
                        placeholder={commandPreview ? "" : "Enter command..."}
                        style={{ pointerEvents: 'auto', background: 'transparent', width: '100%', position: 'relative', zIndex: 1 }}
                    />
                </div>
                {target && (
                    <div
                        className="target-badge"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => {
                            onTargetClick?.();
                            inputRef.current?.focus();
                        }}
                        style={{
                            marginLeft: '10px',
                            padding: '2px 8px',
                            background: 'rgba(var(--accent-rgb), 0.1)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: '#facc15',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'auto'
                        }}
                        title={`Current Target: ${target} (Click to insert into command line)`}
                    >
                        @{target}
                    </div>
                )}
                <button type="submit" style={{ display: 'none' }}>Send</button>
            </form>
        </div>
    );
};

export default React.memo(InputArea);

