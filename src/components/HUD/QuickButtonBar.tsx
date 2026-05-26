import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useGame } from '../../context/GameContext';
import './QuickButtonBar.css';

const SWIPE_THRESHOLD = 40;

interface QuickChipProps {
    id: string;
    label: string;
    command: string;
    hotkey?: string;
    onFire: () => void;
    onRemove: () => void;
}

const QuickChip: React.FC<QuickChipProps> = ({ label, command, hotkey, onFire, onRemove }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isDismissing, setIsDismissing] = useState(false);
    const pointerStartX = useRef<number | null>(null);
    const didSwipe = useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointerStartX.current = e.clientX;
        didSwipe.current = false;
        setOffsetX(0);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (pointerStartX.current === null) return;
        const dx = e.clientX - pointerStartX.current;
        if (Math.abs(dx) > 8) {
            didSwipe.current = true;
            setOffsetX(dx);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (pointerStartX.current === null) return;
        const dx = e.clientX - pointerStartX.current;
        pointerStartX.current = null;

        if (didSwipe.current && Math.abs(dx) >= SWIPE_THRESHOLD) {
            setIsDismissing(true);
            setTimeout(() => onRemove(), 220);
        } else {
            setOffsetX(0);
        }
    };

    const handleClick = () => {
        if (didSwipe.current) return;
        onFire();
    };

    const opacity = isDismissing ? 0 : Math.max(0, 1 - Math.abs(offsetX) / 120);
    const translateX = isDismissing
        ? (offsetX >= 0 ? 80 : -80)
        : offsetX;

    return (
        <button
            className={`quick-chip${isDismissing ? ' is-dismissing' : ''}`}
            style={{
                transform: `translateX(${translateX}px)`,
                opacity,
                transition: isDismissing
                    ? 'transform 0.22s ease, opacity 0.22s ease'
                    : offsetX !== 0 ? 'none' : 'transform 0.12s ease',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            title={hotkey ? `[${hotkey}] ${command}` : command}
        >
            {label}
        </button>
    );
};

export const QuickButtonBar: React.FC = () => {
    const quickButtons = useUIStore(s => s.quickButtons);
    const addQuickButton = useUIStore(s => s.addQuickButton);
    const removeQuickButton = useUIStore(s => s.removeQuickButton);
    const { executeCommand, triggerHaptic } = useGame();

    const [isCreating, setIsCreating] = useState(false);
    const [labelInput, setLabelInput] = useState('');
    const [commandInput, setCommandInput] = useState('');
    const formRef = useRef<HTMLDivElement>(null);
    const commandInputRef = useRef<HTMLInputElement>(null);

    const nextDefaultLabel = `Q${quickButtons.length + 1}`;

    const openCreate = useCallback(() => {
        triggerHaptic(10);
        setLabelInput(`Q${quickButtons.length + 1}`);
        setCommandInput('');
        setIsCreating(true);
    }, [triggerHaptic, quickButtons.length]);

    const closeCreate = useCallback(() => {
        setIsCreating(false);
        setCommandInput('');
        setLabelInput('');
    }, []);

    const handleCreate = useCallback(() => {
        const cmd = commandInput.trim();
        if (!cmd) return;
        const lbl = labelInput.trim() || nextDefaultLabel;
        addQuickButton({ label: lbl, command: cmd });
        triggerHaptic(20);
        closeCreate();
    }, [commandInput, labelInput, nextDefaultLabel, addQuickButton, triggerHaptic, closeCreate]);

    const handleFire = useCallback((command: string) => {
        triggerHaptic(15);
        executeCommand(command);
    }, [triggerHaptic, executeCommand]);

    // Global hotkey F1-F12 mapping
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key;
            if (key.length === 2 && key[0] === 'F') {
                const fNum = parseInt(key.substring(1), 10);
                if (fNum >= 1 && fNum <= 12) {
                    const btnIndex = fNum - 1;
                    if (btnIndex < quickButtons.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        const btn = quickButtons[btnIndex];
                        handleFire(btn.command);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [quickButtons, handleFire]);

    // Autofocus command input when form opens
    useEffect(() => {
        if (isCreating && commandInputRef.current) {
            commandInputRef.current.focus();
        }
    }, [isCreating]);

    // Close form on pointer outside
    useEffect(() => {
        if (!isCreating) return;
        const handleDown = (e: PointerEvent) => {
            if (formRef.current && !formRef.current.contains(e.target as Node)) {
                closeCreate();
            }
        };
        document.addEventListener('pointerdown', handleDown, { capture: true });
        return () => document.removeEventListener('pointerdown', handleDown, { capture: true });
    }, [isCreating, closeCreate]);

    return (
        <div className="quick-button-bar">
            {isCreating && (
                <div className="quick-create-form" ref={formRef}>
                    <div style={{
                        fontSize: '0.55rem',
                        color: 'rgba(255, 255, 255, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '1px 2px 3px 2px',
                        fontFamily: 'var(--font-mono, monospace)'
                    }}>
                        Hotkey: F{quickButtons.length + 1}
                    </div>
                    <input
                        className="quick-create-input quick-create-input--label"
                        type="text"
                        placeholder={nextDefaultLabel}
                        value={labelInput}
                        onChange={e => setLabelInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleCreate();
                            if (e.key === 'Escape') closeCreate();
                        }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    <input
                        ref={commandInputRef}
                        className="quick-create-input"
                        type="text"
                        placeholder="command…"
                        value={commandInput}
                        onChange={e => setCommandInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleCreate();
                            if (e.key === 'Escape') closeCreate();
                        }}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    <button
                        className="quick-create-confirm"
                        onClick={handleCreate}
                        disabled={!commandInput.trim()}
                    >
                        Create
                    </button>
                </div>
            )}
            <div className="quick-chip-row">
                {[...quickButtons].reverse().map(btn => {
                    const origIndex = quickButtons.findIndex(b => b.id === btn.id);
                    return (
                        <QuickChip
                            key={btn.id}
                            id={btn.id}
                            label={btn.label}
                            command={btn.command}
                            hotkey={origIndex !== -1 ? `F${origIndex + 1}` : undefined}
                            onFire={() => handleFire(btn.command)}
                            onRemove={() => removeQuickButton(btn.id)}
                        />
                    );
                })}
                <button
                    className="quick-add-btn"
                    onClick={openCreate}
                    title="Add quick button"
                    aria-label="Add quick button"
                >
                    <Plus size={12} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
};
