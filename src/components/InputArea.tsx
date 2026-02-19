import React, { useImperativeHandle, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface InputAreaProps {
    input: string;
    setInput: (val: string) => void;
    onSend: (e?: React.FormEvent) => void;
    target?: string | null;
    onClearTarget?: () => void;
    terrain?: string;
    /** If provided, the input bar will animate in/out based on this value */
    isExpanded?: boolean;
    /** Called when the user hits the collapse button */
    onHide?: () => void;
}

/** Methods exposed via ref */
export interface InputAreaHandle {
    focusInput: () => void;
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

const InputArea = React.forwardRef<InputAreaHandle, InputAreaProps>((
    { input, setInput, onSend, target, onClearTarget, terrain, isExpanded, onHide },
    ref
) => {
    const terrainClass = terrain ? `terrain-${normalizeTerrain(terrain)}` : '';
    const inputRef = useRef<HTMLInputElement>(null);

    // Expose focusInput() so the parent can call it synchronously on tap
    useImperativeHandle(ref, () => ({
        focusInput: () => {
            inputRef.current?.focus();
        }
    }));

    const isMobile = isExpanded !== undefined;

    return (
        <div
            className={`input-area ${terrainClass} ${isMobile ? 'input-area-mobile' : ''} ${isMobile && isExpanded ? 'input-area-expanded' : ''}`}
        >
            <form className="input-form" onSubmit={onSend}>
                <span className="cmd-prompt">{'>'}</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="input-field"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter command..."
                    autoFocus={!isMobile}
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
                {onHide && (
                    <button
                        type="button"
                        onClick={onHide}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.4)',
                            marginLeft: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0
                        }}
                        title="Close keyboard"
                    >
                        <ChevronDown size={20} />
                    </button>
                )}
            </form>
        </div>
    );
});

InputArea.displayName = 'InputArea';

export default InputArea;

