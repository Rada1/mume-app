import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus } from 'lucide-react';

import './index.css';
import {
    MessageType, LightingType, WeatherType, Direction, DeathStage,
    Message, GameStats, CustomButton, SoundTrigger, PopoverState, SavedSettings, TeleportTarget, SwipeDirection
} from './types';
import {
    DEFAULT_BG, DEATH_IMG, DEFAULT_URL, FX_THRESHOLD
} from './constants';
import { ansiConvert } from './utils/ansi';

import { useButtons } from './hooks/useButtons';
import { useTelnet } from './hooks/useTelnet';
import { useSoundSystem } from './hooks/useSoundSystem';
import { useJoystick } from './hooks/useJoystick';
import { useMessageLog } from './hooks/useMessageLog';
import { useEnvironment } from './hooks/useEnvironment';
import { useViewport } from './hooks/useViewport';
import { useSettings } from './hooks/useSettings';
import { useGameParser } from './hooks/useGameParser';
import { useButtonEditor } from './hooks/useButtonEditor';
import { extractNoun } from './utils/gameUtils';
import { useCommandController } from './hooks/useCommandController';
import { useAtmosphereAudio } from './hooks/useAtmosphereAudio';
import { useSpatButtons } from './hooks/useSpatButtons';

import StatBars from './components/StatBars';
import Joystick from './components/Joystick';
import MessageLog from './components/MessageLog';
import InputArea from './components/InputArea';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import EditButtonModal from './components/EditButtonModal';
import SetManagerModal from './components/SetManagerModal';
import { Mapper, MapperRef } from './components/Mapper';
import { mudParser } from './services/parser/services/mudParser';
import SwipeFeedbackOverlay, { triggerSwipeFeedback } from './components/SwipeFeedbackOverlay';
import { PopoverManager } from './components/Popovers/PopoverManager';
import { GameButton } from './components/GameButton';
import { getButtonCommand } from './utils/buttonUtils';
import { DrawerManager } from './components/Drawers/DrawerManager';
import { GameProvider, useGame } from './context/GameContext';
import { EnvironmentEffects } from './components/Atmosphere/EnvironmentEffects';
import { SpatButtons } from './components/SpatButtons';









// Note: numToWord, pluralize*, ARRIVE_REGEX etc. have been moved to src/hooks/useMessageLog.ts

interface TelnetCallbacks {
    onRoomInfo: (data: any) => void;
    onCharVitals: (data: any) => void;
    onRoomPlayers: (data: any) => void;
    onRoomItems: (data: any) => void;
    onAddPlayer: (data: any) => void;
    onRemovePlayer: (data: any) => void;
}

const MudClient = () => {
    // --- State ---
    const [input, setInput] = useState('');
    const [activePrompt, setActivePrompt] = useState<string>('');
    // bgImage, connectionUrl, loginName, loginPassword → useSettings hook below
    // isNoviceMode → GameContext
    const {
        isNoviceMode, setIsNoviceMode,
        isMmapperMode, setIsMmapperMode,
        status, setStatus,
        target, setTarget,
        popoverState, setPopoverState,
        isSettingsOpen, setIsSettingsOpen,
        settingsTab, setSettingsTab,
        accentColor, setAccentColor
    } = useGame();

    useEffect(() => {
        document.documentElement.style.setProperty('--accent', accentColor);
    }, [accentColor]);
    // lighting, weather, isFoggy, mood, spellSpeed, alertness → useEnvironment hook below
    // loginName, loginPassword → useSettings hook below

    // isNoviceMode localStorage persistence → useSettings hook
    const [playerPosition, setPlayerPosition] = useState('standing');
    const [teleportTargets, setTeleportTargets] = useState<TeleportTarget[]>(() => {
        const saved = localStorage.getItem('mud-teleport-targets');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { console.error("Failed to load teleport targets", e); }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('mud-teleport-targets', JSON.stringify(teleportTargets));
    }, [teleportTargets]);

    // Periodically clean up expired targets
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setTeleportTargets(prev => {
                const filtered = prev.filter(t => t.expiresAt > now);
                if (filtered.length !== prev.length) return filtered;
                return prev;
            });
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);



    // UI Layout State
    const [isSetManagerOpen, setIsSetManagerOpen] = useState(false);
    const [returnToManager, setReturnToManager] = useState(false);
    const [managerSelectedSet, setManagerSelectedSet] = useState<string | null>(null);

    const [rumble, setRumble] = useState(false);
    const [hitFlash, setHitFlash] = useState(false);
    const [inCombat, setInCombatState] = useState(false);
    const [lightning, setLightning] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [deathStage, setDeathStage] = useState<DeathStage>('none');
    const [stats, setStats] = useState<GameStats>({
        hp: 0, maxHp: 1,
        mana: 0, maxMana: 1,
        move: 0, maxMove: 1,
        wimpy: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    // soundTriggers, newSoundPattern, newSoundRegex, isSoundEnabled → useSettings hook below
    // isSoundEnabledRef → useSettings hook below
    const [joystickGlow, setJoystickGlow] = useState(false);
    const [btnGlow, setBtnGlow] = useState<{ up: boolean, down: boolean }>({ up: false, down: false });

    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isCharacterOpen, setIsCharacterOpen] = useState(false);
    const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    // inventoryHtml, statsHtml, eqHtml → useGameParser hook below

    const [heldButton, setHeldButton] = useState<{ id: string, baseCommand: string, modifiers: string[] } | null>(null);
    const [commandPreview, setCommandPreview] = useState<string | null>(null);

    const popoverRef = useRef<HTMLDivElement>(null);
    // useLayoutEffect positioning moved to PopoverManager.tsx


    useEffect(() => {
        if (isMmapperMode) {
            setConnectionUrl('ws://localhost:8080');
        } else if (connectionUrl === 'ws://localhost:8080') {
            setConnectionUrl(DEFAULT_URL);
        }
    }, [isMmapperMode]);

    // Spat buttons logic moved to useSpatButtons hook

    // captureStage, isDrawerCapture, isWaiting* → useGameParser hook below
    const hasAttemptedLogin = useRef(false);

    const [roomPlayers, setRoomPlayers] = useState<string[]>([]);
    // isKeyboardOpen → useViewport hook below
    const [characterName, setCharacterName] = useState<string | null>(null);
    const [roomItems, setRoomItems] = useState<string[]>([]);






    // --- Refs ---

    const navIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const mapperRef = useRef<MapperRef>(null);
    const inCombatRef = useRef(false);
    // --- Refs (not scroll-related; scroll refs → useViewport) ---

    useEffect(() => {
        if (activePrompt) {
            // reset is handled inside useGameParser's captureStage
        }
    }, [activePrompt]);

    // Drawer-close resets are now handled in executeCommand via parser.captureStage etc.
    // These effects are kept for future extension but no longer reset capture directly.

    const lastTapRef = useRef<number>(0);
    // extractNoun → moved into useGameParser hook

    // --- Custom Message Hook (must be before prevMessagesLengthRef which references messages) ---
    // Keep a ref so addMessage (useCallback) always sees the live combat state
    const setInCombat = (val: boolean) => {
        inCombatRef.current = val;
        setInCombatState(val);
    };

    const { messages, setMessages, addMessage, isCombatLine, isCommunicationLine } = useMessageLog(inCombatRef);

    // --- Scroll & Viewport ---
    const viewport = useViewport();
    const { isMobile, isKeyboardOpen, scrollContainerRef, scrollAnimationRef, isAutoScrollingRef,
        isLockedToBottomRef, scrollToBottom } = viewport;

    // --- Environment & Settings Hooks ---
    const env = useEnvironment();
    const { lighting, weather, isFoggy, setWeather, setIsFoggy, detectLighting, getLightingIcon, getWeatherIcon,
        mood, setMood, spellSpeed, setSpellSpeed, alertness, setAlertness } = env;

    // --- Refs ---
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessagesLengthRef = useRef<number>(messages.length);
    const hpRowRef = useRef<HTMLDivElement>(null);
    const manaRowRef = useRef<HTMLDivElement>(null);
    const moveRowRef = useRef<HTMLDivElement>(null);

    const btn = useButtons();
    const customButtonsLayerRef = useRef<HTMLDivElement>(null);
    const { handleDragStart, wasDraggingRef } = useButtonEditor(btn, customButtonsLayerRef);


    const soundTriggersRef = useRef<SoundTrigger[]>([]);
    // soundTriggersRef.current is updated after settings hook is called below

    // Toggle onKeyboard buttons when keyboard state changes
    useEffect(() => {
        let changed = false;
        const next = btn.buttonsRef.current.map(b => {
            if (b.trigger?.onKeyboard) {
                const shouldBeVisible = isKeyboardOpen;
                if (b.isVisible !== shouldBeVisible) { changed = true; return { ...b, isVisible: shouldBeVisible }; }
            }
            return b;
        });
        if (changed) btn.setButtons(next);
    }, [isKeyboardOpen, btn]);



    // Auto-return to manager logic
    useEffect(() => {
        if (btn.editingButtonId === null && returnToManager) {
            setIsSetManagerOpen(true);
            setReturnToManager(false);
        }
    }, [btn.editingButtonId, returnToManager]);
    const { audioCtxRef, initAudio, playSound, triggerHaptic } = useSoundSystem();
    const { spatButtons, setSpatButtons, triggerSpit } = useSpatButtons(messages, scrollContainerRef, triggerHaptic);
    const joystick = useJoystick();

    // --- Settings Hook (needs btn.setButtons, audioCtxRef, initAudio from above) ---
    const settingsHook = useSettings({ addMessage, audioCtxRef, initAudio, setButtons: btn.setButtons });
    const { bgImage, setBgImage, connectionUrl, setConnectionUrl, loginName, setLoginName,
        loginPassword, setLoginPassword,
        isSoundEnabledRef,
        soundTriggers, setSoundTriggers, newSoundPattern, setNewSoundPattern,
        newSoundRegex, setNewSoundRegex,
        handleFileUpload, exportSettingsFile, handleSoundUpload } = settingsHook;
    const exportSettings = () => exportSettingsFile(btn.buttons);
    const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => settingsHook.importSettings(e, setIsSettingsOpen);
    useEffect(() => { soundTriggersRef.current = soundTriggers; }, [soundTriggers]);

    // --- Game Parser Hook ---
    const parser = useGameParser({
        addMessage,
        playSound,
        triggerHaptic,
        detectLighting,
        setWeather,
        setIsFoggy,
        setStats,
        setRumble,
        setHitFlash,
        setDeathStage,
        setPlayerPosition,
        isInventoryOpen,
        isCharacterOpen,
        soundTriggersRef,
        isSoundEnabledRef,
        mapperRef,
        btn: {
            buttonsRef: btn.buttonsRef,
            setButtons: btn.setButtons,
            buttonTimers: btn.buttonTimers,
            setActiveSet: btn.setActiveSet,
        },
    });
    const { inventoryHtml, setInventoryHtml, statsHtml, setStatsHtml, eqHtml, setEqHtml,
        captureStage, isDrawerCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        processLine } = parser;

    // DialMenu moved to src/components/Popovers/DialMenu.tsx







    const hpRatio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
    const manaRatio = stats.maxMana > 0 ? stats.mana / stats.maxMana : 0;
    const moveRatio = stats.maxMove > 0 ? stats.move / stats.maxMove : 0;


    // --- Game parser hook: owns processLine, capture state, drawer HTML ---
    // NOTE: hook call is placed later (after useSoundSystem, btn, settingsHook all set up)
    // A placeholder until the hook destructuring below provides processLine

    // --- Derived State & Handlers ---

    const telnet = useTelnet({
        connectionUrl, addMessage, setStatus, setStats, setWeather, setIsFoggy,
        setRumble, setHitFlash, setDeathStage, detectLighting, processLine,
        setPrompt: setActivePrompt, setInCombat,
        onCharNameChange: (name) => {
            setCharacterName(name);
        },
        onPositionChange: (pos) => setPlayerPosition(pos)
    });

    useEffect(() => {
        if (status === 'connected' && loginName && !hasAttemptedLogin.current) {
            hasAttemptedLogin.current = true;
            const timer = setTimeout(() => {
                telnet.sendCommand(loginName);
                if (loginPassword) {
                    setTimeout(() => {
                        telnet.sendCommand(loginPassword);
                    }, 500);
                }
            }, 500);
            return () => clearTimeout(timer);
        } else if (status === 'disconnected') {
            hasAttemptedLogin.current = false;
        }
    }, [status, loginName, loginPassword, telnet.sendCommand]);

    const callbacksRef = useRef<TelnetCallbacks | null>(null);
    useEffect(() => {
        const notifyMapper = (action: (ref: React.RefObject<MapperRef>) => void) => {
            action(mapperRef);
        };

        callbacksRef.current = {
            onRoomInfo: (data: any) => notifyMapper(ref => ref.current?.handleRoomInfo(data)),
            onCharVitals: (data: any) => { if (data.terrain) notifyMapper(ref => ref.current?.handleTerrain(data.terrain)); },
            onRoomPlayers: (data: any) => {
                let players: string[] = [];
                const parseOccupant = (p: any): string[] => {
                    if (typeof p === 'string') return [p];
                    const names = [];
                    if (p.name) names.push(p.name);
                    if (p.short) names.push(p.short);
                    if (p.shortdesc) names.push(p.shortdesc);
                    if (p.keyword) names.push(p.keyword);
                    return names;
                };

                if (Array.isArray(data)) {
                    players = data.flatMap(parseOccupant).filter(Boolean);
                } else if (data.players && Array.isArray(data.players)) {
                    players = data.players.flatMap(parseOccupant).filter(Boolean);
                } else if (data.chars && Array.isArray(data.chars)) {
                    players = data.chars.flatMap(parseOccupant).filter(Boolean);
                } else if (data.members && Array.isArray(data.members)) {
                    players = data.members.flatMap(parseOccupant).filter(Boolean);
                }
                console.log("[Occupants List]", players);
                if (players.length > 0) addMessage('system', `[GMCP] Room updated: ${players.length} occupants identified.`);
                setRoomPlayers(players);
            },
            onRoomItems: (data: any) => {
                let items: string[] = [];
                const parseItem = (i: any): string[] => {
                    if (typeof i === 'string') return [i];
                    const names = [];
                    if (i.name) names.push(i.name);
                    if (i.short) names.push(i.short);
                    if (i.shortdesc) names.push(i.shortdesc);
                    return names;
                };

                if (Array.isArray(data)) {
                    items = data.flatMap(parseItem).filter(Boolean);
                } else if (data.items && Array.isArray(data.items)) {
                    items = data.items.flatMap(parseItem).filter(Boolean);
                }
                console.log("[Items List]", items);
                if (items.length > 0) addMessage('system', `[GMCP] Room items: ${items.length} objects identified.`);
                setRoomItems(items);
            },
            onAddPlayer: (data: any) => {
                const name = typeof data === 'string' ? data : data.name;
                if (name) setRoomPlayers(prev => prev.includes(name) ? prev : [...prev, name]);
            },
            onRemovePlayer: (data: any) => {
                const name = typeof data === 'string' ? data : data.name;
                if (name) setRoomPlayers(prev => prev.filter(p => p !== name));
            }
        };
    }, [setRoomPlayers, setRoomItems, addMessage, btn]);

    const connect = () => {
        initAudio();

        telnet.connect({
            onRoomInfo: (data) => callbacksRef.current.onRoomInfo && callbacksRef.current.onRoomInfo(data),
            onCharVitals: (data) => callbacksRef.current.onCharVitals && callbacksRef.current.onCharVitals(data),
            onRoomPlayers: (data) => callbacksRef.current.onRoomPlayers && callbacksRef.current.onRoomPlayers(data),
            onAddPlayer: (data) => callbacksRef.current.onAddPlayer && callbacksRef.current.onAddPlayer(data),
            onRemovePlayer: (data) => callbacksRef.current.onRemovePlayer && callbacksRef.current.onRemovePlayer(data),
            onRoomItems: (data: any) => callbacksRef.current.onRoomItems && callbacksRef.current.onRoomItems(data),
        });
    };

    const { executeCommand } = useCommandController({
        telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets,
        isDrawerCapture, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        setInventoryHtml, setStatsHtml, setEqHtml,
        setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen
    });

    const handleWimpyChange = useCallback((val: number) => {
        executeCommand(`change wimpy ${val}`);
        setStats(prev => ({ ...prev, wimpy: val }));
    }, [executeCommand]);

    const handleSend = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        const cmd = input.trim();
        setInput('');

        if (isNoviceMode) {
            const result = mudParser.parse(cmd);
            if (result.finalOutput && result.finalOutput.length > 0) {
                result.finalOutput.forEach(c => executeCommand(c, false, false));
            } else {
                executeCommand(cmd, false, false);
            }
        } else {
            executeCommand(cmd, false, false);
        }
        // User requesting snap-to-bottom on every command
        if (typeof scrollToBottom === 'function') {
            scrollToBottom(true, true);
            // Slight delay too to catch the local echo / response
            setTimeout(() => scrollToBottom(true, true), 30);
        }
    }, [input, executeCommand, scrollToBottom, isNoviceMode]);

    const handleSendCallback = useCallback((e?: React.FormEvent) => {
        handleSend(e);
    }, [handleSend]);

    const scrollTaskRef = useRef<number | null>(null);
    const handleLogScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container && !isAutoScrollingRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const scrollBottom = scrollTop + clientHeight;
            const isActuallyAtBottom = scrollHeight - scrollBottom < (isMobile ? 30 : 50);
            isLockedToBottomRef.current = isActuallyAtBottom;
        }

        // Only cancel the scroll animation if it wasn't triggered by the system itself
        if (scrollAnimationRef.current && !isAutoScrollingRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }

        if (scrollTaskRef.current) return;

        scrollTaskRef.current = requestAnimationFrame(() => {
            scrollTaskRef.current = null;
            if (!container) return;
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isActuallyAtBottom = scrollHeight - (scrollTop + clientHeight) < (isMobile ? 30 : 50);

            // Threshold for clearing focus
            if (isActuallyAtBottom) {
                if (focusedIndex !== null) setFocusedIndex(null);
                return;
            }

            const children = container.children;
            const scrollBottom = scrollTop + clientHeight;
            let newFocusIndex = 0;
            // Scan backwards from bottom to find first visible element
            for (let i = Math.min(children.length - 2, messages.length - 1); i >= 0; i--) {
                const child = children[i] as HTMLElement;
                if (child.offsetTop < scrollBottom) {
                    newFocusIndex = i;
                    break;
                }
            }

            if (focusedIndex !== newFocusIndex) {
                setFocusedIndex(newFocusIndex);
            }
        });
    }, [focusedIndex, messages.length]);

    const handleInputSwipe = useCallback((dir: string) => {
        if (!isMobile) return;
        triggerHaptic(20);
        if (dir === 'up') {
            setIsMapExpanded(true);
        } else if (dir === 'down') {
            // Closing all drawers on swipe down
            if (isInventoryOpen || isRightDrawerOpen || isCharacterOpen || isMapExpanded) {
                triggerHaptic(15);
                setIsInventoryOpen(false);
                setIsRightDrawerOpen(false);
                setIsCharacterOpen(false);
                setIsMapExpanded(false);
            } else executeCommand('s');
        } else if (dir === 'right') {
            // Swipe right (left to right) opens character
            setStatsHtml('');
            executeCommand('stat', false, true, true);
            setIsCharacterOpen(true);
        }
        else if (dir === 'left') {
            // Swipe left (right to left) opens inventory/equipment
            setInventoryHtml(''); setEqHtml('');
            executeCommand('inventory', false, true, true);
            setTimeout(() => executeCommand('eq', false, true, true), 300);
            setIsRightDrawerOpen(true);
        }
    }, [isMobile, triggerHaptic, executeCommand, isInventoryOpen, isCharacterOpen, isRightDrawerOpen, isMapExpanded, setStatsHtml, setInventoryHtml, setEqHtml]);

    useAtmosphereAudio({
        hpRatio, manaRatio, moveRatio,
        hpRowRef, manaRowRef, moveRowRef,
        audioCtxRef, isSoundEnabledRef
    });

    useEffect(() => {
        if (weather !== 'heavy-rain') { setLightning(false); return; }
        let timeoutId: any;
        const triggerLightning = () => { setLightning(true); setTimeout(() => setLightning(false), 100 + Math.random() * 150); timeoutId = setTimeout(triggerLightning, 2000 + Math.random() * 6000); };
        timeoutId = setTimeout(triggerLightning, 1000); return () => clearTimeout(timeoutId);
    }, [weather]);

    const getWordAtPoint = (x: number, y: number) => {
        let range: Range | null = null;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
        } else if ((document as any).caretPositionFromPoint) {
            const pos = (document as any).caretPositionFromPoint(x, y);
            if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
            }
        }

        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
            const node = range.startContainer;
            const content = node.textContent || '';
            const offset = range.startOffset;

            // Find start of word - handle characters/NPC names (\w plus some extras like -)
            let start = offset;
            while (start > 0 && /[\w-]/.test(content[start - 1])) start--;

            // Find end of word
            let end = offset;
            while (end < content.length && /[\w-]/.test(content[end])) end++;

            return content.slice(start, end).trim();
        }
        return null;
    };

    // --- Interaction Handlers ---


    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        // The user is touching/clicking the log. 
        // We MUST unlock immediately so heartbeat messages don't snap them back while they try to move.
        isLockedToBottomRef.current = false;

        // Also kill any active smooth-scroll animation so it doesn't fight the user's focus
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }
        isAutoScrollingRef.current = false;
    }, []);

    const handleLogClick = useCallback((e: React.MouseEvent) => {
        const now = Date.now();
        const delta = now - lastTapRef.current;
        lastTapRef.current = now;

        if (delta > 0 && delta < 400) {
            // Double Tap Detected
            triggerHaptic(45);

            // Try coordinate-based word lookup first (fast/reliable on mobile)
            const word = getWordAtPoint(e.clientX, e.clientY);
            if (word && word.length > 1) {
                setTarget(word);
                addMessage('system', `Target set to: ${word}`);
                window.getSelection()?.removeAllRanges();
                return;
            }

            // Fallback to selection
            setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection?.toString().trim();
                if (selectedText && selectedText.length > 0 && selectedText.length < 60) {
                    setTarget(selectedText);
                    addMessage('system', `Target set to: ${selectedText}`);
                    window.getSelection()?.removeAllRanges();
                }
            }, 100);
            return;
        }

        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        const targetEl = e.target as HTMLElement, btnEl = targetEl.closest('.inline-btn') as HTMLElement;
        if (btnEl && (btnEl.dataset.id || btnEl.dataset.cmd || btnEl.dataset.teleportId)) {
            e.stopPropagation();
            if (btn.isEditMode) btn.setEditingButtonId(btnEl.dataset.id);
            else {
                const action = btnEl.dataset.action;
                if (action === 'save-teleport' && btnEl.dataset.teleportId) {
                    const rect = btnEl.getBoundingClientRect();
                    setPopoverState({
                        x: Math.min(window.innerWidth - 220, Math.max(10, rect.left)),
                        y: Math.min(window.innerHeight - 300, rect.top + 25),
                        type: 'teleport-save',
                        setId: 'teleport',
                        teleportId: btnEl.dataset.teleportId
                    });
                    return;
                }
                if (action === 'menu' && btnEl.dataset.cmd) {
                    const rect = btnEl.getBoundingClientRect();
                    let popX = e.clientX || rect.left + 20;
                    if (popX > window.innerWidth - 220) popX = Math.max(10, window.innerWidth - 220);
                    let popY = e.clientY || rect.top;
                    if (popY > window.innerHeight - 350) popY = Math.max(10, window.innerHeight - 350);

                    setPopoverState({
                        x: popX,
                        y: popY,
                        setId: btnEl.dataset.cmd,
                        context: btnEl.dataset.context
                    });
                }
                else if (btnEl.dataset.cmd) executeCommand(btnEl.dataset.cmd);
                triggerHaptic(10);
            }
        }
    }, [triggerHaptic, addMessage, btn.isEditMode, executeCommand]);
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        // Selection targeting handle
        setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection?.toString().trim();
            if (selectedText && selectedText.length > 0 && selectedText.length < 60) {
                setTarget(selectedText);
                addMessage('system', `Target set to: ${selectedText}`);
                triggerHaptic(35);
                window.getSelection()?.removeAllRanges();
            }
        }, 150);
    }, [triggerHaptic, addMessage]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        // Fallback for desktop double-click event
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (selectedText && selectedText.length > 0 && selectedText.length < 60) {
            setTarget(selectedText);
            addMessage('system', `Target set to: ${selectedText}`);
            triggerHaptic(40);
            window.getSelection()?.removeAllRanges();
        }
    }, [triggerHaptic, addMessage]);

    const processMessageHtml = useCallback((html: string, mid?: string) => {
        let newHtml = html;

        const safeHighlight = (currentHtml: string, patternStr: string, replacer: (match: string) => string) => {
            try {
                const pattern = patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Match tags OR the word pattern. Tags are group 1, pattern is group 2.
                const regex = new RegExp(`(<[^>]+>)|(\\b${pattern}\\b)`, 'gi');
                return currentHtml.replace(regex, (m, g1, g2) => {
                    if (g1) return g1; // Return tag unchanged
                    return replacer(g2);
                });
            } catch (e) { return currentHtml; }
        };

        // 1. Highlight Current Target (Top priority)
        if (target) {
            newHtml = safeHighlight(newHtml, target, (m) =>
                `<span class="inline-btn target-highlight" data-id="target-hl" data-mid="${mid || ''}" data-cmd="target" data-context="${m}" data-action="menu">${m}</span>`
            );
        }

        // 2. Inline Highlight Buttons
        btn.buttonsRef.current.filter(b => b.display === 'inline' && b.trigger?.enabled && b.trigger.pattern).forEach(b => {
            newHtml = safeHighlight(newHtml, b.trigger!.pattern!, (m) => {
                return `<span class="inline-btn" data-id="${b.id}" data-mid="${mid || ''}" data-cmd="${b.command}" data-context="${m}" data-action="${b.actionType || 'command'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" style="background-color: ${b.style.backgroundColor}">${m}</span>`;
            });
        });

        // 3. Room Occupants (Auto-acquired highlights)
        // Sort by length longest-first so "Morgundul orc-guard" matches before "orc-guard"
        [...roomPlayers].filter(name => name !== characterName)
            .sort((a, b) => b.length - a.length)
            .forEach(name => {
                newHtml = safeHighlight(newHtml, name, (m) => {
                    return `<span class="inline-btn auto-occupant" data-id="auto-${name}" data-mid="${mid || ''}" data-cmd="inlineplayer" data-context="${m}" data-action="menu" style="background-color: rgba(100, 100, 255, 0.3); border-bottom: 1px dashed rgba(255,255,255,0.4)">${m}</span>`;
                });
            });

        // 4. Room Items
        [...roomItems].sort((a, b) => b.length - a.length)
            .forEach(name => {
                newHtml = safeHighlight(newHtml, name, (m) => {
                    return `<span class="inline-btn auto-item" data-id="auto-item-${name}" data-mid="${mid || ''}" data-cmd="selection" data-context="${m}" data-action="menu" style="background-color: rgba(100, 255, 100, 0.15); border-bottom: 1px dotted rgba(255,255,255,0.3)">${m}</span>`;
                });
            });

        return newHtml;
    }, [target, btn, roomPlayers, characterName, roomItems]);

    const getMessageClass = useCallback((index: number, total: number) => {
        const anchorIndex = focusedIndex !== null ? focusedIndex : total - 1;
        const distance = anchorIndex - index;

        // Spread out buckets to reduce class-swap frequency (improves perf)
        if (distance < 10) return 'msg-latest';
        if (distance < 30) return 'msg-recent';
        if (distance < 100) return 'msg-old';
        return 'msg-ancient';
    }, [focusedIndex]);

    // getButtonCommand moved to src/utils/buttonUtils.ts


    const handleButtonClick = (button: CustomButton, e: React.MouseEvent, context?: string) => {
        e.stopPropagation();
        if (btn.isEditMode) {
            if (wasDraggingRef.current) return;
            btn.setEditingButtonId(button.id);
        }
        else {
            if (popoverState) setPopoverState(null);
            const target = (e.currentTarget && (e.currentTarget as any).classList) ? (e.currentTarget as HTMLElement) : null;
            if (target) {
                target.classList.remove('btn-glow-active');
                void target.offsetWidth;
                target.classList.add('btn-glow-active');
            }
            triggerHaptic(15);

            let cmd = button.command;
            if (context) {
                // If command contains %n, replace it, otherwise append with space
                if (cmd.includes('%n')) cmd = cmd.replace(/%n/g, context);
                else cmd = `${cmd} ${context}`;
            }

            let finalCmd = cmd;
            if (joystick.currentDir) {
                const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
                const fullDir = dirMap[joystick.currentDir] || joystick.currentDir;
                finalCmd = `${finalCmd} ${fullDir}`;
                joystick.setIsJoystickConsumed(true);
            } else if (joystick.isTargetModifierActive && target) {
                finalCmd = `${finalCmd} ${target}`;
                joystick.setIsJoystickConsumed(true);
            }

            if (button.actionType === 'nav') btn.setActiveSet(button.command);
            else if (button.actionType === 'assign' || button.actionType === 'menu') {
                const rect = target ? target.getBoundingClientRect() : null;
                const x = rect ? rect.right + 10 : (e as any).clientX || window.innerWidth / 2;
                const y = rect ? rect.top : (e as any).clientY || window.innerHeight / 2;

                setPopoverState({
                    x,
                    y,
                    sourceHeight: rect?.height,
                    setId: button.command,
                    context: button.label,
                    assignSourceId: button.actionType === 'assign' ? button.id : undefined,
                    menuDisplay: button.menuDisplay,
                    initialPointerX: rect ? (rect.left + rect.width / 2) : (e as any).clientX,
                    initialPointerY: rect ? (rect.top + rect.height / 2) : (e as any).clientY
                });
            } else if (button.actionType === 'teleport-manage') {
                setPopoverState({
                    x: window.innerWidth / 2 - 150,
                    y: window.innerHeight / 2 - 150,
                    type: 'teleport-manage',
                    setId: 'teleport'
                });
            } else if (button.actionType === 'select-recipient') {
                const rect = target ? target.getBoundingClientRect() : null;
                setPopoverState({
                    x: rect ? rect.right + 10 : (e as any).clientX || window.innerWidth / 2,
                    y: rect ? rect.top : (e as any).clientY || window.innerHeight / 2,
                    sourceHeight: rect?.height,
                    type: 'give-recipient-select',
                    setId: button.setId || 'main',
                    context: finalCmd
                });
            } else if (button.actionType === 'preload') {
                // Preload: put only the button's command into the input, never append context
                setInput(button.command + ' ');
                const el = document.querySelector('input');
                if (el) el.focus();
            } else if (finalCmd === '__clear_target__' || button.command === '__clear_target__') {
                setTarget(null);
                addMessage('system', 'Target cleared.');
            } else {
                setCommandPreview(finalCmd);
                executeCommand(finalCmd, false, false);
                setTimeout(() => setCommandPreview(null), 150);

                // Auto-refresh drawers if interacting with inventory/equipment buttons
                if (button.setId === 'inventorylist' || button.setId === 'equipmentlist') {
                    // Slight delay to allow MUD to process the change
                    setTimeout(() => {
                        if (button.setId === 'inventorylist' || button.command.includes('remove')) {
                            executeCommand('inv', false, false, true);
                        }
                        if (button.setId === 'equipmentlist' || button.command.includes('wear') || button.command.includes('hold') || button.command.includes('wield')) {
                            executeCommand('eq', false, false, true);
                        }
                    }, 500);
                }
            }
            if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
            if (button.trigger?.closeKeyboard) {
                (document.activeElement as HTMLElement)?.blur();
            }
        }
    };






    useEffect(() => {
        btn.setAddMessage(addMessage);
        addMessage('system', 'Welcome to GEMINI MUD Client.');
        addMessage('system', `Default Target: ${DEFAULT_URL} `);
        setTimeout(() => connect(), 1000);
        return () => telnet.disconnect();
    }, []);


    useEffect(() => {
        const lastIdx = prevMessagesLengthRef.current;
        const newMessages = messages.slice(lastIdx);
        const hasNewMessage = newMessages.length > 0;

        prevMessagesLengthRef.current = messages.length;

        if (!hasNewMessage) return;

        // Slight delay ensures the DOM has calculated the new scrollHeight correctly.
        const timer = setTimeout(() => {
            const container = scrollContainerRef.current;
            if (!container) return;

            // SNAP LOGIC:
            // We should auto-scroll if:
            // 1. We were already at the bottom when the message arrived (isLockedToBottomRef)
            // 2. We are already mid-animation scrolling (Latching burst)
            // 3. The keyboard state just CHANGED (handled by separate effect)
            // Note: We remove isKeyboardOpen from here because it fights user manual scroll while they play.
            const shouldSnap = isLockedToBottomRef.current || isAutoScrollingRef.current;

            if (shouldSnap) {
                // Force snap to new content
                scrollToBottom(true, false);
            }
        }, 35); // Lowered delay for more immediate response to bursts
        return () => clearTimeout(timer);
    }, [messages, activePrompt, scrollToBottom, isKeyboardOpen]);


    // messages-based Spat buttons scanner moved to useSpatButtons hook

    const lastPopoverOpenTime = useRef<number>(0);
    useEffect(() => {
        if (popoverState) {
            lastPopoverOpenTime.current = Date.now();
            const handleClick = (e: MouseEvent) => {
                // Ignore if clicking inside a popover or dial menu
                if ((e.target as HTMLElement).closest('.popover-menu') || (e.target as HTMLElement).closest('.dial-menu-overlay')) return;

                // Shield against ghost clicks (events fired immediately after opening)
                if (Date.now() - lastPopoverOpenTime.current < 150) return;

                setPopoverState(null);
            };
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [popoverState]);

    // Auto-switch button sets based on combat state
    const prevInCombat = useRef(inCombat);
    useEffect(() => {
        if (prevInCombat.current !== inCombat) {
            if (inCombat && btn.combatSet) {
                btn.setActiveSet(btn.combatSet);
            } else if (!inCombat && btn.defaultSet && btn.combatSet && btn.activeSet === btn.combatSet) {
                // Switch back to default ONLY if we are currently on the combat set
                btn.setActiveSet(btn.defaultSet);
            }
            prevInCombat.current = inCombat;
        }
    }, [inCombat, btn.combatSet, btn.defaultSet, btn.activeSet]);





    return (
        <div
            className={`app-container ${isMobile ? 'is-mobile' : ''} ${btn.isEditMode ? 'edit-mode-active' : ''} ${isKeyboardOpen ? 'kb-open' : ''} ${popoverState ? 'has-popover' : ''}`}
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
            onClick={() => {
                if (btn.isEditMode) {
                    btn.setSelectedIds(new Set());
                    btn.setEditingButtonId(null);
                }
            }}
        >
            <div className={`app-content-shaker ${rumble ? 'rumble-active' : ''}`} style={{ flex: 1, position: 'relative' }}>

                <div className="background-layer" style={{ backgroundImage: `url(${bgImage})` }} />
                <EnvironmentEffects
                    lighting={lighting}
                    weather={weather}
                    isFoggy={isFoggy}
                    inCombat={inCombat}
                    hitFlash={hitFlash}
                    lightning={lightning}
                    deathStage={deathStage}
                />




                <div className="content-layer">
                    <Header
                        lighting={lighting}
                        weather={weather}
                        isFoggy={isFoggy}
                        inCombat={inCombat}
                        target={target}
                        activeSet={btn.activeSet}
                        isEditMode={btn.isEditMode}
                        getLightingIcon={getLightingIcon}
                        getWeatherIcon={getWeatherIcon}
                        setIsEditMode={btn.setIsEditMode}
                        setIsSettingsOpen={setIsSettingsOpen}
                        availableSets={btn.availableSets}
                        setActiveSet={btn.setActiveSet}
                        onOpenSetManager={() => setIsSetManagerOpen(true)}
                        onClearTarget={() => setTarget(null)}
                        onResetMap={() => {
                            triggerHaptic(20);
                            btn.setUiPositions(prev => ({ ...prev, mapper: { x: undefined, y: 75, w: 320, h: 320, scale: 1 } }));
                        }}
                        teleportTargetsCount={teleportTargets.length}
                        onTeleportClick={() => setPopoverState({
                            x: window.innerWidth / 2 - 150,
                            y: window.innerHeight / 2 - 150,
                            type: 'teleport-manage',
                            setId: 'teleport'
                        })}
                    />

                    <div className="message-log-container">
                        <MessageLog
                            messages={messages}
                            activePrompt={activePrompt}
                            inCombat={inCombat}
                            scrollContainerRef={scrollContainerRef}
                            messagesEndRef={messagesEndRef}
                            scrollToBottom={scrollToBottom}
                            onScroll={handleLogScroll}
                            onPointerDown={handleLogPointerDown}
                            onLogClick={handleLogClick}
                            onMouseUp={handleMouseUp}
                            onDoubleClick={handleDoubleClick}
                            getMessageClass={getMessageClass}
                            processMessageHtml={processMessageHtml}
                        />
                    </div>

                    <InputArea
                        input={input}
                        setInput={setInput}
                        onSend={handleSendCallback}
                        onSwipe={handleInputSwipe}
                        isMobile={isMobile}
                        commandPreview={commandPreview}
                        target={target}
                        onTargetClick={() => {
                            if (target) {
                                if (heldButton) {
                                    const hbtn = btn.buttons.find(b => b.id === heldButton.id); const newMods = [...heldButton.modifiers, target]; setHeldButton(prev => prev ? { ...prev, modifiers: newMods } : null); if (hbtn) setCommandPreview(getButtonCommand(hbtn, 0, 0, undefined, 0, newMods));
                                    triggerHaptic(20);
                                } else {
                                    setInput(prev => {
                                        const trimmed = prev.trim();
                                        return trimmed ? `${trimmed} ${target}` : target;
                                    });
                                }
                            }
                        }}
                        terrain={undefined}
                    />
                </div>


                {!isMobile && (
                    <div
                        className="mapper-cluster"
                        style={{
                            position: 'absolute',
                            left: (btn.uiPositions.mapper?.x !== undefined && btn.uiPositions.mapper.x < window.innerWidth - 100) ? btn.uiPositions.mapper.x : '50px',
                            top: btn.uiPositions.mapper?.y ?? (btn.uiPositions.mapper?.x === undefined ? '150px' : undefined),
                            bottom: (btn.uiPositions.mapper?.x !== undefined || btn.uiPositions.mapper?.y !== undefined) ? 'auto' : undefined,
                            right: (btn.uiPositions.mapper?.x !== undefined && btn.uiPositions.mapper.x < window.innerWidth - 100) ? 'auto' : undefined,
                            transform: btn.uiPositions.mapper?.scale ? `scale(${btn.uiPositions.mapper.scale})` : undefined,
                            transformOrigin: 'top left',
                            width: btn.uiPositions.mapper?.w ? `${btn.uiPositions.mapper.w}px` : '320px',
                            height: btn.uiPositions.mapper?.h ? `${btn.uiPositions.mapper.h}px` : '320px',
                            cursor: btn.isEditMode ? 'move' : undefined,
                            border: (btn.isEditMode && btn.dragState?.id === 'mapper') ? '2px dashed #ffff00' : (btn.isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined),
                            borderRadius: '12px',
                            overflow: 'visible',
                            zIndex: 300,
                            boxShadow: (btn.isEditMode && btn.dragState?.id === 'mapper') ? '0 0 30px rgba(255,255,0,0.4)' : undefined
                        }}
                        onPointerDown={(e) => {
                            if (btn.isEditMode) handleDragStart(e, 'mapper', 'cluster');
                        }}
                    >
                        <Mapper ref={mapperRef} isDesignMode={btn.isEditMode} characterName={characterName} isMmapperMode={isMmapperMode} isMobile={isMobile} isExpanded={isMapExpanded} />
                        {btn.isEditMode && <div className="resize-handle" style={{ zIndex: 101 }} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'mapper', 'cluster-resize'); }} />}
                    </div>
                )}
                <div
                    className="stats-cluster"
                    style={{
                        position: 'absolute',
                        left: btn.uiPositions.stats?.x,
                        top: btn.uiPositions.stats?.y ?? (btn.uiPositions.stats?.x === undefined ? '80px' : undefined),
                        bottom: (btn.uiPositions.stats?.x !== undefined || btn.uiPositions.stats?.y !== undefined) ? 'auto' : '10px',
                        right: (btn.uiPositions.stats?.x !== undefined || btn.uiPositions.stats?.y !== undefined) ? 'auto' : '10px',
                        transform: btn.uiPositions.stats?.scale ? `scale(${btn.uiPositions.stats.scale})` : undefined,
                        transformOrigin: 'top left',
                        cursor: btn.isEditMode ? 'move' : undefined,
                        border: (btn.isEditMode && btn.dragState?.id === 'stats') ? '2px dashed #ffff00' : (btn.isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined),
                        padding: btn.isEditMode ? '10px' : undefined,
                        borderRadius: '20px',
                        zIndex: 500,
                        display: isMobile ? 'none' : 'flex',
                        pointerEvents: 'auto'
                    }}
                    onPointerDown={(e) => {
                        if (btn.isEditMode) handleDragStart(e, 'stats', 'cluster');
                    }}
                >
                    {btn.isEditMode && <div className="resize-handle" onPointerDown={(e) => handleDragStart(e, 'stats', 'cluster-resize')} />}
                    <StatBars stats={stats} hpRowRef={hpRowRef} manaRowRef={manaRowRef} moveRowRef={moveRowRef} onClick={() => executeCommand('score')} onWimpyChange={handleWimpyChange} />
                </div>

                <div className="custom-buttons-layer" ref={customButtonsLayerRef}>
                    {btn.buttons.filter(b => (b.setId === btn.activeSet) && b.setId !== 'Xbox' && b.isVisible && b.display !== 'inline').map(button => (
                        <GameButton
                            key={button.id}
                            button={button}
                            isEditMode={btn.isEditMode}
                            isGridEnabled={btn.isGridEnabled}
                            gridSize={btn.gridSize}
                            isSelected={btn.selectedButtonIds.has(button.id)}
                            dragState={btn.dragState}
                            handleDragStart={handleDragStart}
                            handleButtonClick={handleButtonClick}
                            wasDraggingRef={wasDraggingRef}
                            triggerHaptic={triggerHaptic}
                            setPopoverState={setPopoverState}
                            setEditButton={(b) => {
                                btn.setEditingButtonId(b.id);
                                if (!btn.selectedButtonIds.has(b.id)) btn.setSelectedIds(new Set([b.id]));
                            }}
                            activePrompt={activePrompt}
                            executeCommand={executeCommand}
                            setCommandPreview={setCommandPreview}
                            setHeldButton={setHeldButton}
                            heldButton={heldButton}
                            joystick={{
                                currentDir: joystick.currentDir,
                                isTargetModifierActive: joystick.isTargetModifierActive,
                                setIsJoystickConsumed: joystick.setIsJoystickConsumed
                            }}
                            target={target}
                            setActiveSet={btn.setActiveSet}
                            setButtons={btn.setButtons}
                        />
                    ))}
                </div>

            </div> {/* Closes app-content-shaker */}

            <div className={`mobile-bottom-gutter ${isKeyboardOpen ? 'hidden' : ''} ${isMapExpanded ? 'map-expanded' : ''}`}>
                <div className="mobile-controls-row">
                    <div
                        className="joystick-cluster"
                        style={{
                            left: (btn.uiPositions.joystick?.x ?? '0'),
                            top: (btn.uiPositions.joystick?.y ?? '50%'),
                            transform: `translateY(-50%) ${btn.uiPositions.joystick?.scale ? `scale(${btn.uiPositions.joystick.scale})` : ''}`,
                            transformOrigin: 'center left',
                            zIndex: 100,
                            position: 'absolute',
                            cursor: btn.isEditMode ? 'move' : undefined,
                            border: (btn.isEditMode && btn.dragState?.id === 'joystick') ? '2px dashed #ffff00' : undefined,
                            borderRadius: '50%',
                            boxShadow: (btn.isEditMode && btn.dragState?.id === 'joystick') ? '0 0 30px rgba(255,255,0,0.4)' : undefined
                        }}
                        onPointerDown={(e) => {
                            if (btn.isEditMode) handleDragStart(e, 'joystick', 'cluster');
                        }}
                    >
                        <Joystick
                            joystickKnobRef={joystick.joystickKnobRef}
                            joystickGlow={joystickGlow}
                            btnGlow={btnGlow}
                            onJoystickStart={joystick.handleJoystickStart}
                            onJoystickMove={joystick.handleJoystickMove}
                            onJoystickEnd={(e) => joystick.handleJoystickEnd(e, (cmd) => executeCommand(cmd), triggerHaptic, setJoystickGlow)}
                            onNavStart={joystick.handleNavStart}
                            onNavEnd={(dir) => joystick.handleNavEnd(dir, executeCommand, triggerHaptic, setBtnGlow)}
                            isTargetModifierActive={joystick.isTargetModifierActive}
                        />
                    </div>

                    <div
                        className="xbox-cluster"
                        style={{
                            right: (btn.uiPositions.xbox?.x ?? '0'),
                            top: (btn.uiPositions.xbox?.y ?? '50%'),
                            transform: `translateY(-50%) ${btn.uiPositions.xbox?.scale ? `scale(${btn.uiPositions.xbox.scale})` : ''}`,
                            transformOrigin: 'center right',
                            zIndex: 100,
                            position: 'absolute',
                            cursor: btn.isEditMode ? 'move' : undefined,
                            border: (btn.isEditMode && btn.dragState?.id === 'xbox') ? '2px dashed #ffff00' : undefined,
                            borderRadius: '50%',
                            boxShadow: (btn.isEditMode && btn.dragState?.id === 'xbox') ? '0 0 30px rgba(255,255,0,0.4)' : undefined
                        }}
                        onPointerDown={(e) => {
                            if (btn.isEditMode) handleDragStart(e, 'xbox', 'cluster');
                        }}
                    >
                        {btn.isEditMode && <div className="resize-handle" style={{ top: '-10px', right: '-10px' }} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'xbox', 'cluster-resize'); }} />}
                        {['xbox-y', 'xbox-b', 'xbox-a', 'xbox-x', 'xbox-z'].map(id => {
                            const button = btn.buttons.find(b => b.id === id);
                            if (!button) return null;
                            const posClass = id === 'xbox-y' ? 'top' : id === 'xbox-b' ? 'right' : id === 'xbox-a' ? 'bottom' : id === 'xbox-x' ? 'left' : 'center';
                            return (
                                <GameButton
                                    key={id}
                                    button={button}
                                    className={`xbox-btn ${posClass}`}
                                    useDefaultPositioning={false}
                                    isEditMode={btn.isEditMode}
                                    isGridEnabled={btn.isGridEnabled}
                                    gridSize={btn.gridSize}
                                    isSelected={btn.selectedButtonIds.has(button.id)}
                                    dragState={btn.dragState}
                                    handleDragStart={handleDragStart}
                                    handleButtonClick={handleButtonClick}
                                    wasDraggingRef={wasDraggingRef}
                                    triggerHaptic={triggerHaptic}
                                    setPopoverState={setPopoverState}
                                    setEditButton={(b) => {
                                        btn.setEditingButtonId(b.id);
                                        if (!btn.selectedButtonIds.has(b.id)) btn.setSelectedIds(new Set([b.id]));
                                    }}
                                    activePrompt={activePrompt}
                                    executeCommand={executeCommand}
                                    setCommandPreview={setCommandPreview}
                                    setHeldButton={setHeldButton}
                                    heldButton={heldButton}
                                    joystick={{
                                        currentDir: joystick.currentDir,
                                        isTargetModifierActive: joystick.isTargetModifierActive,
                                        setIsJoystickConsumed: joystick.setIsJoystickConsumed
                                    }}
                                    target={target}
                                    setActiveSet={btn.setActiveSet}
                                    setButtons={btn.setButtons}
                                />
                            );
                        })}

                    </div>

                </div>

                {isMobile && (
                    <div className={`mobile-mini-map ${isMapExpanded ? 'expanded' : ''}`} onClick={() => { if (popoverState) setPopoverState(null); }}>
                        <Mapper ref={mapperRef} isDesignMode={btn.isEditMode} characterName={characterName} isMmapperMode={isMmapperMode} isMobile={isMobile} isExpanded={isMapExpanded} />
                    </div>
                )}
            </div>

            {/* spatButtons map logic moved to SpatButtons component */}
            <SpatButtons
                spatButtons={spatButtons}
                isMobile={isMobile}
                setActiveSet={btn.setActiveSet}
                executeCommand={executeCommand}
                setSpatButtons={setSpatButtons}
            />


            {btn.isEditMode && <div className="add-btn-fab" onClick={() => btn.createButton()}><Plus size={32} /></div>}

            <PopoverManager
                popoverState={popoverState}
                setPopoverState={setPopoverState}
                popoverRef={popoverRef}
                buttons={btn.buttons}
                setButtons={btn.setButtons}
                availableSets={btn.availableSets}
                executeCommand={executeCommand}
                addMessage={addMessage}
                setTarget={setTarget}
                teleportTargets={teleportTargets}
                setTeleportTargets={setTeleportTargets}
                handleButtonClick={handleButtonClick}
                triggerHaptic={triggerHaptic}
                roomPlayers={roomPlayers}
            />


            {
                isSettingsOpen && (
                    <SettingsModal
                        connectionUrl={connectionUrl}
                        setConnectionUrl={setConnectionUrl}
                        bgImage={bgImage}
                        setBgImage={setBgImage}
                        handleFileUpload={handleFileUpload}
                        exportSettings={exportSettings}
                        importSettings={importSettings}
                        isLoading={isLoading}
                        newSoundPattern={newSoundPattern}
                        setNewSoundPattern={setNewSoundPattern}
                        newSoundRegex={newSoundRegex}
                        setNewSoundRegex={setNewSoundRegex}
                        handleSoundUpload={handleSoundUpload}
                        soundTriggers={soundTriggers}
                        deleteSound={(id) => setSoundTriggers(prev => prev.filter(s => s.id !== id))}
                        resetButtons={btn.resetToDefaults}
                        hasUserDefaults={btn.hasUserDefaults}
                        connect={connect}
                        loginName={loginName}
                        setLoginName={setLoginName}
                        loginPassword={loginPassword}
                        setLoginPassword={setLoginPassword}
                    />
                )
            }

            {
                btn.editingButtonId && (() => {
                    const editingButton = btn.buttons.find(b => b.id === btn.editingButtonId);
                    if (!editingButton) return null;
                    return (
                        <EditButtonModal
                            editingButton={editingButton}
                            setEditingButtonId={btn.setEditingButtonId}
                            deleteButton={btn.deleteButton}
                            setButtons={btn.setButtons}
                            availableSets={btn.availableSets}
                            selectedButtonIds={btn.selectedButtonIds}
                        />
                    );
                })()
            }

            {
                btn.isEditMode && btn.isGridEnabled && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        pointerEvents: 'none',
                        zIndex: 5,
                        backgroundImage: `
                            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: `${btn.gridSize}% ${btn.gridSize}%`
                    }} />
                )
            }

            {
                isSetManagerOpen && (
                    <SetManagerModal
                        buttons={btn.buttons}
                        availableSets={btn.availableSets}
                        onClose={() => setIsSetManagerOpen(false)}
                        onEditButton={(id, currentSet) => {
                            setManagerSelectedSet(currentSet);
                            setReturnToManager(true);
                            setIsSetManagerOpen(false);
                            btn.setEditingButtonId(id);
                        }}
                        onDeleteButton={btn.deleteButton}
                        onDeleteSet={btn.deleteSet}
                        onCreateButton={btn.createButton}
                        onSaveAsDefault={btn.saveAsDefault}
                        onSaveAsCoreDefault={btn.saveAsCoreDefault}
                        combatSet={btn.combatSet}
                        defaultSet={btn.defaultSet}
                        onSetCombatSet={btn.setCombatSet}
                        onSetDefaultSet={btn.setDefaultSet}
                        lastSelectedSet={managerSelectedSet}
                        onSelectedSetChange={setManagerSelectedSet}
                        isGridEnabled={btn.isGridEnabled}
                        onToggleGrid={btn.setIsGridEnabled}
                        gridSize={btn.gridSize}
                        onGridSizeChange={btn.setGridSize}
                    />
                )
            }

            <DrawerManager
                isMobile={isMobile}
                drawers={{
                    inventory: { isOpen: isInventoryOpen, setOpen: setIsInventoryOpen },
                    character: { isOpen: isCharacterOpen, setOpen: setIsCharacterOpen },
                    right: { isOpen: isRightDrawerOpen, setOpen: setIsRightDrawerOpen }
                }}
                triggerHaptic={triggerHaptic}
                statsHtml={statsHtml}
                mood={mood}
                setMood={setMood}
                spellSpeed={spellSpeed}
                setSpellSpeed={setSpellSpeed}
                alertness={alertness}
                setAlertness={setAlertness}
                playerPosition={playerPosition}
                setPlayerPosition={setPlayerPosition}
                executeCommand={executeCommand}
                stats={stats}
                hpRowRef={hpRowRef}
                manaRowRef={manaRowRef}
                moveRowRef={moveRowRef}
                handleWimpyChange={handleWimpyChange}
                eqHtml={eqHtml}
                inventoryHtml={inventoryHtml}
                handleLogClick={handleLogClick}
            />
            <SwipeFeedbackOverlay />
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <GameProvider>
        <MudClient />
    </GameProvider>
);
