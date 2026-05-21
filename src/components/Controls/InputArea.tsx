import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MessageCircle, Reply, Repeat, XCircle } from 'lucide-react';
import { SpatButtons } from './SpatButtons';
import { SpatButton, PopoverState } from '../../types';
import { useUI, useBaseGame, useVitals, useGame } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';



interface InputAreaProps {
    input: string;
    setInput: (val: string) => void;
    onSend: (e?: React.FormEvent) => void;
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
    parley: import('../../types').ParleyState;
    setParley: React.Dispatch<React.SetStateAction<import('../../types').ParleyState>>;
    whoList: string[];
    gameState: import('../../types').GameState;
}

import { normalizeTerrain } from '../../utils/terrainUtils';

const InputArea: React.FC<InputAreaProps> = ({
    input, setInput, onSend, terrain, onSwipe, isMobile, isKeyboardOpen, commandPreview,
    spatButtons, setActiveSet, executeCommand, setSpatButtons, setPopoverState, parley, setParley, whoList, gameState
}) => {
    const { ui, setUI } = useUI();
    const { viewport } = useBaseGame();
    const { stats } = useVitals();
    const { inCombat, triggerHaptic, playClickSound, isSoundEnabled, initAudio, isPasswordMode, accountState, env } = useGame() as any;
    const rememberLogin = useSettingsStore(s => s.rememberLogin);
    const setRememberLogin = useSettingsStore(s => s.setRememberLogin);
    const setLoginName = useSettingsStore(s => s.setLoginName);
    const setLoginPassword = useSettingsStore(s => s.setLoginPassword);
    const terrainClass = terrain ? `terrain-${normalizeTerrain(terrain)}` : '';
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const glowRafRef = useRef<number | null>(null);
    const startPos = useRef<{ x: number, y: number } | null>(null);
    const [offset, setOffset] = React.useState({ x: 0, y: 0 });
    const isSwiping = useRef(false);

    // Global listeners to catch fast swipes that leave the element bounds
    React.useEffect(() => {
        const handleGlobalPointerMove = (e: PointerEvent) => {
            if (isSwiping.current && startPos.current) {
                const dx = e.clientX - startPos.current.x;
                const dy = e.clientY - startPos.current.y;
                const absX = Math.abs(dx);
                const absY = Math.abs(dy);

                // Full circular visual feedback (30px radius)
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 30;
                const ox = dist > maxDist ? (dx / dist) * maxDist : dx;
                const oy = dist > maxDist ? (dy / dist) * maxDist : dy;
                setOffset({ x: ox, y: oy });

                if (dist > 20) {
                    let peek: any = 'none';
                    if (dx < -15 && dy < -15) peek = 'inventory'; // NW -> reveal SE
                    else if (dx > 15 && dy < -15) peek = 'stats'; // NE -> reveal SW
                    else if (dx < -15 && dy > 15) peek = 'equipment'; // SW -> reveal NE
                    else if (dx > 15 && dy > 15) peek = 'players'; // SE -> reveal NW
                    else if (Math.abs(dy) > Math.abs(dx)) peek = dy < 0 ? 'none' : 'character';
                    else peek = dx < 0 ? 'equipment' : 'stats';
                    
                    if (ui.peekingDrawer !== peek) {
                        setUI(prev => ({ ...prev, peekingDrawer: peek }));
                    }
                } else if (ui.peekingDrawer !== 'none') {
                    setUI(prev => ({ ...prev, peekingDrawer: 'none' }));
                }
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
                    if (deltaX < -25 && deltaY > 25) onSwipe?.('sw');
                    else if (deltaX > 25 && deltaY < -25) onSwipe?.('ne');
                    else if (deltaX > 25 && deltaY > 25) onSwipe?.('se');
                    else if (deltaX < -25 && deltaY < -25) onSwipe?.('nw');
                    else if (absY > absX) onSwipe?.(deltaY < 0 ? 'up' : 'down');
                    else onSwipe?.(deltaX < 0 ? 'left' : 'right');
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

    // Use a ref for input to avoid closure issues in the event listener
    const inputRefState = useRef(input);
    useEffect(() => { inputRefState.current = input; }, [input]);

    useEffect(() => {
        const handlePasteEvent = (e: any) => {
            const textToPaste = e.detail;
            if (!textToPaste) return;
            
            const currentVal = inputRefState.current;
            const trimmed = currentVal.trim();
            const newVal = trimmed ? `${trimmed} ${textToPaste}` : textToPaste;
            setInput(newVal);

            // Use the DOM ref for immediate focus and selection
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    const len = inputRef.current.value.length;
                    inputRef.current.setSelectionRange(len, len);
                }
            }, 50);
        };

        window.addEventListener('mume-input-paste', handlePasteEvent);
        return () => window.removeEventListener('mume-input-paste', handlePasteEvent);
    }, [setInput]);

    const handleNativeDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
        if (!dataStr) return;
        
        let text = dataStr;
        try {
            const parsed = JSON.parse(dataStr);
            if (parsed && parsed.context) text = parsed.context;
        } catch (err) {}
        
        window.dispatchEvent(new CustomEvent('mume-input-paste', { detail: text }));
    };

    const handleParleyCommandClick = (e: React.MouseEvent) => {
        initAudio?.();
        if (isSoundEnabled) playClickSound?.();
        triggerHaptic(20);
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
        initAudio?.();
        if (isSoundEnabled) playClickSound?.();
        triggerHaptic(20);
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top;
        executeCommand('who', true, true, false, false);
        setTimeout(() => {
            setPopoverState({
                x,
                y,
                type: 'select-parley-target',
                setId: 'parley-targets',
                context: 'Select Target',
                menuDisplay: 'list'
            });
        }, 600);
    };

    const TARGETLESS_COMMANDS = ['say', 'narrate', 'shout', 'yell', 'sing'];

    const handleParleyClear = () => {
        initAudio?.();
        if (isSoundEnabled) playClickSound?.();
        triggerHaptic(20);
        setParley({ ...parley, active: false });
    };

    const handleParleyToggle = () => {
        initAudio?.();
        if (isSoundEnabled) playClickSound?.();
        triggerHaptic(20);
        if (parley.active) {
            setParley({ ...parley, active: false });
        } else {
            setParley(prev => ({ ...prev, active: true }));
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    };


    // Hide spat buttons in portrait mode when map is expanded
    const shouldShowSpat = viewport.isLandscape || !ui.mapExpanded;
    const isLoginStage = gameState === 'account' && accountState?.stage === 'login';
    const isPasswordPrompt = isLoginStage && (
        isPasswordMode ||
        accountState?.currentPrompt?.toLowerCase().includes('password') ||
        accountState?.currentPrompt?.toLowerCase().includes('verify')
    );

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        if (isLoginStage && rememberLogin && input.trim()) {
            if (isPasswordPrompt) {
                setLoginPassword(input.trim());
            } else {
                setLoginName(input.trim());
            }
        }
        onSend(e);
    }, [input, isLoginStage, isPasswordPrompt, onSend, rememberLogin, setLoginName, setLoginPassword]);

    if (isLoginStage) {
        return (
            <div className="login-card-container">
                <div className="login-card">
                    <h2 className="login-card-title">MUME</h2>
                    <div className="login-prompt-text">
                        {accountState?.currentPrompt || "By what name do you wish to be known?"}
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="login-input-wrapper">
                            <textarea
                                ref={inputRef}
                                id="mud-input"
                                name="mud-input"
                                className="login-input-field"
                                value={input}
                                rows={1}
                                style={{ WebkitTextSecurity: isPasswordMode ? 'disc' : 'none' } as any}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                placeholder={isPasswordMode ? "Enter password..." : "Enter username..."}
                                autoFocus
                            />
                        </div>
                        <div className="login-card-actions">
                            <label className="remember-login-toggle">
                                <input
                                    type="checkbox"
                                    checked={rememberLogin}
                                    onChange={e => setRememberLogin(e.target.checked)}
                                />
                                <span>Remember login</span>
                            </label>
                            <button
                                type="submit"
                                className="login-btn"
                                onClick={() => { triggerHaptic?.(40); }}
                            >
                                Login
                            </button>
                        </div>
                        {accountState?.currentPrompt?.toLowerCase().includes('by what name') && (
                            <div className="login-card-new-account">
                                <button
                                    type="button"
                                    className="login-new-acc-btn"
                                    onClick={() => { triggerHaptic?.(30); executeCommand('new'); }}
                                >
                                    New Account
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={`input-area ${terrainClass} input-container`}>
            {isLoginStage && (
                <label className="remember-login-toggle">
                    <input
                        type="checkbox"
                        checked={rememberLogin}
                        onChange={e => setRememberLogin(e.target.checked)}
                    />
                    <span>Remember login</span>
                </label>
            )}
            <div className="input-main-container" ref={containerRef}>
                <form className="input-form" onSubmit={handleSubmit}>
                    {(() => {
                        const isTargetless = TARGETLESS_COMMANDS.includes(parley.command);
                        const PARLEY_COLORS: Record<string, string> = {
                            tell: '#22c55e',
                            whisper: '#22c55e',
                            say: '#06b6d4',
                            yell: '#a855f7',
                            shout: '#ef4444',
                            narrate: '#eab308',
                            sing: '#f472b6'
                        };
                        const commandColor = PARLEY_COLORS[parley.command.toLowerCase()] || 'inherit';

                        return (
                            <div className={`parley-pill${parley.active ? ' parley-pill-active' : ''}`}>
                                <button
                                    type="button"
                                    className={`cmd-prompt-btn${parley.active ? ' parley-active' : ''}`}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={handleParleyToggle}
                                    title={parley.active ? 'Exit parley mode' : 'Enter parley mode'}
                                >
                                    {parley.active ? <MessageCircle size={16} /> : '>'}
                                </button>

                                {parley.active && (<>
                                    <div
                                        className="parley-indicator parley-command"
                                        onClick={handleParleyCommandClick}
                                        style={{ color: commandColor, borderColor: commandColor !== 'inherit' ? commandColor : undefined }}
                                    >
                                        {parley.command}
                                    </div>
                                    <div
                                        className="parley-indicator parley-target"
                                        onClick={handleParleyTargetClick}
                                        title={isTargetless ? 'This command has no target' : undefined}
                                    >
                                        {isTargetless ? '' : (parley.target ?? '')}
                                    </div>
                                    <button
                                        type="button"
                                        className="parley-clear-btn"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleParleyClear(); }}
                                    >
                                        ×
                                    </button>
                                </>)}
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
                            id="mud-input"
                            name="mud-input"
                            className="input-field"
                            value={input}
                            rows={1}
                            style={{ WebkitTextSecurity: isPasswordMode ? 'disc' : 'none' } as any}
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
                                    handleSubmit();
                                }
                            }}
                            onFocus={(e) => {
                                e.currentTarget.parentElement?.parentElement?.classList.add('focused');
                            }}
                            onBlur={(e) => {
                                e.currentTarget.parentElement?.parentElement?.classList.remove('focused');
                            }}
                            onClick={(e) => {
                                if (isMobile && inputRef.current) {
                                    inputRef.current.focus();
                                }
                            }}
                            placeholder={isPasswordMode ? "Enter password..." : (gameState === 'account' ? "Enter username..." : (commandPreview ? "" : "Enter command..."))}
                        />
                    </div>

                    <button type="submit" style={{ display: 'none' }}>Send</button>
                </form>

                    {isLoginStage && (
                        <button
                            type="button"
                            className="login-btn"
                            onClick={() => { triggerHaptic(40); handleSubmit(); }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            Login
                        </button>
                    )}

                    {gameState === 'playing' && (
                        <div className="input-actions-container">
                            {shouldShowSpat && (
                                <SpatButtons
                                    spatButtons={spatButtons}
                                    isMobile={!!isMobile}
                                    isKeyboardOpen={isKeyboardOpen}
                                    setActiveSet={setActiveSet}
                                    executeCommand={executeCommand}
                                    setSpatButtons={setSpatButtons}
                                    setPopoverState={setPopoverState}
                                    playClickSound={playClickSound}
                                    triggerHaptic={triggerHaptic}
                                    initAudio={initAudio}
                                    isSoundEnabled={isSoundEnabled}
                                />
                            )}

                        <button
                            type="button"
                            className="msg-repeat-btn"
                            onClick={() => executeCommand('!', false, false, true)}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Repeat Last Command (!)"
                        >
                            <Repeat size={18} />
                        </button>

                        {stats.conditions?.waiting && (
                            <button
                                type="button"
                                className="msg-cancel-btn"
                                onClick={() => executeCommand('', false, false, false)}
                                onPointerDown={(e) => e.stopPropagation()}
                                title="Cancel Current Action (Send Newline)"
                            >
                                <XCircle size={18} />
                            </button>
                        )}
                    </div>
                )}
                </div>

        </div>
    );
};

export default React.memo(InputArea);
