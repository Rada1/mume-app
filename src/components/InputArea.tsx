import React, { useRef } from 'react';

interface InputAreaProps {
    input: string;
    setInput: (val: string) => void;
    onSend: (e?: React.FormEvent) => void;
    target?: string | null;
    onClearTarget?: () => void;
    terrain?: string;
}

const normalizeTerrain = (t: string): string => {
    t = t.toLowerCase();
    if (t.includes('forest') || t.includes('jungle') || t.includes('wood')) return 'forest';
    if (t.includes('field') || t.includes('plain') || t.includes('grass') || t.includes('meadow')) return 'field';
    if (t.includes('brush') || t.includes('bush') || t.includes('scrub')) return 'brush';
    if (t.includes('water') || t.includes('river') || t.includes('lake') || t.includes('ocean') || t.includes('swim')) return 'water';
    if (t.includes('road') || t.includes('trail') || t.includes('path') || t.includes('bridge')) return 'road';
    if (t.includes('mountain') || t.includes('rock') || t.includes('cliff') || t.includes('peak')) return 'mountain';
    if (t.includes('hill')) return 'hills';
    if (t.includes('tunnel') || t.includes('cave') || t.includes('underground') || t.includes('mine')) return 'underground';
    if (t.includes('city') || t.includes('town') || t.includes('street') || t.includes('shop') || t.includes('inside') || t.includes('inn')) return 'city';
    return t.replace(/\s+/g, '-');
};

const InputArea: React.FC<InputAreaProps & { onSwipe?: (dir: string) => void }> = ({
    input, setInput, onSend, target, onClearTarget, terrain, onSwipe
}) => {
    const terrainClass = terrain ? `terrain-${normalizeTerrain(terrain)}` : '';
    const inputRef = useRef<HTMLInputElement>(null);
    const startPos = useRef<{ x: number, y: number } | null>(null);

    return (
        <div
            className={`input-area ${terrainClass}`}
            onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                // Allow prompt to be clicked normally
                if (target.classList.contains('cmd-prompt')) return;

                startPos.current = { x: e.clientX, y: e.clientY };

                // For input field, we don't capture immediately to allow focus, 
                // but we still record startPos to detect the bubble-up swipe.
                if (target.tagName !== 'INPUT') {
                    e.currentTarget.setPointerCapture(e.pointerId);
                }
            }}
            onPointerUp={(e) => {
                if (startPos.current) {
                    const deltaX = e.clientX - startPos.current.x;
                    const deltaY = e.clientY - startPos.current.y;
                    const absX = Math.abs(deltaX);
                    const absY = Math.abs(deltaY);

                    // High sensitivity threshold (10px) for quick flicks
                    if (Math.max(absX, absY) > 10) {
                        if (absY > absX) {
                            onSwipe?.(deltaY < 0 ? 'up' : 'down');
                        } else {
                            onSwipe?.(deltaX < 0 ? 'left' : 'right');
                        }
                    }
                    startPos.current = null;
                }
            }}
            onPointerCancel={() => {
                startPos.current = null;
            }}
            style={{ touchAction: 'none' }}
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
            <form className="input-form" onSubmit={onSend} style={{ pointerEvents: 'none' }}>
                <span className="cmd-prompt" style={{ pointerEvents: 'auto' }}>{'>'}</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="input-field"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter command..."
                    style={{ pointerEvents: 'auto' }}
                    autoFocus
                />
                {target && (
                    <div
                        className="target-badge"
                        onClick={onClearTarget}
                        style={{
                            marginLeft: '10px',
                            padding: '2px 8px',
                            background: 'rgba(250, 204, 21, 0.1)',
                            border: '1px solid rgba(250, 204, 21, 0.3)',
                            borderRadius: '4px',
                            color: '#facc15',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                        title="Current Target (Click to clear)"
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

