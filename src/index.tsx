import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, User, Backpack, X } from 'lucide-react';

import './index.css';
import {
    MessageType, LightingType, WeatherType, Direction, DeathStage,
    Message, GameStats, CustomButton, SoundTrigger, PopoverState, SavedSettings, TeleportTarget, SwipeDirection,
    GmcpCharVitals, GmcpRoomInfo, GmcpRoomPlayers, GmcpRoomItems, GmcpOccupant, GmcpExitInfo
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
import { useMessageHighlighter } from './hooks/useMessageHighlighter';

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
    onRoomUpdateExits: (data: any) => void;
    onCharVitals: (data: any) => void;
    onRoomPlayers: (data: any) => void;
    onRoomNpcs: (data: any) => void;
    onRoomItems: (data: any) => void;
    onAddPlayer: (data: any) => void;
    onAddNpc: (data: any) => void;
    onRemovePlayer: (data: any) => void;
    onRemoveNpc: (data: any) => void;
}

const MudClient = () => {
    // --- State ---
    const [input, setInput] = useState('');
    const [activePrompt, setActivePrompt] = useState<string>('');
    // bgImage, connectionUrl, loginName, loginPassword → useSettings hook below
    // isNoviceMode → GameContext
    const {
        isNoviceMode, setIsNoviceMode,
        theme, setTheme,
        isMmapperMode, setIsMmapperMode,
        status, setStatus,
        target, setTarget,
        popoverState, setPopoverState,
        isSettingsOpen, setIsSettingsOpen,
        settingsTab, setSettingsTab,
        accentColor, setAccentColor,
        stats, setStats,
        inCombat, setInCombat,
        lightning, setLightning,
        weather, setWeather,
        isFoggy, setIsFoggy,
        abilities, setAbilities,
        characterClass, setCharacterClass
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
    const [ui, setUI] = useState({
        drawer: 'none' as 'none' | 'inventory' | 'character' | 'right',
        setManagerOpen: false,
        mapExpanded: false
    });
    const [currentTerrain, setCurrentTerrain] = useState<string>('city');

    // Backward compatibility helpers
    const isInventoryOpen = ui.drawer === 'inventory';
    const isCharacterOpen = ui.drawer === 'character';
    const isRightDrawerOpen = ui.drawer === 'right';
    const isMapExpanded = ui.mapExpanded;
    const isSetManagerOpen = ui.setManagerOpen;

    const setIsInventoryOpen = (open: boolean | ((p: boolean) => boolean)) =>
        setUI(prev => ({ ...prev, drawer: (typeof open === 'function' ? open(prev.drawer === 'inventory') : open) ? 'inventory' : 'none' }));
    const setIsCharacterOpen = (open: boolean | ((p: boolean) => boolean)) =>
        setUI(prev => ({ ...prev, drawer: (typeof open === 'function' ? open(prev.drawer === 'character') : open) ? 'character' : 'none' }));
    const setIsRightDrawerOpen = (open: boolean | ((p: boolean) => boolean)) =>
        setUI(prev => ({ ...prev, drawer: (typeof open === 'function' ? open(prev.drawer === 'right') : open) ? 'right' : 'none' }));
    const setIsMapExpanded = (open: boolean | ((p: boolean) => boolean)) =>
        setUI(prev => ({ ...prev, mapExpanded: typeof open === 'function' ? open(prev.mapExpanded) : open }));
    const setIsSetManagerOpen = (open: boolean | ((p: boolean) => boolean)) =>
        setUI(prev => ({ ...prev, setManagerOpen: typeof open === 'function' ? open(prev.setManagerOpen) : open }));
    const [returnToManager, setReturnToManager] = useState(false);
    const [managerSelectedSet, setManagerSelectedSet] = useState<string | null>(null);

    const [rumble, setRumble] = useState(false);
    const [hitFlash, setHitFlash] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [deathStage, setDeathStage] = useState<DeathStage>('none');
    const [isLoading, setIsLoading] = useState(false);
    // soundTriggers, newSoundPattern, newSoundRegex, isSoundEnabled → useSettings hook below
    // isSoundEnabledRef → useSettings hook below
    const [joystickGlow, setJoystickGlow] = useState(false);
    const [btnGlow, setBtnGlow] = useState<{ up: boolean, down: boolean }>({ up: false, down: false });

    // inventoryHtml, statsHtml, eqHtml → useGameParser hook below

    const [heldButton, setHeldButton] = useState<{ id: string, baseCommand: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean } | null>(null);
    const heldButtonRef = useRef(heldButton);
    useEffect(() => { heldButtonRef.current = heldButton; }, [heldButton]);
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
    const [roomNpcs, setRoomNpcs] = useState<string[]>([]);
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
    // inCombat state is now managed directly in GameContext via setInCombat.
    // The previous setInCombat helper in index.tsx is removed as inCombatRef.current 
    // is also no longer needed (setInCombat in context updates all listeners).

    const { messages, setMessages, addMessage, isCombatLine, isCommunicationLine } = useMessageLog(inCombatRef);

    // --- Scroll & Viewport ---
    const viewport = useViewport();
    const { isMobile, isLandscape, isKeyboardOpen, scrollContainerRef, scrollAnimationRef, isAutoScrollingRef,
        isLockedToBottomRef, scrollToBottom } = viewport;

    // --- Environment & Settings Hooks ---
    const env = useEnvironment();
    const { lighting, getLightingIcon, getWeatherIcon,
        mood, setMood, spellSpeed, setSpellSpeed, alertness, setAlertness,
        detectLighting } = env;

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
    const exportSettings = () => exportSettingsFile(btn.rawButtons);
    const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => settingsHook.importSettings(e, setIsSettingsOpen);
    useEffect(() => { soundTriggersRef.current = soundTriggers; }, [soundTriggers]);

    // --- Game Parser Hook ---
    const parser = useGameParser({
        addMessage,
        playSound,
        triggerHaptic,
        setWeather,
        setIsFoggy,
        setStats,
        setAbilities,
        setCharacterClass,
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

    const { processMessageHtml } = useMessageHighlighter(target, btn.buttonsRef, roomPlayers, roomNpcs, characterName, roomItems);

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
            if (characterName && name !== characterName) {
                setAbilities({});
                addMessage('system', `Character changed to ${name}. Abilities reset.`);
            }
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
            onRoomInfo: (data: GmcpRoomInfo) => {
                notifyMapper(ref => ref.current?.handleRoomInfo(data));
                const terrain = data.terrain || data.environment;
                if (terrain) setCurrentTerrain(terrain);
            },
            onRoomUpdateExits: (data: Record<string, GmcpExitInfo | false>) => notifyMapper(ref => ref.current?.handleUpdateExits(data)),
            onCharVitals: (data: GmcpCharVitals) => {
                if (data.terrain) {
                    notifyMapper(ref => ref.current?.handleTerrain(data.terrain));
                    setCurrentTerrain(data.terrain);
                }
            },
            onRoomPlayers: (data: GmcpRoomPlayers | (string | GmcpOccupant)[]) => {
                let players: string[] = [];
                const parseOccupant = (p: string | GmcpOccupant): string | null => {
                    if (typeof p === 'string') return p;
                    return p.name || p.keyword || p.short || p.shortdesc || null;
                };
                if (Array.isArray(data)) players = data.map(parseOccupant).filter(Boolean) as string[];
                else players = (data.players || data.members || []).map(parseOccupant).filter(Boolean) as string[];
                setRoomPlayers(players);
            },
            onRoomNpcs: (data: GmcpRoomPlayers | (string | GmcpOccupant)[]) => {
                let npcs: string[] = [];
                const parseOccupant = (p: string | GmcpOccupant): string | null => {
                    if (typeof p === 'string') return p;
                    return p.name || p.keyword || p.short || p.shortdesc || null;
                };

                const items = Array.isArray(data) ? data : (data.chars || []);
                npcs = items.map(parseOccupant).filter(Boolean) as string[];

                setRoomNpcs(npcs);
            },
            onRoomItems: (data: GmcpRoomItems | (string | GmcpOccupant)[]) => {
                let items: string[] = [];
                const parseItem = (i: string | GmcpOccupant): string[] => {
                    if (typeof i === 'string') return [i];
                    const names = [];
                    if (i.name) names.push(i.name);
                    if (i.short) names.push(i.short);
                    if (i.shortdesc) names.push(i.shortdesc);
                    return names;
                };
                if (Array.isArray(data)) items = data.flatMap(parseItem).filter(Boolean);
                else items = (data.items || data.objects || []).flatMap(parseItem).filter(Boolean);
                setRoomItems(items);
            },
            onAddPlayer: (data: string | GmcpOccupant) => {
                const name = typeof data === 'string' ? data : data.name;
                if (name) setRoomPlayers(prev => prev.includes(name) ? prev : [...prev, name]);
            },
            onAddNpc: (data: string | GmcpOccupant) => {
                const parseOccupant = (p: string | GmcpOccupant): string | null => {
                    if (typeof p === 'string') return p;
                    return p.name || p.keyword || p.short || p.shortdesc || null;
                };
                const name = parseOccupant(data);
                if (name) setRoomNpcs(prev => prev.includes(name) ? prev : [...prev, name]);
            },
            onRemovePlayer: (data: string | GmcpOccupant) => {
                const name = typeof data === 'string' ? data : data.name;
                if (name) setRoomPlayers(prev => prev.filter(p => p !== name));
            },
            onRemoveNpc: (data: string | GmcpOccupant) => {
                const name = typeof data === 'string' ? data : data.name;
                if (name) setRoomNpcs(prev => prev.filter(p => p !== name));
            }
        };
    }, [setRoomPlayers, setRoomItems, addMessage, btn]);

    const connect = () => {
        initAudio();

        telnet.connect({
            onRoomInfo: (data) => callbacksRef.current?.onRoomInfo && callbacksRef.current.onRoomInfo(data),
            onRoomUpdateExits: (data) => callbacksRef.current?.onRoomUpdateExits && callbacksRef.current.onRoomUpdateExits(data),
            onCharVitals: (data) => callbacksRef.current?.onCharVitals && callbacksRef.current.onCharVitals(data),
            onRoomPlayers: (data) => callbacksRef.current?.onRoomPlayers && callbacksRef.current.onRoomPlayers(data),
            onRoomNpcs: (data) => callbacksRef.current?.onRoomNpcs && callbacksRef.current.onRoomNpcs(data),
            onAddPlayer: (data) => callbacksRef.current?.onAddPlayer && callbacksRef.current.onAddPlayer(data),
            onAddNpc: (data) => callbacksRef.current?.onAddNpc && callbacksRef.current.onAddNpc(data),
            onRemovePlayer: (data) => callbacksRef.current?.onRemovePlayer && callbacksRef.current.onRemovePlayer(data),
            onRemoveNpc: (data) => callbacksRef.current?.onRemoveNpc && callbacksRef.current.onRemoveNpc(data),
            onRoomItems: (data) => callbacksRef.current?.onRoomItems && callbacksRef.current.onRoomItems(data),
        });
    };

    const { executeCommand, handleButtonClick, handleInputSwipe } = useCommandController({
        telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets,
        isDrawerCapture, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        setInventoryHtml, setStatsHtml, setEqHtml, setCommandPreview, setInput, setTarget,
        setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen, setIsMapExpanded,
        isMobile, triggerHaptic, btn, joystick, wasDraggingRef
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

        // If tapping an interactive element in the log, prevent focus shift to avoid opening keyboard
        if ((e.target as HTMLElement).closest('.inline-btn') && e.cancelable) {
            e.preventDefault();
        }

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
            className={`app-container ${theme}-mode ${isMobile ? 'is-mobile' : 'is-desktop'} ${isLandscape ? 'is-landscape' : ''} ${btn.isEditMode ? 'edit-mode-active' : ''} ${isKeyboardOpen ? 'kb-open' : ''} ${popoverState ? 'has-popover' : ''}`}
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
            onClick={() => {
                if (btn.isEditMode) {
                    btn.setSelectedIds(new Set());
                    btn.setEditingButtonId(null);
                }
            }}
        >
            <div className={`app-content-shaker ${rumble ? 'rumble-active' : ''}`} style={{ flex: 1, position: 'relative' }}>

                <div className="background-layer" style={{
                    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                    display: bgImage ? 'block' : 'none'
                }} />
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
                        isLandscape={isLandscape}
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
                                    const hbtn = btn.buttons.find(b => b.id === heldButton.id); const newMods = [...heldButton.modifiers, target]; setHeldButton(prev => prev ? { ...prev, modifiers: newMods } : null); if (hbtn) setCommandPreview(getButtonCommand(hbtn, 0, 0, undefined, 0, newMods)?.cmd || null);
                                    triggerHaptic(20);
                                } else {
                                    setInput(prev => {
                                        const trimmed = prev.trim();
                                        return trimmed ? `${trimmed} ${target}` : target;
                                    });
                                }
                            }
                        }}
                        terrain={currentTerrain}
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
                            zIndex: 1600,
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
                        zIndex: 1600,
                        display: isMobile ? 'none' : 'flex',
                        pointerEvents: 'auto'
                    }}
                    onPointerDown={(e) => {
                        if (btn.isEditMode) handleDragStart(e, 'stats', 'cluster');
                    }}
                >
                    {btn.isEditMode && <div className="resize-handle" onPointerDown={(e) => handleDragStart(e, 'stats', 'cluster-resize')} />}
                    <StatBars
                        stats={stats}
                        hpRowRef={hpRowRef}
                        manaRowRef={manaRowRef}
                        moveRowRef={moveRowRef}
                        onPointerDown={(e) => {
                            if (e.cancelable) e.preventDefault();
                        }}
                        onClick={() => executeCommand('score')}
                        onWimpyChange={handleWimpyChange}
                    />
                </div>

                <div className="custom-buttons-layer" ref={customButtonsLayerRef}>
                    {btn.buttons.filter(b => {
                        const inCurrentSet = b.setId === btn.activeSet && b.setId !== 'Xbox' && b.display !== 'inline';
                        if (btn.isEditMode) return inCurrentSet;
                        return inCurrentSet && b.isVisible;
                    }).map(button => (
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
                                isActive: joystick.joystickActive,
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

                <div className={`mobile-bottom-gutter ${isKeyboardOpen ? 'hidden' : ''} ${isMapExpanded ? 'map-expanded' : ''}`}>
                    {isMobile && (
                        <div className={`mobile-mini-map ${isMapExpanded ? 'expanded' : ''}`}>
                            <Mapper
                                ref={mapperRef}
                                isDesignMode={btn.isEditMode}
                                characterName={characterName}
                                isMmapperMode={isMmapperMode}
                                isMobile={isMobile}
                                isExpanded={isMapExpanded}
                            />
                        </div>
                    )}
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
                                else if (e.cancelable) e.preventDefault();
                            }}
                        >
                            <Joystick
                                joystickKnobRef={joystick.joystickKnobRef}
                                joystickGlow={joystickGlow}
                                btnGlow={btnGlow}
                                onJoystickStart={joystick.handleJoystickStart}
                                onJoystickMove={joystick.handleJoystickMove}
                                onJoystickEnd={(e) => {
                                    const currentHeld = heldButtonRef.current;
                                    const isCenterTap = joystick.handleJoystickEnd(e, (cmd) => executeCommand(cmd), triggerHaptic, setJoystickGlow, !!currentHeld);
                                    if (isCenterTap && currentHeld && currentHeld.dx !== undefined && currentHeld.dy !== undefined) {
                                        const button = btn.buttons.find(b => b.id === currentHeld.id);
                                        if (button) {
                                            const result = getButtonCommand(button, currentHeld.dx, currentHeld.dy, undefined, undefined, currentHeld.modifiers, joystick, target, true);
                                            if (result) {
                                                // Defuse the button so it doesn't fire again on release
                                                const el = document.querySelector(`[data-id="${button.id}"]`) as any;
                                                if (el) el._didFire = true;

                                                if (result.actionType === 'nav') btn.setActiveSet(result.cmd);
                                                else if (result.actionType === 'assign' || result.actionType === 'menu' || result.actionType === 'select-assign') {
                                                    const rect = el?.getBoundingClientRect();
                                                    setPopoverState({
                                                        x: rect ? rect.right + 10 : window.innerWidth / 2,
                                                        y: rect ? rect.top : window.innerHeight / 2,
                                                        setId: result.cmd,
                                                        context: result.actionType === 'select-assign' ? result.modifiers : button.label,
                                                        assignSourceId: button.id,
                                                        assignSwipeDir: result.dir,
                                                        executeAndAssign: result.actionType === 'select-assign',
                                                        menuDisplay: button.menuDisplay,
                                                        initialPointerX: rect ? (rect.left + rect.width / 2) : 0,
                                                        initialPointerY: rect ? (rect.top + rect.height / 2) : 0
                                                    });
                                                } else {
                                                    executeCommand(result.cmd);
                                                }

                                                setHeldButton(null);
                                                setCommandPreview(null);
                                                triggerHaptic(50);
                                            }
                                        }
                                    }
                                }}
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
                                else if (e.cancelable) e.preventDefault();
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
                                            isActive: joystick.joystickActive,
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
                </div>
            </div> {/* Closes app-content-shaker */}

            {/* spatButtons map logic moved to SpatButtons component */}
            <SpatButtons
                spatButtons={spatButtons}
                isMobile={isMobile}
                setActiveSet={btn.setActiveSet}
                executeCommand={executeCommand}
                setSpatButtons={setSpatButtons}
            />


            {btn.isEditMode && <div className="add-btn-fab" onClick={(e) => { e.stopPropagation(); btn.createButton(); }}><Plus size={32} /></div>}
            {btn.isEditMode && (
                <div
                    className="exit-design-mode-fab"
                    onClick={() => btn.setIsEditMode(false)}
                    title="Exit Design Mode"
                >
                    <X size={32} />
                </div>
            )}

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


            {/* Desktop Edge Tabs */}
            {!isMobile && (
                <>
                    <div
                        className={`desktop-edge-tab left ${isCharacterOpen ? 'active' : ''}`}
                        style={{ zIndex: 2100, pointerEvents: 'auto' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log("Left Tab Clicked, isCharacterOpen:", isCharacterOpen);
                            triggerHaptic(20);
                            if (!isCharacterOpen) {
                                setStatsHtml(''); // Clear old
                                executeCommand('stat', false, true, true, true);
                            }
                            setIsCharacterOpen(!isCharacterOpen);
                        }}
                        title="Character Panel"
                    >
                        <User className="tab-icon" />
                        <span className="tab-text">Character</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${isRightDrawerOpen ? 'active' : ''}`}
                        style={{ zIndex: 2100, pointerEvents: 'auto' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log("Right Tab Clicked, Open state:", isRightDrawerOpen);
                            triggerHaptic(20);
                            if (isRightDrawerOpen) {
                                setIsRightDrawerOpen(false);
                            } else {
                                setInventoryHtml(''); setEqHtml('');
                                executeCommand('inventory', false, true, true, true);
                                setTimeout(() => executeCommand('eq', false, true, true, true), 300);
                                setIsRightDrawerOpen(true);
                            }
                        }}
                        title="Inventory & Equipment"
                    >
                        <Backpack className="tab-icon" />
                        <span className="tab-text">Inventory</span>
                    </div>
                </>
            )}

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
                    const editingButton = btn.rawButtons.find(b => b.id === btn.editingButtonId);
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
                        buttons={btn.rawButtons}
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
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(
    <GameProvider>
        <MudClient />
    </GameProvider>
);
