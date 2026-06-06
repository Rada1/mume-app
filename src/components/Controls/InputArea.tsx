import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { MessageCircle, Reply, Repeat, XCircle, HelpCircle } from 'lucide-react';
import { SpatButtons } from './SpatButtons';
import { SpatButton, PopoverState } from '../../types';
import { useUI, useBaseGame, useVitals, useGame } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useInputStore } from '../../stores/useInputStore';
import { audioManager } from '../../services/audio/AudioManager';
import { useRoomStore } from '../../stores/useRoomStore';



interface InputAreaProps {
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

const EXAMPLE_COMMANDS = [
    'look',
    'score',
    'where',
    'who',
    'inventory',
    'equipment',
    'cast \'armour\'',
    'examine orc',
    'open gate',
    'practice',
    'help ranger',
    'examine chest',
    'wimpy 30',
    'get all',
    'flee'
];


const InputArea: React.FC<InputAreaProps> = ({
    onSend, terrain, onSwipe, isMobile, isKeyboardOpen, commandPreview,
    spatButtons, setActiveSet, executeCommand, setSpatButtons, setPopoverState, parley, setParley, whoList, gameState
}) => {
    const input = useInputStore(s => s.input);
    const setInput = useInputStore(s => s.setInput);
    const { ui, setUI } = useUI();
    const { viewport } = useBaseGame();
    const { stats } = useVitals();
    const { inCombat, triggerHaptic, playClickSound, isSoundEnabled, initAudio, isPasswordMode, accountState, env, popoverState } = useGame() as any;
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
    const [commandIndex, setCommandIndex] = useState(0);

    const chars = useRoomStore(s => s.chars);
    const items = useRoomStore(s => s.items);
    const rawExits = useRoomStore(s => s.rawExits);

    // Dynamically build suggestions based on GMCP room data
    const dynamicCommands = useMemo(() => {
        const list: string[] = [];

        // 1. NPC/Char suggestions
        const occupants = Object.values(chars || {});
        occupants.forEach(char => {
            const kw = char.keyword || char.name?.split(' ')[0]?.toLowerCase();
            if (kw) {
                list.push(`examine ${kw}`);
                const isPC = char.type === 'pc' || char.pc === 1;
                if (isPC) {
                    list.push(`smile ${kw}`);
                    list.push(`nod ${kw}`);
                    list.push(`wave ${kw}`);
                    list.push(`bow ${kw}`);
                    list.push(`wink ${kw}`);
                }
            }
        });

        // 2. Door/Exit suggestions
        if (rawExits) {
            Object.entries(rawExits).forEach(([dir, exitData]: [string, any]) => {
                if (exitData?.closed) {
                    const doorName = exitData.name || 'door';
                    list.push(`open ${doorName}`);
                    list.push(`open ${dir}`);
                } else if (exitData?.hasDoor) {
                    const doorName = exitData.name || 'door';
                    list.push(`close ${doorName}`);
                }
            });
        }

        // 3. Item suggestions
        if (Array.isArray(items)) {
            items.forEach(item => {
                const kw = item.keyword || item.name?.split(' ')[0]?.toLowerCase();
                if (kw) {
                    list.push(`get ${kw}`);
                    list.push(`examine ${kw}`);
                }
            });
        }

        // Fallbacks / Static commands
        const staticFallbacks = [
            'look',
            'score',
            'where',
            'who',
            'inventory',
            'equipment',
            'practice',
            'flee'
        ];

        const combined = [...list, ...staticFallbacks];
        return Array.from(new Set(combined)).filter(cmd => 
            !cmd.toLowerCase().startsWith('kill') && 
            !cmd.toLowerCase().startsWith('hit')
        );
    }, [chars, rawExits, items]);

    // Rotate placeholder commands for playing state
    useEffect(() => {
        const mode = parley.mode || (parley.active ? 'parley' : 'command');
        if (gameState !== 'playing' || mode !== 'command' || input) {
            return;
        }

        setCommandIndex(prev => prev >= dynamicCommands.length ? 0 : prev);

        const interval = setInterval(() => {
            setCommandIndex(prev => {
                if (dynamicCommands.length === 0) return 0;
                return (prev + 1) % dynamicCommands.length;
            });
        }, 4000);
        return () => clearInterval(interval);
    }, [gameState, parley.mode, parley.active, input, dynamicCommands]);


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

    // Reset height and set cursor position when input changes (e.g. via history navigation)
    React.useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            if (input) {
                inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
                // If input is focused, move cursor to the end
                if (document.activeElement === inputRef.current) {
                    const len = input.length;
                    inputRef.current.setSelectionRange(len, len);
                }
            }
        }
    }, [input]);


    const isHelpCardOpen = popoverState?.type === 'help-card';

    // Auto set to help mode when help card is open, and restore to command when closed
    useEffect(() => {
        if (isHelpCardOpen) {
            setParley(prev => ({ ...prev, active: false, mode: 'help' }));
        } else {
            // Revert to command mode when help card closes (if it was help mode)
            setParley(prev => {
                if (prev.mode === 'help') {
                    return { ...prev, active: false, mode: 'command' };
                }
                return prev;
            });
        }
    }, [isHelpCardOpen, setParley]);
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
        setParley({ ...parley, active: false, mode: 'command' });
    };

    const handleModeMenuToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        initAudio?.();
        if (isSoundEnabled) playClickSound?.();
        triggerHaptic(20);
        
        const currentMode = parley.mode || (parley.active ? 'parley' : 'command');
        if (currentMode === 'parley') {
            setParley({ ...parley, active: false, mode: 'command' });
        } else {
            setParley({ ...parley, active: true, mode: 'parley' });
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

    // Keep command/login input focused on desktop during login, stage, or state transitions
    useEffect(() => {
        if (!isMobile && inputRef.current) {
            const activeEl = document.activeElement;
            const isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
            const isSelfFocused = activeEl === inputRef.current;
            
            // If another input is focused (e.g. settings search, target box), do not steal focus
            if (isInputActive && !isSelfFocused) {
                return;
            }
            
            inputRef.current.focus();
        }
    }, [isLoginStage, isMobile, gameState, accountState?.stage]);

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
                                    if (isSoundEnabled) audioManager.playEffect('typing');
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
                        <div
                            className="login-card-new-account"
                            style={{
                                visibility: accountState?.currentPrompt?.toLowerCase().includes('by what name') ? 'visible' : 'hidden'
                            }}
                        >
                            <button
                                type="button"
                                className="login-new-acc-btn"
                                onClick={() => { triggerHaptic?.(30); executeCommand('new'); }}
                            >
                                New Account
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }



    const isConfirmationStage = gameState === 'account' && accountState?.stage === 'account-confirmation';

    if (isConfirmationStage) {
        const promptTitle = accountState?.creationPrompt?.title || accountState?.currentPrompt || '';
        const creationOptions = accountState?.creationPrompt?.options ?? [];

        return (
            <div className="login-card-container">
                <div className="login-card">
                    <h2 className="login-card-title">MUME</h2>
                    {promptTitle && <div className="login-prompt-text">{promptTitle}</div>}

                    {creationOptions.length > 0 && (
                        <div className="creation-card-options">
                            {creationOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className="creation-card-option-btn"
                                    onClick={() => { triggerHaptic(15); executeCommand(opt.id); }}
                                >
                                    <span className="creation-card-option-id">({opt.id})</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="login-input-wrapper">
                            <textarea
                                ref={inputRef}
                                id="mud-input"
                                name="mud-input"
                                className="login-input-field"
                                value={input}
                                rows={1}
                                onChange={(e) => {
                                    if (isSoundEnabled) audioManager.playEffect('typing');
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
                                placeholder="Type y or n..."
                                autoFocus
                            />
                        </div>
                        <div className="login-card-actions" style={{ justifyContent: 'flex-end' }}>
                            <button type="submit" className="login-btn" onClick={() => { triggerHaptic?.(40); }}>Send</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    const currentMode = parley.mode || (parley.active ? 'parley' : 'command');

    return (
        <div 
            className={`input-area ${terrainClass} input-container`}
            style={isHelpCardOpen ? { zIndex: 31000 } : undefined}
        >
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
                        const currentMode = parley.mode || (parley.active ? 'parley' : 'command');
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
                        const isPillActive = currentMode !== 'command';

                        return (
                            <div className={`parley-pill${isPillActive ? ' parley-pill-active' : ''}`} style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    className={`cmd-prompt-btn${isPillActive ? ' parley-active' : ''}`}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={handleModeMenuToggle}
                                    title={`Current mode: ${currentMode}. Click to switch.`}
                                >
                                    {currentMode === 'parley' ? <MessageCircle size={16} /> : currentMode === 'help' ? <HelpCircle size={16} /> : '>'}
                                </button>

                                {currentMode === 'parley' && (<>
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

                                {currentMode === 'help' && (<>
                                    <div
                                        className="parley-indicator"
                                        style={{
                                            background: 'rgba(234, 179, 8, 0.2)',
                                            color: '#eab308',
                                            borderColor: 'rgba(234, 179, 8, 0.3)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid'
                                        }}
                                    >
                                        help
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
                                if (isSoundEnabled) audioManager.playEffect('typing');
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
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    useInputStore.getState().navigateHistory('up');
                                } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    useInputStore.getState().navigateHistory('down');
                                } else if (e.key === 'Tab' && !viewport.isMobile) {
                                    e.preventDefault();
                                    window.dispatchEvent(new CustomEvent('mume-trigger-target-input'));
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
                            placeholder={isPasswordMode ? "Enter password..." : (gameState === 'account' ? "Enter username..." : (commandPreview ? "" : (currentMode === 'help' ? "Enter help topic..." : `Try: ${dynamicCommands[commandIndex] || 'look'}...`)))}
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
