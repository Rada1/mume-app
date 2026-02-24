import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Sun, Moon, Zap, EyeOff, CloudRain, CloudLightning, Snowflake, CloudFog, Plus } from 'lucide-react';

import './index.css';
import {
    MessageType, LightingType, WeatherType, Direction, DeathStage,
    Message, GameStats, CustomButton, SoundTrigger, PopoverState, SavedSettings
} from './types';
import {
    DEFAULT_BG, DEATH_IMG, DEFAULT_URL, FX_THRESHOLD
} from './constants';
import { ansiConvert } from './utils/ansi';

import { useButtons } from './hooks/useButtons';
import { useTelnet } from './hooks/useTelnet';
import { useSoundSystem } from './hooks/useSoundSystem';
import { useJoystick } from './hooks/useJoystick';

import Rain from './components/Rain';
import StatBars from './components/StatBars';
import Joystick from './components/Joystick';
import MessageLog from './components/MessageLog';
import InputArea from './components/InputArea';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import EditButtonModal from './components/EditButtonModal';
import SetManagerModal from './components/SetManagerModal';
import { Mapper, MapperRef } from './components/Mapper';







const numToWord = (n: number) => {
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
    return words[n] || n.toString();
};

const pluralizeMumeSubject = (subject: string) => {
    let s = subject.trim();
    // Strip "A " or "An " or "The "
    const prefixMatch = s.match(/^(A|An|The)\s+(.+)$/i);
    let rest = s;
    if (prefixMatch) rest = prefixMatch[2];

    const lower = rest.toLowerCase();
    if (lower.endsWith('wolf')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('elf')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('thief')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('man')) return rest.slice(0, -2) + 'en';
    if (lower.endsWith('woman')) return rest.slice(0, -2) + 'en';
    if (lower.endsWith('child')) return rest + 'ren';
    if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower)) return rest.slice(0, -1) + 'ies';
    if (/[sxz]$|ch$|sh$/i.test(lower)) return rest + 'es';
    return rest + 's';
};

const ARRIVE_REGEX = /^(.+)\s+(has arrived from|arrives from)\s+(the\s+)?(.+)\.?$/i;
const LEAVE_REGEX = /^(.+)\s+leaves\s+(the\s+)?(.+)\.?$/i;
const HERE_REGEX = /^(.+)\s+(is here|is standing here|is resting here|is sleeping here|is sitting here)\s*\.?$/i;
const NPC_LINE_REGEX = /^((?:A|An|The)\s+[\w\s-]+?)\s+(\w+s)\b\s*(.*)$/i;

const pluralizeVerb = (verb: string) => {
    const v = verb.toLowerCase();
    if (v === 'is') return 'are';
    if (v === 'has') return 'have';
    if (v === 'was') return 'were';
    if (v.endsWith('es')) {
        const base = v.slice(0, -2);
        if (base.endsWith('sh') || base.endsWith('ch') || base.endsWith('s') || base.endsWith('x') || base.endsWith('z')) {
            return verb.slice(0, -2);
        }
    }
    if (v.endsWith('s') && !v.endsWith('ss')) return verb.slice(0, -1);
    return verb;
};

const pluralizeRest = (text: string) => {
    return text.replace(/\bits\b/g, 'their')
        .replace(/\bhimself\b/g, 'themselves')
        .replace(/\bherself\b/g, 'themselves')
        .replace(/\bitself\b/g, 'themselves')
        .replace(/\bhis\b/g, 'their')
        .replace(/\bher\b/g, 'their');
};

const MudClient = () => {
    // --- State ---
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [activePrompt, setActivePrompt] = useState<string>('');
    const [bgImage, setBgImage] = useState(DEFAULT_BG);
    const [connectionUrl, setConnectionUrl] = useState(DEFAULT_URL);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'general' | 'sound'>('general');
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [lighting, setLighting] = useState<LightingType>('none');
    const [weather, setWeather] = useState<'none' | 'cloud' | 'rain' | 'heavy-rain' | 'snow'>('none');
    const [isFoggy, setIsFoggy] = useState(false);
    const [mood, setMood] = useState('normal');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');


    // UI Layout State
    const [isSetManagerOpen, setIsSetManagerOpen] = useState(false);

    const [rumble, setRumble] = useState(false);
    const [hitFlash, setHitFlash] = useState(false);
    const [inCombat, setInCombatState] = useState(false);
    const [lightning, setLightning] = useState(false);
    const [target, setTarget] = useState<string | null>(null);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [deathStage, setDeathStage] = useState<DeathStage>('none');
    const [stats, setStats] = useState<GameStats>({
        hp: 100, maxHp: 100,
        mana: 100, maxMana: 100,
        move: 100, maxMove: 100
    });
    const [isLoading, setIsLoading] = useState(false);
    const [soundTriggers, setSoundTriggers] = useState<SoundTrigger[]>([]);
    const [newSoundPattern, setNewSoundPattern] = useState('');
    const [newSoundRegex, setNewSoundRegex] = useState(false);
    const [joystickGlow, setJoystickGlow] = useState(false);
    const [btnGlow, setBtnGlow] = useState<{ up: boolean, down: boolean }>({ up: false, down: false });
    const [popoverState, setPopoverState] = useState<PopoverState | null>(null);

    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isCharacterOpen, setIsCharacterOpen] = useState(false);
    const [inventoryHtml, setInventoryHtml] = useState('');
    const [statsHtml, setStatsHtml] = useState('');
    const [eqHtml, setEqHtml] = useState('');

    const [spatButtons, setSpatButtons] = useState<{ id: string, btnId: string, label: string, command: string, action: string, startX: number, startY: number, targetX: number, targetY: number, color: string, timestamp: number }[]>([]);

    const spatButtonsRef = useRef(spatButtons);
    useEffect(() => { spatButtonsRef.current = spatButtons; }, [spatButtons]);

    const [isMmapperMode, setIsMmapperMode] = useState(() => localStorage.getItem('mud-mmapper-mode') === 'true');

    useEffect(() => {
        localStorage.setItem('mud-mmapper-mode', isMmapperMode.toString());
        if (isMmapperMode) {
            setConnectionUrl('ws://localhost:8080');
        } else if (connectionUrl === 'ws://localhost:8080') {
            setConnectionUrl(DEFAULT_URL);
        }
    }, [isMmapperMode]);

    const triggerSpit = useCallback((el: HTMLElement) => {
        const btnId = el.dataset.id || '';
        // If this button type is already visible on screen/in stack, ignore new trigger
        if (spatButtonsRef.current.some(sb => sb.btnId === btnId)) return;

        const rect = el.getBoundingClientRect();
        const id = Math.random().toString(36).substring(7);

        // Find the text log edge (content-layer right boundary)
        const contentLayer = document.querySelector('.content-layer');
        const contentRect = contentLayer?.getBoundingClientRect();

        // Find the command line position
        const inputArea = document.querySelector('.input-area');
        const inputRect = inputArea?.getBoundingClientRect();

        // Glow the trigger text
        el.classList.add('is-triggered');

        // Use the right edge of the content layer, minus some padding for the button
        const baseTargetX = contentRect ? (contentRect.right - 140) : (window.innerWidth - 180);
        // Vertical target: just above the input area
        const targetY = inputRect ? (inputRect.top - 40) : (window.innerHeight - 100);

        const newSpat = {
            id,
            btnId: btnId,
            label: el.innerText,
            command: el.dataset.cmd || '',
            action: el.dataset.action || 'command',
            startX: rect.left + rect.width / 2,
            startY: rect.top + rect.height / 2,
            targetX: baseTargetX,
            targetY: targetY,
            color: el.style.backgroundColor || 'var(--accent)',
            timestamp: Date.now()
        };

        setSpatButtons(prev => [...prev.slice(-9), newSpat]);

        triggerHaptic(10);
    }, []);

    const isCapturingInventory = useRef(false);
    const captureStage = useRef<'stat' | 'eq' | 'none'>('none');
    const isWaitingForStats = useRef(false);
    const isWaitingForEq = useRef(false);
    const isWaitingForInv = useRef(false);

    const [roomPlayers, setRoomPlayers] = useState<string[]>([]);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [characterName, setCharacterName] = useState<string | null>(null);






    // --- Refs ---
    const wasDraggingRef = useRef(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const navIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const navPathRef = useRef<string[]>([]);
    const didLongPressRef = useRef(false);
    const mapperRef = useRef<MapperRef>(null);
    const drawerMapperRef = useRef<MapperRef>(null);
    const lastCameraRoomIdRef = useRef<number | null>(null);
    const promptTerrainRef = useRef<string | null>(null);
    const inCombatRef = useRef(false);
    const lastViewportHeightRef = useRef<number>(window.innerHeight);
    const baseHeightRef = useRef<number>(window.innerHeight);

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = useMemo(() => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || windowWidth <= 1024;
    }, [windowWidth]);


    const scrollToBottom = useCallback((force = false, instant = false) => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;

        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }

        // Only guard against jumping if force is false
        if (!force) {
            // Smaller threshold on mobile/small viewports for tighter snap control
            const threshold = Math.min(150, container.clientHeight * 0.15);
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
            if (!isNearBottom || focusedIndex !== null) return;
        }

        if (instant) {
            isAutoScrollingRef.current = true;
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
            // Small timeout to reset the flag after the scroll event has likely fired
            setTimeout(() => { isAutoScrollingRef.current = false; }, 50);
        } else {
            // Slightly slower, "premium" smooth scroll
            const start = container.scrollTop;
            const end = container.scrollHeight - container.clientHeight;
            if (Math.abs(start - end) < 1) return;

            isAutoScrollingRef.current = true;
            const startTime = performance.now();
            const duration = 400; // Accelerated slightly for a snappier feel

            const animateScroll = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const ease = 1 - Math.pow(1 - progress, 3);

                container.scrollTop = start + (end - start) * ease;

                if (progress < 1) {
                    scrollAnimationRef.current = requestAnimationFrame(animateScroll);
                } else {
                    scrollAnimationRef.current = null;
                    isAutoScrollingRef.current = false;
                }
            };
            scrollAnimationRef.current = requestAnimationFrame(animateScroll);
        }
    }, [focusedIndex]);

    // Dynamic viewport height for mobile browsers
    const updateHeight = useCallback(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;

        const currentHeight = viewport.height;
        // Keep baseHeight up to date with the largest height seen (keyboard down)
        if (currentHeight > baseHeightRef.current) baseHeightRef.current = currentHeight;

        const vh = currentHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.documentElement.style.setProperty('--visual-height', `${currentHeight}px`);

        // Force height on container for faster layout
        const container = document.querySelector('.app-container') as HTMLElement;

        // Use more robust detection: is the current viewport significantly smaller than the base height?
        const isFocusableActive = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
        const isKeyboardDown = currentHeight > (baseHeightRef.current * 0.85);
        const isCurrentlyOpen = isMobile && isFocusableActive && !isKeyboardDown;

        if (container) {
            if (isCurrentlyOpen) {
                container.style.height = `${currentHeight}px`;
                container.style.top = `${viewport.offsetTop}px`;
            } else {
                // Return to normal layout when keyboard is closed
                container.style.height = '';
                container.style.top = '';
            }
        }

        // Keyboard transitions usually involve > 150px height change on mobile
        const isKeyboardOpening = isMobile && currentHeight < lastViewportHeightRef.current - 150 && isFocusableActive;
        const isKeyboardClosing = isMobile && currentHeight > lastViewportHeightRef.current + 150;

        if (isCurrentlyOpen !== isKeyboardOpen) {
            setIsKeyboardOpen(isCurrentlyOpen);
        }

        lastViewportHeightRef.current = currentHeight;

        // Snap to bottom on keyboard transitions
        if ((isKeyboardOpening || isKeyboardClosing) && typeof scrollToBottom === 'function') {
            scrollToBottom(true, false);
            // After transition, authoritative snap
            setTimeout(() => scrollToBottom(true, true), 400);
        }
    }, [scrollToBottom, isMobile, isKeyboardOpen]);

    // Force snap and scroll when keyboard opens/closes
    useEffect(() => {
        if (isMobile) {
            // Immediate snap
            scrollToBottom(true, true);

            // Follow-up snap after transition completes
            const timer = setTimeout(() => {
                scrollToBottom(true, true);
                updateHeight();
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [isKeyboardOpen, isMobile, scrollToBottom, updateHeight]);

    useEffect(() => {
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateHeight);
            window.visualViewport.addEventListener('scroll', updateHeight);
        }

        window.addEventListener('resize', updateHeight);
        window.addEventListener('orientationchange', updateHeight);
        updateHeight();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateHeight);
                window.visualViewport.removeEventListener('scroll', updateHeight);
            }
            window.removeEventListener('resize', updateHeight);
            window.removeEventListener('orientationchange', updateHeight);
        };
    }, [updateHeight]);

    useEffect(() => {
        if (activePrompt) {
            isCapturingInventory.current = false;
            captureStage.current = 'none';
            isWaitingForStats.current = false;
            isWaitingForEq.current = false;
            isWaitingForInv.current = false;
        }
    }, [activePrompt]);

    useEffect(() => {
        if (!isInventoryOpen) {
            isCapturingInventory.current = false;
            isWaitingForInv.current = false;
        }
    }, [isInventoryOpen]);

    useEffect(() => {
        if (!isCharacterOpen) {
            captureStage.current = 'none';
            isWaitingForStats.current = false;
            isWaitingForEq.current = false;
        }
    }, [isCharacterOpen]);

    const lastTapRef = useRef<number>(0);
    const extractNoun = (text: string) => {
        // Strip text in parentheses or brackets (flags like (glowing) or [magical])
        let clean = text.replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
        // Remove trailing punctuation
        clean = clean.replace(/[.,:;!]+$/, '');

        const words = clean.split(/[\s,.-]+/).filter(w => w.length > 1 && !/^(a|an|the|of|in|on|at|to|some|several)$/i.test(w));
        return words.length > 0 ? words[words.length - 1].toLowerCase().replace(/[^\w]/g, '') : '';
    };

    // --- Refs ---
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const isAutoScrollingRef = useRef<boolean>(false);
    const prevMessagesLengthRef = useRef<number>(messages.length);
    const hpRowRef = useRef<HTMLDivElement>(null);
    const manaRowRef = useRef<HTMLDivElement>(null);
    const moveRowRef = useRef<HTMLDivElement>(null);
    const soundTriggersRef = useRef(soundTriggers);
    useEffect(() => { soundTriggersRef.current = soundTriggers; }, [soundTriggers]);

    // --- Custom Hooks ---

    const btn = useButtons();
    const { audioCtxRef, initAudio, playSound, triggerHaptic } = useSoundSystem();
    const joystick = useJoystick();

    // Auto-exit design mode when keyboard opens
    useEffect(() => {
        if (isMobile && isKeyboardOpen && btn.isEditMode) {
            btn.setIsEditMode(false);
        }
    }, [isKeyboardOpen, isMobile, btn]);



    const hpRatio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
    const manaRatio = stats.maxMana > 0 ? stats.mana / stats.maxMana : 0;
    const moveRatio = stats.maxMove > 0 ? stats.move / stats.maxMove : 0;

    // --- Derived State & Handlers ---
    const isCombatLine = useCallback((text: string): boolean => {
        const t = text.toLowerCase();
        return (
            t.includes(' hits ') || t.includes(' hit ') ||
            t.includes(' misses ') || t.includes(' miss ') ||
            t.includes(' wounds ') || t.includes(' wound ') ||
            t.includes(' slays ') || t.includes(' slay ') ||
            t.includes(' kills ') || t.includes(' kill ') ||
            t.includes(' scratches ') || t.includes(' scratch ') ||
            t.includes(' bruises ') || t.includes(' bruise ') ||
            t.includes(' mauls ') || t.includes(' maul ') ||
            t.includes(' decimates ') || t.includes(' decimate ') ||
            t.includes(' devastates ') || t.includes(' devastate ') ||
            t.includes(' obliterates ') || t.includes(' obliterate ') ||
            t.includes(' massacres ') || t.includes(' massacre ') ||
            t.includes(' mutilates ') || t.includes(' mutilate ') ||
            t.includes(' eviscerates ') || t.includes(' eviscerate ') ||
            t.includes('you dodge') || t.includes('you parry') ||
            t.includes('you flee') || t.includes('you rescue') ||
            t.includes('you disarm') || t.includes('you bash') ||
            t.includes('you kick') || t.includes('you bite') ||
            t.includes('hits you') || t.includes('misses you') ||
            t.includes('wounds you') || t.includes('slays you') ||
            t.includes('crushes you') || t.includes('pierces you') ||
            t.includes('scratches you') || t.includes('bruises you') ||
            t.includes('mauls you') || t.includes('decimates you') ||
            t.includes('devastates you') || t.includes('obliterates you') ||
            t.includes('massacres you') || t.includes('mutilates you') ||
            t.includes('eviscerates you') ||
            t.includes('is dead!') || t.includes('is slain') ||
            t.includes('you have been killed') || t.includes('you are dead') ||
            t.includes('you feel less protected') ||
            t.includes('your opponent') || t.includes('your foe') ||
            /^\w+ (dodges|parries|flees|rescues|disarms|bashes|kicks|bites)/.test(t)
        );
    }, []);

    const isCommunicationLine = useCallback((text: string): boolean => {
        const t = text.toLowerCase();
        return (
            t.includes(' says ') || t.includes(' narrate ') || t.includes(' narrates ') ||
            t.includes(' tell ') || t.includes(' tells ') || t.includes(' whisper ') ||
            t.includes(' whispers ') || t.includes(' yell ') || t.includes(' yells ') ||
            t.includes(' states ') || t.includes(' state ') ||
            /^you (tell|say|whisper|yell|narrate|state)\b/i.test(t) ||
            /^\w+ (says|narrates|tells|whispers|yells|states)\b/i.test(t)
        );
    }, []);

    // Keep a ref so addMessage (useCallback) always sees the live combat state
    const setInCombat = (val: boolean) => {
        inCombatRef.current = val;
        setInCombatState(val);
    };

    const addMessage = useCallback((type: MessageType, text: string, combatOverride?: boolean) => {
        if (type === 'prompt') return; // Prompts are handled by activePrompt state, not history

        setMessages(prev => {
            let nextMessages = [...prev];

            const isThisCombat = combatOverride ?? (type === 'game' ? isCombatLine(text) : type === 'user');
            const isComm = type === 'game' && isCommunicationLine(text);
            const dimmedInCombat = inCombatRef.current && !isThisCombat;

            const stripAnsi = (t: string) => t.replace(/\x1b\[[0-9;]*m/g, '');
            const textOnly = stripAnsi(text).trim();

            let stackId = '';
            let subject = '';
            let actionText = '';
            let direction = '';

            const arriveMatch = textOnly.match(ARRIVE_REGEX);
            const leaveMatch = textOnly.match(LEAVE_REGEX);
            const hereMatch = textOnly.match(HERE_REGEX);
            const npcMatch = textOnly.match(NPC_LINE_REGEX);

            if (arriveMatch) {
                subject = arriveMatch[1];
                actionText = arriveMatch[2];
                direction = arriveMatch[4];
                stackId = `arrive:${subject.toLowerCase()}:${actionText.toLowerCase()}:${direction.toLowerCase()}`;
            } else if (leaveMatch) {
                subject = leaveMatch[1];
                actionText = 'leaves';
                direction = leaveMatch[3];
                stackId = `leave:${subject.toLowerCase()}:${direction.toLowerCase()}`;
            } else if (hereMatch) {
                subject = hereMatch[1];
                actionText = hereMatch[2];
                stackId = `here:${subject.toLowerCase()}:${actionText.toLowerCase()}`;
            } else if (npcMatch) {
                subject = npcMatch[1];
                actionText = npcMatch[2];
                direction = npcMatch[3];
                stackId = `npc:${textOnly.toLowerCase()}`;
            }

            if (stackId && nextMessages.length > 0) {
                const lastMsg = nextMessages[nextMessages.length - 1];
                if (lastMsg.stackId === stackId && lastMsg.type === type) {
                    const newCount = (lastMsg.stackCount || 1) + 1;
                    const pluralSubject = pluralizeMumeSubject(subject);
                    let verb = '';
                    let rest = direction;

                    if (actionText.includes('arrive')) verb = 'have arrived';
                    else if (actionText.includes('leave')) verb = 'leave';
                    else if (actionText.toLowerCase().startsWith('is ')) {
                        verb = 'are ' + actionText.slice(3);
                    } else {
                        verb = pluralizeVerb(actionText);
                        rest = pluralizeRest(direction);
                    }

                    const newTextRaw = `${numToWord(newCount).charAt(0).toUpperCase() + numToWord(newCount).slice(1)} ${pluralSubject} ${verb}${actionText.includes('arrive') ? ' from ' : ''}${rest}${rest || actionText.includes('is ') ? '' : ' '}.`.replace(/\s+/g, ' ').replace(/\.\./g, '.');

                    const updatedMsg: Message = {
                        ...lastMsg,
                        textRaw: newTextRaw,
                        html: ansiConvert.toHtml(`\x1b[1;37m${newTextRaw}\x1b[0m`), // Force white for condensed messages
                        stackCount: newCount,
                        timestamp: Date.now()
                    };

                    return [...nextMessages.slice(0, -1), updatedMsg];
                }
            }

            const msg: Message = {
                id: Math.random().toString(36).substring(7),
                html: ansiConvert.toHtml(text),
                textRaw: text,
                type,
                timestamp: Date.now(),
                isCombat: isThisCombat,
                dimmedInCombat,
                stackId: stackId || undefined,
                stackCount: 1,
                isComm
            };

            if (nextMessages.length >= 500) {
                return [...nextMessages.slice(nextMessages.length - 499), msg];
            }
            return [...nextMessages, msg];
        });
    }, []);

    const detectLighting = useCallback((line: string) => {
        const cleanLine = line.trim();
        if (cleanLine.includes('!')) { setLighting('artificial'); }
        else if (cleanLine.includes(')')) { setLighting('moon'); }
        else if (/\bo\b/.test(cleanLine)) { setLighting('dark'); }
        else if (cleanLine.includes('*')) { setLighting('sun'); }

        // Clouds: only when ~ is present AND not in artificial light
        const isArtificial = cleanLine.includes('!');
        if (cleanLine.includes('~') && !isArtificial) {
            setWeather(prev => (prev === 'rain' || prev === 'heavy-rain' || prev === 'snow') ? prev : 'cloud');
        } else {
            // No ~ in prompt (or artificial light) — clear clouds
            setWeather(prev => prev === 'cloud' ? 'none' : prev);
        }
    }, []);




    const processLine = useCallback((line: string) => {
        const cleanLine = line.replace(/\r$/, '');
        if (!cleanLine) return;

        const textOnlyForCapture = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        const lowerCapture = textOnlyForCapture.toLowerCase();

        // 1. Detect start of capture based on specific MUME response markers
        if (isWaitingForStats.current && (lowerCapture.includes('ob:') || lowerCapture.includes('armor:') || lowerCapture.includes('mood:'))) {
            isWaitingForStats.current = false;
            captureStage.current = 'stat';
        }
        if (isWaitingForEq.current && lowerCapture.includes('you are using:')) {
            isWaitingForEq.current = false;
            captureStage.current = 'eq';
        }
        if (isWaitingForInv.current && lowerCapture.includes('you are carrying:')) {
            isWaitingForInv.current = false;
            isCapturingInventory.current = true;
        }

        // 2. Prompt detection (terminates capture)
        const isPurePrompt = /^[\*\)\!oO\.\[f<%\~+WU:=O:\(]\s*[>:]\s*$/.test(textOnlyForCapture);
        const startsWithPrompt = /^[\*\)\!oO\.\[f<%\~+WU:=O:\(]/.test(textOnlyForCapture);
        const endsWithPromptIndicator = /[>:]\s*$/.test(textOnlyForCapture);
        const isLikelyPrompt = (startsWithPrompt && endsWithPromptIndicator && textOnlyForCapture.length < 60);

        const shouldStopCapture = isPurePrompt || (isLikelyPrompt && !lowerCapture.includes('ob:') && !lowerCapture.includes('armor:') && !lowerCapture.includes('you are using:') && !lowerCapture.includes('needed:') && !lowerCapture.includes('carrying:'));

        if (shouldStopCapture) {
            isCapturingInventory.current = false;
            captureStage.current = 'none';
            isWaitingForStats.current = false;
            isWaitingForEq.current = false;
            isWaitingForInv.current = false;
        }

        // 3. Perform capture (skip if it's the prompt that just ended it)
        if (!shouldStopCapture) {
            if (isCapturingInventory.current) {
                setInventoryHtml(prev => prev + (prev ? '<br/>' : '') + ansiConvert.toHtml(cleanLine));
            }
            if (captureStage.current === 'stat') {
                setStatsHtml(prev => prev + (prev ? '<br/>' : '') + ansiConvert.toHtml(cleanLine));
            } else if (captureStage.current === 'eq') {
                setEqHtml(prev => prev + (prev ? '<br/>' : '') + ansiConvert.toHtml(cleanLine));
            }
        }

        const textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        const lower = textOnly.toLowerCase();

        try {
            const shortStats = /(?:H|HP|Health):\s*(\d+)(?:\/(\d+))?.*(?:M|Mana):\s*(\d+)(?:\/(\d+))?.*(?:V|MV|Move):\s*(\d+)(?:\/(\d+))?/i;
            let match = textOnly.match(shortStats);
            if (!match) {
                const verboseStats = /(\d+)\/(\d+)\s+hits,?\s+(\d+)\/(\d+)\s+mana,?\s+and\s+(\d+)\/(\d+)\s+moves/i;
                const vMatch = textOnly.match(verboseStats);
                if (vMatch) match = [vMatch[0], vMatch[1], vMatch[2], vMatch[3], vMatch[4], vMatch[5], vMatch[6]];
            }
            if (match) {
                setStats(prev => {
                    const newHp = parseInt(match![1]);
                    const newMaxHp = match![2] ? parseInt(match![2]) : prev.maxHp;
                    const newMana = parseInt(match![3]);
                    const newMaxMana = match![4] ? parseInt(match![4]) : prev.maxMana;
                    const newMove = parseInt(match![5]);
                    const newMaxMove = match![6] ? parseInt(match![6]) : prev.maxMove;
                    if (newHp !== prev.hp || newMove !== prev.move || newMana !== prev.mana) {
                        return { hp: newHp, maxHp: newMaxHp, mana: newMana, maxMana: newMaxMana, move: newMove, maxMove: newMaxMove };
                    }
                    return prev;
                });
            }

            // Terrain Detection from Prompt
            const terrainSymbols: Record<string, string> = {
                '[': 'building', '#': 'city', '.': 'field', 'f': 'forest',
                '(': 'hills', '<': 'mountains', '%': 'shallows', '~': 'water',
                '+': 'road', 'W': 'rapids', 'U': 'underwater', ':': 'brush',
                '=': 'tunnel', 'O': 'cavern'
            };

            // 1. Check for explicit names
            const terrainPatterns = [
                /\b(Inside|City|Field|Forest|Hills|Mountain|Mountains|Swimming|Underwater|Air|Desert|Road|Underground|Rapids|Brush|Tunnel|Cavern)\b/i,
                /\[\s*(Inside|City|Field|Forest|Hills|Mountain|Mountains|Swimming|Underwater|Air|Desert|Road|Underground|Rapids|Brush|Tunnel|Cavern)\s*\]/i,
                /\(\s*(Inside|City|Field|Forest|Hills|Mountain|Mountains|Swimming|Underwater|Air|Desert|Road|Underground|Rapids|Brush|Tunnel|Cavern)\s*\)/i
            ];

            let found = false;
            for (const pattern of terrainPatterns) {
                const tMatch = textOnly.match(pattern);
                if (tMatch) {
                    promptTerrainRef.current = tMatch[1].toLowerCase();
                    found = true;
                    break;
                }
            }

            // 2. Extract terrain symbol directly from the beginning of the prompt string
            if (!found) {
                // First ensure this line is actually a prompt
                const isPrompt = /^([\*\)\!oO\.\[f<%\~+WU:=\#\?\(].*[>:])\s*/.test(textOnly);
                if (isPrompt) {
                    // MUME prompts always start with an optional light indicator (*, ), !, o) 
                    // followed immediately by the terrain symbol from our list.
                    const promptSymbolRegex = /^([\*\)\!o]?)([\.\[\#f<%\~+WU:=O:\(])/;
                    const symMatch = textOnly.match(promptSymbolRegex);
                    if (symMatch) {
                        const sym = symMatch[2];
                        if (terrainSymbols[sym]) {
                            promptTerrainRef.current = terrainSymbols[sym];
                            found = true;
                        }
                    }
                }
            }
            if (promptTerrainRef.current) mapperRef.current?.handleTerrain(promptTerrainRef.current);
        } catch (e) { }

        // Environment
        if (lower.includes("it starts to rain")) setWeather('rain');
        else if (lower.includes("the rain stops")) setWeather('none');
        else if (lower.includes("snow starts to fall")) setWeather('snow');
        else if (lower.includes("the snow stops")) setWeather('none');
        else if (lower.includes("the sky clouds over") || lower.includes("clouds fill the sky")) setWeather('cloud');
        else if (lower.includes("the clouds disappear") || lower.includes("the sky clears")) setWeather('none');
        else if (lower.includes("thick fog")) setIsFoggy(true);
        else if (lower.includes("fog clears")) setIsFoggy(false);
        if (lower.includes("alas, you cannot go that way") ||
            lower.includes("no exit that way") ||
            lower.includes("is closed") ||
            lower.includes("you are too exhausted") ||
            lower.includes("too tired") ||
            lower.includes("cannot go there") ||
            lower.includes("must be standing") ||
            lower.includes("blocks your way") ||
            lower.includes("blocks your path") ||
            lower.includes("blocks your exit") ||
            lower.includes("caught in") ||
            lower.includes("locked") ||
            lower.includes("need a boat") ||
            lower.includes("would drown") ||
            lower.includes("too deep") ||
            lower.includes("cannot climb") ||
            lower.includes("not allowed") ||
            lower.includes("need a light") ||
            lower.includes("already there") ||
            lower.includes("mount is too exhausted")) {

            setRumble(true);
            triggerHaptic(50);
            setTimeout(() => setRumble(false), 400);
            mapperRef.current?.handleMoveFailure();
        }

        const darkStrings = ["pitch black", "too dark", "cannot see"];
        if (darkStrings.some(msg => lower.includes(msg))) {
            mapperRef.current?.handleMoveFailure();
            addMessage('system', "[Mapper] Darkness detected. Room not mapped.");
        }
        detectLighting(textOnly);
        if (lower.includes("hits you") || lower.includes("crushes you") || lower.includes("pierces you")) { setHitFlash(true); triggerHaptic(50); setTimeout(() => setHitFlash(false), 150); }
        if (lower.includes("you have been killed") || lower.includes("you are dead")) { setDeathStage('fade_to_black'); setTimeout(() => setDeathStage('flash'), 2000); }

        // Triggers
        soundTriggersRef.current.forEach(trig => {
            if (!trig.pattern || !trig.buffer) return;
            let match = trig.isRegex ? new RegExp(trig.pattern, 'i').test(textOnly) : textOnly.includes(trig.pattern);
            if (match) playSound(trig.buffer);
        });

        btn.buttonsRef.current.forEach(b => {
            if (!b.trigger?.enabled || !b.trigger.pattern) return;
            let match = b.trigger.isRegex ? new RegExp(b.trigger.pattern).test(textOnly) : textOnly.includes(b.trigger.pattern);
            if (match) {
                if (b.display === 'floating') {
                    btn.setButtons(prev => prev.map(x => x.id === b.id ? { ...x, isVisible: true } : x));
                    if (b.trigger.duration > 0) {
                        if (btn.buttonTimers.current[b.id]) clearTimeout(btn.buttonTimers.current[b.id]);
                        btn.buttonTimers.current[b.id] = setTimeout(() => {
                            btn.setButtons(prev => prev.map(x => x.id === b.id ? { ...x, isVisible: false } : x));
                        }, b.trigger.duration * 1000);
                    }
                }
                if (b.trigger.type === 'switch_set' && b.trigger.targetSet) btn.setActiveSet(b.trigger.targetSet);
            }
        });

        const mumePromptRegex = /^([\*\)\!oO\.\[f<%\~+WU:=O\#\?\(].*[>:])\s*(.*)$/;
        const pMatch = cleanLine.match(mumePromptRegex);



        const isCapturing = (isCapturingInventory.current && isInventoryOpen) || (captureStage.current !== 'none' && isCharacterOpen);

        if (pMatch) {
            const promptPart = pMatch[1];
            const messagePart = pMatch[2];
            if (messagePart && !isCapturing) addMessage('game', messagePart);
        } else {
            if (!isCapturing) addMessage('game', cleanLine);
        }
    }, [detectLighting, addMessage, btn, isInventoryOpen, isCharacterOpen]);

    const telnet = useTelnet({
        connectionUrl, addMessage, setStatus, setStats, setWeather, setIsFoggy,
        setRumble, setHitFlash, setDeathStage, detectLighting, processLine,
        setPrompt: setActivePrompt, setInCombat,
        onOpponentChange: (name) => {
            // Auto-targeting removed for items/objects
        },
        onCharNameChange: (name) => {
            setCharacterName(name);
        }
    });

    const callbacksRef = useRef<any>(null);
    useEffect(() => {
        const notifyMapper = (action: (ref: React.RefObject<MapperRef>) => void) => {
            action(mapperRef);
            action(drawerMapperRef);
        };

        callbacksRef.current = {
            onRoomInfo: (data: any) => notifyMapper(ref => ref.current?.handleRoomInfo(data)),
            onCharVitals: (data: any) => { if (data.terrain) notifyMapper(ref => ref.current?.handleTerrain(data.terrain)); },
            onRoomPlayers: (data: any) => {
                let players: string[] = [];
                if (Array.isArray(data)) {
                    players = data.map(p => typeof p === 'string' ? p : p.name).filter(Boolean);
                } else if (data.players && Array.isArray(data.players)) {
                    players = data.players.map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean);
                } else if (data.members && Array.isArray(data.members)) {
                    players = data.members.map((p: any) => typeof p === 'string' ? p : p.name).filter(Boolean);
                }
                setRoomPlayers(players);
            }
        };
    }, [setRoomPlayers]);

    const connect = () => {
        initAudio();

        telnet.connect({
            onRoomInfo: (data) => callbacksRef.current.onRoomInfo && callbacksRef.current.onRoomInfo(data),
            onCharVitals: (data) => callbacksRef.current.onCharVitals && callbacksRef.current.onCharVitals(data),
            onRoomPlayers: (data) => callbacksRef.current.onRoomPlayers && callbacksRef.current.onRoomPlayers(data)
        });
    };

    const executeCommand = (cmd: string, isAutoNav = false) => {
        initAudio();

        // Local Target Setting
        // Matches "target=name", "target name", "#target name", etc.
        const setTargetMatch = cmd.match(/^(:|#)?target\s*(\s+|=)\s*(.+)$/i) || cmd.match(/^#target\s+(.+)$/i);
        if (setTargetMatch) {
            const rawTarget = setTargetMatch[3] || setTargetMatch[2] || setTargetMatch[1];
            if (rawTarget) {
                const nounTarget = extractNoun(rawTarget.trim());
                setTarget(nounTarget);
                addMessage('system', `Target set to noun: ${nounTarget}`);
                return;
            }
        }

        // Target substitution
        let finalCmd = cmd;
        if (target && /\btarget\b/i.test(cmd)) {
            finalCmd = cmd.replace(/\btarget\b/gi, target);
        }

        if (!isAutoNav) {
            if (navIntervalRef.current) {
                clearInterval(navIntervalRef.current);
                navIntervalRef.current = null;
                addMessage('system', 'Navigation stopped.');
            }
        }

        const lowerCmd = cmd.toLowerCase().trim();
        if (lowerCmd === 'inventory' || lowerCmd === 'inv') {
            isWaitingForInv.current = true;
            isCapturingInventory.current = false;
            setInventoryHtml('');
        } else if (lowerCmd === 'stat') {
            isWaitingForStats.current = true;
            captureStage.current = 'none';
            setStatsHtml('');
        } else if (lowerCmd === 'eq') {
            isWaitingForEq.current = true;
            captureStage.current = 'none';
            setEqHtml('');
        }
        // If we send both at once, the first one starts the capture session
        if (lowerCmd.includes('stat') && lowerCmd.includes('eq')) {
            isWaitingForStats.current = true;
            isWaitingForEq.current = true;
            captureStage.current = 'none';
            setStatsHtml('');
            setEqHtml('');
        }
        if (lowerCmd === 'closeall') {
            setIsInventoryOpen(false); setIsCharacterOpen(false);
        }

        addMessage('user', finalCmd);
        const moveCmd = finalCmd.toLowerCase().trim();
        const validMoves: Direction[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd'];
        let dir: Direction | null = null;
        if (validMoves.includes(moveCmd as any)) dir = moveCmd as Direction;
        else if (moveCmd === 'north') dir = 'n'; else if (moveCmd === 'south') dir = 's'; else if (moveCmd === 'east') dir = 'e'; else if (moveCmd === 'west') dir = 'w';
        else if (moveCmd === 'up') dir = 'u'; else if (moveCmd === 'down') dir = 'd';
        else if (moveCmd === 'northeast') dir = 'ne'; else if (moveCmd === 'northwest') dir = 'nw';
        else if (moveCmd === 'southeast') dir = 'se'; else if (moveCmd === 'southwest') dir = 'sw';

        if (dir && ['n', 's', 'e', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw'].includes(dir)) {
            mapperRef.current?.pushPendingMove(dir);
        }

        if (status === 'connected') telnet.sendCommand(finalCmd);
        else addMessage('error', 'Not connected.');
    };

    const handleSend = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        const cmd = input.trim();
        setInput('');
        executeCommand(cmd);
        // User requesting snap-to-bottom on every command
        if (typeof scrollToBottom === 'function') {
            scrollToBottom(true, true);
            // Slight delay too to catch the local echo / response
            setTimeout(() => scrollToBottom(true, true), 30);
        }
    }, [input, executeCommand, scrollToBottom]);

    const handleSendCallback = useCallback((e?: React.FormEvent) => {
        handleSend(e);
    }, [handleSend]);

    const scrollTaskRef = useRef<number | null>(null);
    const handleLogScroll = useCallback(() => {
        // Only cancel the scroll animation if it wasn't triggered by the system itself
        if (scrollAnimationRef.current && !isAutoScrollingRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current);
            scrollAnimationRef.current = null;
        }

        if (scrollTaskRef.current) return;

        scrollTaskRef.current = requestAnimationFrame(() => {
            scrollTaskRef.current = null;
            const container = scrollContainerRef.current;
            if (!container) return;
            const { scrollTop, scrollHeight, clientHeight } = container;
            const scrollBottom = scrollTop + clientHeight;

            // Threshold for snap-back detection
            if (scrollHeight - scrollBottom < 50) {
                if (focusedIndex !== null) setFocusedIndex(null);
                return;
            }

            const children = container.children;
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
        triggerHaptic(dir === 'up' ? 35 : 20);
        if (dir === 'up') {
            executeCommand('inventory');
            setIsInventoryOpen(true);
        } else if (dir === 'down') {
            if (isInventoryOpen) { triggerHaptic(15); setIsInventoryOpen(false); }
            else executeCommand('s');
        } else if (dir === 'right') {
            setStatsHtml(''); setEqHtml('');
            executeCommand('stat');
            setTimeout(() => executeCommand('eq'), 300);
            setIsCharacterOpen(true);
        }
        else if (dir === 'left') {
            if (isCharacterOpen) { triggerHaptic(15); setIsCharacterOpen(false); }
        }
    }, [isMobile, triggerHaptic, executeCommand, isInventoryOpen, isCharacterOpen]);

    // --- Stats Effects ---
    const getHeartbeatDuration = (ratio: number) => 0.4 + (ratio / FX_THRESHOLD) * 1.1;
    const getBreathDuration = (ratio: number) => 0.6 + (ratio / FX_THRESHOLD) * 2.9;

    useEffect(() => {
        let timeoutId: any;
        if (hpRowRef.current) {
            const intensity = 0.3 + (0.7 * (1 - hpRatio));
            const duration = 0.5 + (2.5 * hpRatio);
            hpRowRef.current.style.setProperty('--pulse-intensity', intensity.toString());
            hpRowRef.current.style.animation = `heartbeat-pulse ${duration}s ease-in-out`;
        }
        const playHeartbeat = () => {
            if (!audioCtxRef.current || hpRatio > FX_THRESHOLD) {
                if (hpRowRef.current) hpRowRef.current.style.animation = 'none';
                timeoutId = setTimeout(playHeartbeat, 1000);
                return;
            }

            const ctx = audioCtxRef.current;
            const duration = 0.5 + (2.5 * hpRatio); // Total cycle duration
            const intensity = 0.3 + (0.7 * (1 - hpRatio));

            // Visual Sync: Reset and trigger animation
            if (hpRowRef.current) {
                hpRowRef.current.style.setProperty('--pulse-intensity', intensity.toString());
                hpRowRef.current.style.animation = 'none';
                void hpRowRef.current.offsetWidth; // Force reflow
                hpRowRef.current.style.animation = `heartbeat-pulse ${duration}s ease-in-out`;
            }

            // Lub (First beat)
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(42, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.4 * intensity, ctx.currentTime); // Scale volume with intensity
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.25);

            // Dub (Second beat) - Offset matches the 30% gap in CSS keyframes
            const dubDelay = duration * 0.3 * 1000;
            setTimeout(() => {
                if (!audioCtxRef.current) return;
                const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
                osc2.type = 'sine'; osc2.frequency.setValueAtTime(35, ctx.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(22, ctx.currentTime + 0.1);
                gain2.gain.setValueAtTime(0.3 * intensity, ctx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                osc2.connect(gain2); gain2.connect(ctx.destination);
                osc2.start(); osc2.stop(ctx.currentTime + 0.25);
            }, dubDelay);

            timeoutId = setTimeout(playHeartbeat, duration * 1000);
        };
        playHeartbeat(); return () => clearTimeout(timeoutId);
    }, [hpRatio]);

    useEffect(() => {
        let timeoutId: any;
        if (moveRowRef.current) {
            const intensity = 0.3 + (0.7 * (1 - moveRatio));
            const duration = 0.5 + (3.5 * moveRatio);
            moveRowRef.current.style.setProperty('--breath-intensity', intensity.toString());
            moveRowRef.current.style.animation = `breath-pulse ${duration}s infinite ease-in-out`;
        }
        const playBreath = () => {
            if (!audioCtxRef.current || moveRatio > FX_THRESHOLD) {
                timeoutId = setTimeout(playBreath, 2000);
                return;
            }

            const ctx = audioCtxRef.current;
            const duration = 0.5 + (3.5 * moveRatio);
            const intensity = 1 - moveRatio;

            // Pink Noise Generation (Smoother, deeper sound)
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                data[i] *= 0.11;
                b6 = white * 0.115926;
            }

            const playHalfBreath = (startTime: number, len: number, isExhale: boolean) => {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;

                // Create a "throat" filter chain
                const lowPass = ctx.createBiquadFilter();
                lowPass.type = 'lowpass';

                const highPass = ctx.createBiquadFilter();
                highPass.type = 'highpass';
                highPass.frequency.value = 100;

                if (isExhale) {
                    // Exhale: Lower pitch, relaxing
                    lowPass.frequency.setValueAtTime(600, startTime);
                    lowPass.frequency.exponentialRampToValueAtTime(400, startTime + len);
                    lowPass.Q.value = 1;
                } else {
                    // Inhale: Higher pitch, sharper
                    lowPass.frequency.setValueAtTime(400, startTime);
                    lowPass.frequency.exponentialRampToValueAtTime(800, startTime + len);
                    lowPass.Q.value = 2; // More resonance on intake
                }

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, startTime);
                // Sharper attack for inhale, softer for exhale
                gain.gain.linearRampToValueAtTime(0.15 * intensity, startTime + len * (isExhale ? 0.3 : 0.6));
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + len);

                source.connect(highPass);
                highPass.connect(lowPass);
                lowPass.connect(gain);
                gain.connect(ctx.destination);

                source.start(startTime);
                source.stop(startTime + len + 0.1);
            };

            const breathCycle = duration; // Cycle reflects the CSS animation duration
            const now = ctx.currentTime;
            playHalfBreath(now, breathCycle * 0.4, false); // Inhale
            playHalfBreath(now + breathCycle * 0.45, breathCycle * 0.5, true); // Exhale

            timeoutId = setTimeout(playBreath, breathCycle * 1000);
        };
        playBreath(); return () => clearTimeout(timeoutId);
    }, [moveRatio]);

    useEffect(() => {
        const el = manaRowRef.current; if (!el) return;
        let active = true; let timeoutId: any;
        const loop = () => {
            if (!active) return;
            const baseDelay = 100 + (1400 * manaRatio);
            const intensity = 0.4 + (0.6 * (1 - manaRatio));
            const isSpark = Math.random() < (0.2 + (0.3 * (1 - manaRatio)));
            let boxShadow = `0 0 ${5 * intensity}px rgba(168, 85, 247, ${0.3 * intensity})`;
            if (isSpark) boxShadow = `0 0 ${15 * intensity}px rgba(216, 180, 254, ${0.8 * intensity}), inset 0 0 ${5 * intensity}px rgba(168, 85, 247, 0.8)`;
            el.style.boxShadow = boxShadow; el.style.transition = `box-shadow ${baseDelay * 0.4}ms ease-out`;
            timeoutId = setTimeout(loop, baseDelay * (0.8 + Math.random() * 0.4));
        };
        loop(); return () => { active = false; clearTimeout(timeoutId); };
    }, [manaRatio]);

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
    const handleNavClick = useCallback((dir: 'up' | 'down') => {
        triggerHaptic(30);
        executeCommand(dir);
        setBtnGlow(prev => ({ ...prev, [dir]: true }));
        setTimeout(() => setBtnGlow(prev => ({ ...prev, [dir]: false })), 300);
    }, [triggerHaptic, executeCommand]);
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
        if (btnEl && btnEl.dataset.id) {
            e.stopPropagation();
            if (btn.isEditMode) btn.setEditingButtonId(btnEl.dataset.id);
            else {
                const action = btnEl.dataset.action;
                if (action === 'menu' && btnEl.dataset.cmd) {
                    const rect = btnEl.getBoundingClientRect();
                    setPopoverState({
                        x: rect.right + 10,
                        y: rect.top,
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

        // 1. Highlight Current Target (Top priority)
        if (target) {
            try {
                const pattern = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b(${pattern})\\b(?![^<]*>|[^<>]*<\\/span>)`, 'gi');
                newHtml = newHtml.replace(regex, (match) => `<span class="target-highlight">${match}</span>`);
            } catch (e) { }
        }

        // 2. Inline Highlight Buttons
        btn.buttonsRef.current.filter(b => b.display === 'inline' && b.trigger?.enabled && b.trigger.pattern).forEach(b => {
            try {
                const pattern = b.trigger!.pattern!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b(${pattern})\\b(?![^<]*>|[^<>]*<\\/span>)`, 'gi');
                newHtml = newHtml.replace(regex, (match) => {
                    return `<span class="inline-btn" data-id="${b.id}" data-mid="${mid || ''}" data-cmd="${b.command}" data-context="${match}" data-action="${b.actionType || 'command'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" style="background-color: ${b.style.backgroundColor}">${match}</span>`;
                });
            } catch (e) { }
        });

        return newHtml;
    }, [target, btn]);

    const getMessageClass = useCallback((index: number, total: number) => {
        const anchorIndex = focusedIndex !== null ? focusedIndex : total - 1;
        const distance = anchorIndex - index;

        // Spread out buckets to reduce class-swap frequency (improves perf)
        if (distance < 10) return 'msg-latest';
        if (distance < 30) return 'msg-recent';
        if (distance < 100) return 'msg-old';
        return 'msg-ancient';
    }, [focusedIndex]);

    const handleButtonClick = (button: CustomButton, e: React.MouseEvent, context?: string) => {
        e.stopPropagation();
        if (btn.isEditMode) {
            if (wasDraggingRef.current) return;
            btn.setEditingButtonId(button.id);
        }
        else {
            if (popoverState) setPopoverState(null);
            const target = e.currentTarget as HTMLElement; target.classList.remove('btn-glow-active'); void target.offsetWidth; target.classList.add('btn-glow-active');
            triggerHaptic(15);

            let cmd = button.command;
            if (context) {
                // If command contains %n, replace it, otherwise append with space
                if (cmd.includes('%n')) cmd = cmd.replace(/%n/g, context);
                else cmd = `${cmd} ${context}`;
            }

            if (button.actionType === 'nav') btn.setActiveSet(button.command); else executeCommand(cmd);
            if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
        }
    };

    const handleDragStart = (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => {
        if (!btn.isEditMode) return;
        e.stopPropagation(); e.preventDefault();

        if (type === 'cluster' || type === 'cluster-resize') {
            const clusterId = id as 'joystick' | 'stats' | 'mapper';
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const pos = btn.uiPositions[clusterId];
            const startX = pos?.x ?? rect.left;
            const startY = pos?.y ?? rect.top;
            let initialW = pos?.scale ?? 1;
            let initialH = 0;

            if (clusterId === 'mapper' && type === 'cluster-resize') {
                const mapperPos = pos as any;
                initialW = mapperPos?.w ?? 320;
                initialH = mapperPos?.h ?? 320;
            }

            btn.setDragState({
                id: clusterId,
                startX: e.clientX,
                startY: e.clientY,
                initialX: startX,
                initialY: startY,
                type: type as any,
                initialW: initialW,
                initialH: initialH
            });
            return;
        }

        const button = btn.buttons.find(b => b.id === id); if (!button || button.display === 'inline') return;
        wasDraggingRef.current = false;

        // Selection logic
        let effectiveSelected = new Set(btn.selectedButtonIds);
        if (!effectiveSelected.has(id)) {
            if (!e.ctrlKey && !e.metaKey) effectiveSelected = new Set([id]);
            else effectiveSelected.add(id);
            btn.setSelectedIds(effectiveSelected);
        }

        const initialPositions: Record<string, { x: number, y: number }> = {};
        const initialSizes: Record<string, { w: number, h: number }> = {};
        effectiveSelected.forEach(selId => {
            const b = btn.buttons.find(x => x.id === selId);
            if (b) {
                initialPositions[selId] = { x: b.style.x, y: b.style.y };
                initialSizes[selId] = { w: b.style.w, h: b.style.h };
            }
        });

        btn.setDragState({
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: button.style.x,
            initialY: button.style.y,
            type,
            initialW: button.style.w,
            initialH: button.style.h,
            initialPositions: type === 'move' ? initialPositions : (type === 'resize' ? initialPositions : undefined),
            initialSizes: type === 'resize' ? initialSizes : undefined
        });
    };

    const handleMouseMove = useCallback((e: PointerEvent) => {
        if (btn.dragState?.type === 'cluster') {
            const dx = e.clientX - btn.dragState.startX;
            const dy = e.clientY - btn.dragState.startY;
            const clusterId = btn.dragState.id as 'joystick' | 'stats' | 'mapper';
            btn.setUiPositions(prev => ({
                ...prev,
                [clusterId]: {
                    ...prev[clusterId],
                    x: btn.dragState!.initialX + dx,
                    y: btn.dragState!.initialY + dy
                }
            }));
            return;
        }

        if (btn.dragState?.type === 'cluster-resize') {
            const dx = e.clientX - btn.dragState.startX;
            const dy = e.clientY - btn.dragState.startY;
            const clusterId = btn.dragState.id as 'joystick' | 'stats' | 'mapper';

            if (clusterId === 'mapper') {
                const newW = Math.max(200, btn.dragState.initialW + dx);
                const newH = Math.max(200, btn.dragState.initialH + dy);
                btn.setUiPositions(prev => ({
                    ...prev,
                    [clusterId]: {
                        ...prev[clusterId],
                        w: newW,
                        h: newH
                    }
                }));
            } else {
                const newScale = Math.max(0.5, Math.min(2.5, btn.dragState.initialW + dx / 200));
                btn.setUiPositions(prev => ({
                    ...prev,
                    [clusterId]: {
                        ...prev[clusterId],
                        scale: newScale
                    }
                }));
            }
            return;
        }

        if (btn.dragState) {
            const dx = e.clientX - btn.dragState.startX, dy = e.clientY - btn.dragState.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDraggingRef.current = true;
            btn.setButtons(prev => prev.map(b => {
                if (btn.dragState?.type === 'resize') {
                    if (btn.dragState.initialSizes && btn.dragState.initialSizes[b.id]) {
                        const init = btn.dragState.initialSizes[b.id];
                        return { ...b, style: { ...b.style, w: Math.max(20, init.w + dx), h: Math.max(20, init.h + dy) } };
                    }
                    if (b.id !== btn.dragState?.id) return b;
                    return { ...b, style: { ...b.style, w: Math.max(20, btn.dragState.initialW + dx), h: Math.max(20, btn.dragState.initialH + dy) } };
                }

                if (btn.dragState?.initialPositions && btn.dragState.initialPositions[b.id]) {
                    const init = btn.dragState.initialPositions[b.id];
                    const dXPercent = (dx / window.innerWidth) * 100;
                    const dYPercent = (dy / window.innerHeight) * 100;
                    return { ...b, style: { ...b.style, x: Math.min(100, Math.max(0, init.x + dXPercent)), y: Math.min(100, Math.max(0, init.y + dYPercent)) } };
                }

                if (b.id !== btn.dragState?.id) return b;
                return { ...b, style: { ...b.style, x: Math.min(100, Math.max(0, btn.dragState.initialX + (dx / window.innerWidth) * 100)), y: Math.min(100, Math.max(0, btn.dragState.initialY + (dy / window.innerHeight) * 100)) } };
            }));
        }
    }, [btn]);

    useEffect(() => {
        const handleMouseUp = () => {
            btn.setDragState(null);
        };
        if (btn.dragState) {
            window.addEventListener('pointermove', handleMouseMove);
            window.addEventListener('pointerup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('pointermove', handleMouseMove);
            window.removeEventListener('pointerup', handleMouseUp);
        };
    }, [btn.dragState, handleMouseMove]);

    // --- Settings handlers ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { if (typeof ev.target?.result === 'string') setBgImage(ev.target.result); }; reader.readAsDataURL(file); } };
    const exportSettings = () => { const settings: SavedSettings = { version: 3, connectionUrl, bgImage, buttons: btn.buttons.map(b => ({ ...b, isVisible: undefined } as any)), soundTriggers: soundTriggers.map(({ buffer, ...rest }) => rest) }; const blob = new Blob([JSON.stringify(settings)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `mume - settings - ${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); };
    const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; setIsLoading(true); initAudio(); const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                if (typeof ev.target?.result === 'string') {
                    const settings: SavedSettings = JSON.parse(ev.target.result);
                    if (settings.connectionUrl) setConnectionUrl(settings.connectionUrl);
                    if (settings.bgImage) setBgImage(settings.bgImage);
                    if (settings.buttons) btn.setButtons(settings.buttons.map(b => ({ ...b, isVisible: !b.trigger?.enabled })));
                    if (settings.soundTriggers && audioCtxRef.current) {
                        const restored: SoundTrigger[] = [];
                        for (const s of settings.soundTriggers) {
                            try { const res = await fetch(s.srcData); const ab = await res.arrayBuffer(); const ad = await audioCtxRef.current.decodeAudioData(ab); restored.push({ ...s, buffer: ad } as SoundTrigger); }
                            catch (err) { console.error("Failed to restore sound:", s.fileName); }
                        }
                        setSoundTriggers(restored);
                    }
                    addMessage('system', 'Settings loaded successfully.'); setIsSettingsOpen(false);
                }
            } catch (err) { addMessage('error', 'Failed to load settings file.'); } finally { setIsLoading(false); }
        }; reader.readAsText(file);
    };

    const handleSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        initAudio(); const file = e.target.files?.[0];
        if (file && audioCtxRef.current) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (typeof ev.target?.result === 'string') {
                    try {
                        const srcData = ev.target.result; const res = await fetch(srcData); const ab = await res.arrayBuffer(); const ad = await audioCtxRef.current!.decodeAudioData(ab);
                        const newSound: SoundTrigger = { id: Math.random().toString(36).substring(7), pattern: newSoundPattern || file.name, isRegex: newSoundRegex, buffer: ad, srcData, fileName: file.name };
                        setSoundTriggers(prev => [...prev, newSound]); setNewSoundPattern('');
                    } catch (err) { addMessage('error', 'Failed to process audio file.'); }
                }
            }; reader.readAsDataURL(file);
        }
    };

    const getLightingIcon = () => {
        switch (lighting) {
            case 'sun': return <Sun size={16} className="text-yellow-400" />;
            case 'moon': return <Moon size={16} className="text-blue-300" />;
            case 'artificial': return <Zap size={16} className="text-orange-400" />;
            case 'dark': return <EyeOff size={16} className="text-gray-500" />;
            default: return null;
        }
    };
    const getWeatherIcon = () => {
        switch (weather) {
            case 'rain': return <CloudRain size={16} className="text-blue-400" />;
            case 'heavy-rain': return <CloudLightning size={16} className="text-indigo-400" />;
            case 'snow': return <Snowflake size={16} className="text-white" />;
            case 'cloud': return <CloudFog size={16} className="text-gray-400" />;
            default: return null;
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
        // Only force snap if a NEW message arrived
        const hasNewMessage = messages.length > prevMessagesLengthRef.current;
        prevMessagesLengthRef.current = messages.length;

        // Slight delay ensures the DOM has calculated the new scrollHeight correctly.
        const timer = setTimeout(() => {
            // Force scroll ONLY if there's a new message. 
            // If it's just a prompt update, use false to respect user's manual scroll position.
            scrollToBottom(hasNewMessage, false);
        }, 50);
        return () => clearTimeout(timer);
    }, [messages, activePrompt, scrollToBottom]);


    const firedTriggerOccurrencesRef = useRef(new Set<string>());

    useEffect(() => {
        if (messages.length === 0) return;
        const timer = setTimeout(() => {
            if (!scrollContainerRef.current) return;
            const spits = Array.from(scrollContainerRef.current.querySelectorAll('.inline-btn[data-spit="true"]'));

            // Filter out any occurrences that have already been fired in this session
            const validSpits = spits.filter((el: any) => {
                const mid = el.dataset.mid || 'unknown';
                const bid = el.dataset.id || '';
                const context = el.dataset.context || '';
                const occKey = `${mid}:${bid}:${context}`;
                return !firedTriggerOccurrencesRef.current.has(occKey);
            });

            if (validSpits.length === 0) return;

            // Only trigger the MOST RECENT instance of any specific trigger text/id found in this batch
            const latestPerId: Record<string, HTMLElement> = {};
            validSpits.forEach((el: any) => {
                const bId = el.dataset.id || el.innerText;
                latestPerId[bId] = el;
                el.dataset.spit = "pending";
            });

            Object.values(latestPerId).forEach((el: any) => {
                const mid = el.dataset.mid || 'unknown';
                const bid = el.dataset.id || '';
                const context = el.dataset.context || '';
                firedTriggerOccurrencesRef.current.add(`${mid}:${bid}:${context}`);

                triggerSpit(el);
                el.dataset.spit = "triggered";
            });

            // Cleanup any that were marked pending but not latest
            validSpits.forEach((el: any) => {
                if (el.dataset.spit === "pending") el.dataset.spit = "skipped";
            });
        }, 50);
        return () => clearTimeout(timer);
    }, [messages, triggerSpit]);

    useEffect(() => {
        if (popoverState) {
            const handleClick = (e: MouseEvent) => {
                // Don't close if clicking inside the popover
                if ((e.target as HTMLElement).closest('.popover-menu')) return;
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
            className={`app-container ${isMobile ? 'is-mobile' : ''} ${btn.isEditMode ? 'edit-mode-active' : ''} ${isKeyboardOpen ? 'kb-open' : ''}`}
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
                <div className="overlay-layer" />
                <div className="screen-vignette" />

                <div className="lighting-container lighting-sun" style={{ opacity: lighting === 'sun' ? 1 : 0 }}><div className="lighting-inner" /></div>
                <div className="lighting-container lighting-moon" style={{ opacity: lighting === 'moon' ? 1 : 0 }}><div className="lighting-inner" /></div>
                <div className="lighting-container lighting-artificial" style={{ opacity: lighting === 'artificial' ? 1 : 0 }}><div className="lighting-inner" /></div>
                <div className="lighting-container lighting-dark" style={{ opacity: lighting === 'dark' ? 1 : 0 }}><div className="lighting-inner" /></div>

                <div className="weather-layer" style={{ opacity: weather === 'cloud' ? 1 : 0 }} />
                <div className={`weather-layer ${weather !== 'cloud' ? `weather-${weather}` : ''}`} />
                <div className={`fog-layer ${isFoggy ? 'fog-active' : ''}`} />
                {(weather === 'rain' || weather === 'heavy-rain') && <Rain heavy={weather === 'heavy-rain'} />}
                <div className={`combat-grayscale-filter ${inCombat ? 'active' : ''}`} />
                <div className={`combat-vignette ${inCombat ? 'active' : ''}`} />
                <div className={`combat-layer ${hitFlash ? 'combat-active' : ''}`} />
                <div className={`lightning-layer ${lightning ? 'lightning-active' : ''}`} />
                <div className={`death-overlay ${deathStage !== 'none' ? 'death-active' : ''}`} style={{ opacity: deathStage === 'fade_in' ? 0 : (deathStage === 'black_hold' ? 1 : undefined) }} />
                <div className={`death-image-layer ${deathStage === 'flash' ? 'death-flash' : ''}`} style={{ backgroundImage: `url(${DEATH_IMG})`, opacity: deathStage === 'flash' ? 1 : 0 }} />

                {spatButtons.map((sb, idx) => {
                    const hSlotWidth = 130;
                    const vSlotSpacing = 60; // Better spacing for mobile

                    let dynamicTargetX = sb.targetX;
                    let dynamicTargetY = sb.targetY;

                    if (isMobile) {
                        // Stack vertically upward on the right
                        // idx 0 (oldest) is at the bottom. 
                        // Set base to 60% height to stay clear of joystick/controls
                        dynamicTargetY = (window.innerHeight * 0.6) - (idx * vSlotSpacing);
                        // Land 15px from the right edge.
                        dynamicTargetX = window.innerWidth - 15;
                    } else {
                        // Desktop: horizontal stack from right to left
                        dynamicTargetX = sb.targetX - (idx * hSlotWidth);
                    }

                    return (
                        <div
                            key={sb.id}
                            className="spat-button"
                            style={{
                                '--start-x': `${Math.round(sb.startX)}px`,
                                '--start-y': `${Math.round(sb.startY)}px`,
                                '--target-x': `${Math.round(dynamicTargetX)}px`,
                                '--target-y': `${Math.round(dynamicTargetY)}px`,
                                '--target-transform': isMobile ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                                borderColor: sb.color,
                                boxShadow: `0 4px 15px rgba(0,0,0,0.5), 0 0 10px ${sb.color}`,
                                '--accent': sb.color
                            } as any}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (sb.action === 'nav') btn.setActiveSet(sb.command);
                                else executeCommand(sb.command);
                                setSpatButtons(prev => prev.filter(x => x.id !== sb.id));
                            }}
                        >
                            {sb.label}
                        </div>
                    );
                })}

                <div className="custom-buttons-layer">
                    {btn.buttons.filter(b => b.setId === btn.activeSet && b.isVisible && b.display !== 'inline').map(button => {
                        // Per-button gesture state stored in refs keyed by button id
                        return (
                            <div
                                key={button.id}
                                className={`custom-btn ${button.style.shape === 'pill' ? 'shape-pill' : button.style.shape === 'circle' ? 'shape-circle' : 'shape-rect'} ${btn.isEditMode && btn.editingButtonId === button.id ? 'is-editing' : ''} ${btn.isEditMode && btn.selectedButtonIds.has(button.id) ? 'is-selected' : ''}`}
                                style={{
                                    left: `${button.style.x}%`,
                                    top: `${button.style.y}%`,
                                    width: `${button.style.shape === 'circle' ? Math.max(button.style.w, button.style.h) : button.style.w}px`,
                                    height: `${button.style.shape === 'circle' ? Math.max(button.style.w, button.style.h) : button.style.h}px`,
                                    backgroundColor: button.style.transparent ? 'rgba(0,0,0,0.2)' : button.style.backgroundColor,
                                    border: button.style.transparent ? '1px dashed rgba(255,255,255,0.3)' : undefined
                                }}
                                onPointerDown={(e) => {
                                    if (btn.isEditMode) {
                                        handleDragStart(e, button.id, 'move');
                                        return;
                                    }
                                    // Existing pointer down logic for non-edit mode
                                    const currentTarget = e.currentTarget;
                                    currentTarget.setPointerCapture(e.pointerId);
                                    const startX = e.clientX, startY = e.clientY;
                                    (currentTarget as any)._didFire = false;
                                    (currentTarget as any)._startX = startX;
                                    (currentTarget as any)._startY = startY;

                                    // Long-press timer
                                    const lpt = setTimeout(() => {
                                        const el = currentTarget as any;
                                        el._didFire = true;
                                        triggerHaptic(60); // Stronger haptic for long-press
                                        el?.classList.remove('btn-glow-active'); void el?.offsetWidth; el?.classList.add('btn-glow-active');
                                        const cmd = button.longCommand || button.command;
                                        const actionType = button.longActionType || button.actionType || 'command';

                                        if (actionType === 'nav') btn.setActiveSet(cmd);
                                        else if (actionType === 'assign') {
                                            const rect = currentTarget.getBoundingClientRect();
                                            setPopoverState({ x: rect.right + 10, y: rect.top, setId: cmd, context: button.label, assignSourceId: button.id });
                                        }
                                        else if (actionType === 'menu') {
                                            const rect = currentTarget.getBoundingClientRect();
                                            setPopoverState({ x: rect.right + 10, y: rect.top, setId: cmd, context: button.label });
                                        }
                                        else executeCommand(cmd);
                                    }, 600); // Slightly longer for stability
                                    (currentTarget as any)._lpt = lpt;
                                }}
                                onPointerMove={(e) => {
                                    if (btn.isEditMode) return;
                                    const el = e.currentTarget as any;
                                    const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
                                    // Cancel long-press if moved more than 12px
                                    if ((Math.abs(dx) > 12 || Math.abs(dy) > 12) && el._lpt) {
                                        clearTimeout(el._lpt); el._lpt = null;
                                    }
                                }}
                                onPointerUp={(e) => {
                                    if (btn.isEditMode) return;
                                    const el = e.currentTarget as any;
                                    clearTimeout(el._lpt); el._lpt = null;
                                    if (el._didFire) { el._didFire = false; return; } // long-press already fired
                                    const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
                                    const isSwiped = Math.abs(dx) > 10 || Math.abs(dy) > 10;
                                    let cmd = button.command;
                                    let actionType = button.actionType || 'command';

                                    if (isSwiped && button.swipeCommands) {
                                        const absDx = Math.abs(dx), absDy = Math.abs(dy);
                                        const dir: 'up' | 'down' | 'left' | 'right' = absDx > absDy ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

                                        if (button.swipeCommands[dir]) {
                                            cmd = button.swipeCommands[dir]!;
                                            actionType = button.swipeActionTypes?.[dir] || 'command';
                                        } else {
                                            const fallback: 'up' | 'down' | 'left' | 'right' | undefined = (button.swipeCommands.up ? 'up' : button.swipeCommands.down ? 'down' : button.swipeCommands.left ? 'left' : button.swipeCommands.right ? 'right' : undefined);
                                            if (fallback) {
                                                cmd = button.swipeCommands[fallback]!;
                                                actionType = button.swipeActionTypes?.[fallback] || 'command';
                                            }
                                        }
                                    }

                                    if (!cmd) return;
                                    triggerHaptic(15);
                                    const htmlEl = e.currentTarget as HTMLElement;
                                    htmlEl.classList.remove('btn-glow-active'); void htmlEl.offsetWidth; htmlEl.classList.add('btn-glow-active');

                                    if (actionType === 'nav') btn.setActiveSet(cmd);
                                    else if (actionType === 'assign') {
                                        const rect = htmlEl.getBoundingClientRect();
                                        setPopoverState({ x: rect.right + 10, y: rect.top, setId: cmd, context: button.label, assignSourceId: button.id });
                                    }
                                    else if (actionType === 'menu') {
                                        const rect = htmlEl.getBoundingClientRect();
                                        setPopoverState({ x: rect.right + 10, y: rect.top, setId: cmd, context: button.label });
                                    }
                                    else executeCommand(cmd);
                                    if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (btn.isEditMode) {
                                        if (wasDraggingRef.current) return;
                                        if (e.ctrlKey || e.metaKey) return;
                                        btn.setEditingButtonId(button.id);
                                        if (!btn.selectedButtonIds.has(button.id)) btn.setSelectedIds(new Set([button.id]));
                                    }
                                }}
                            >
                                {button.label} {btn.isEditMode && <div className="resize-handle" onPointerDown={(e) => handleDragStart(e, button.id, 'resize')} />}
                            </div>
                        );
                    })}
                </div>


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
                        target={target}
                        onClearTarget={() => setTarget(null)}
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
                        <Mapper ref={mapperRef} isDesignMode={btn.isEditMode} characterName={characterName} isMmapperMode={isMmapperMode} />
                        {btn.isEditMode && <div className="resize-handle" style={{ zIndex: 101 }} onPointerDown={(e) => { e.stopPropagation(); handleDragStart(e, 'mapper', 'cluster-resize'); }} />}
                    </div>
                )}
                <div
                    className="stats-cluster"
                    style={{
                        position: 'absolute',
                        left: btn.uiPositions.stats?.x,
                        top: btn.uiPositions.stats?.y ?? (btn.uiPositions.stats?.x === undefined ? '80px' : undefined),
                        bottom: (btn.uiPositions.stats?.x !== undefined || btn.uiPositions.stats?.y !== undefined) ? 'auto' : undefined,
                        right: (btn.uiPositions.stats?.x !== undefined || btn.uiPositions.stats?.y !== undefined) ? 'auto' : '10px',
                        transform: btn.uiPositions.stats?.scale ? `scale(${btn.uiPositions.stats.scale})` : undefined,
                        transformOrigin: 'top left',
                        cursor: btn.isEditMode ? 'move' : undefined,
                        border: (btn.isEditMode && btn.dragState?.id === 'stats') ? '2px dashed #ffff00' : (btn.isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined),
                        padding: btn.isEditMode ? '10px' : undefined,
                        borderRadius: '20px',
                        zIndex: 50,
                        display: isMobile ? 'none' : 'flex'
                    }}
                    onPointerDown={(e) => {
                        if (btn.isEditMode) handleDragStart(e, 'stats', 'cluster');
                    }}
                >
                    {btn.isEditMode && <div className="resize-handle" onPointerDown={(e) => handleDragStart(e, 'stats', 'cluster-resize')} />}
                    <StatBars stats={stats} hpRowRef={hpRowRef} manaRowRef={manaRowRef} moveRowRef={moveRowRef} onClick={() => executeCommand('score')} />
                </div>

            </div> {/* Closes app-content-shaker */}

            <div className={`mobile-bottom-gutter ${isKeyboardOpen ? 'hidden' : ''}`}>
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
                        <Joystick joystickKnobRef={joystick.joystickKnobRef} joystickGlow={joystickGlow} btnGlow={btnGlow} onJoystickStart={joystick.handleJoystickStart} onJoystickMove={joystick.handleJoystickMove} onJoystickEnd={(e) => joystick.handleJoystickEnd(e, executeCommand, triggerHaptic, setJoystickGlow)} onNavClick={handleNavClick} />
                    </div>

                    <div className="xbox-cluster">
                        <button className="xbox-btn top" style={{ borderColor: '#fbbf24', color: '#fbbf24' }} onClick={() => { triggerHaptic(20); executeCommand('score'); }}>Y</button>
                        <button className="xbox-btn left" style={{ borderColor: '#3b82f6', color: '#3b82f6' }} onClick={() => { triggerHaptic(20); executeCommand('look'); }}>X</button>
                        <button className="xbox-btn right" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => { triggerHaptic(20); executeCommand('inventory'); }}>B</button>
                        <button className="xbox-btn bottom" style={{ borderColor: '#22c55e', color: '#22c55e' }} onClick={() => { triggerHaptic(20); executeCommand('score'); }}>A</button>
                    </div>
                </div>

                {isMobile && (
                    <div className="mobile-mini-map">
                        <Mapper ref={mapperRef} isDesignMode={btn.isEditMode} characterName={characterName} isMmapperMode={isMmapperMode} />
                    </div>
                )}
            </div>

            {btn.isEditMode && <div className="add-btn-fab" onClick={() => btn.createButton()}><Plus size={32} /></div>}

            {
                popoverState && (
                    <div className="popover-menu" style={{ left: popoverState.x, top: popoverState.y }}>
                        <div className="popover-header">
                            {popoverState.setId === 'player' || popoverState.setId === 'selection' || popoverState.setId === 'object' ? `Actions: ${popoverState.context} ` : `Set: ${popoverState.setId} `}
                        </div>

                        {(popoverState.setId === 'selection') && (
                            <div className="popover-item" onClick={() => {
                                setTarget(popoverState.context || null);
                                setPopoverState(null);
                                addMessage('system', `Target set to: ${popoverState.context}`);
                            }}>
                                Set as Target
                            </div>
                        )}

                        <>
                            {popoverState.setId === 'setmanager' ? (
                                // List all available button sets instead of buttons
                                btn.availableSets.map(setName => (
                                    <div key={setName} className="popover-item" onClick={() => {
                                        if (popoverState.assignSourceId) {
                                            btn.setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ?
                                                { ...b, command: setName, label: setName.toUpperCase(), actionType: 'nav' } : b
                                            ));
                                            setPopoverState(null);
                                            addMessage('system', `Assigned sub-menu '${setName}' to button.`);
                                        }
                                    }}>
                                        Switch to: {setName}
                                    </div>
                                ))
                            ) : (
                                // Default: List buttons from the target set
                                btn.buttons.filter(b => b.setId === popoverState!.setId).map(button => (
                                    <div key={button.id} className="popover-item" onClick={(e) => {
                                        if (popoverState?.assignSourceId) {
                                            btn.setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? { ...b, command: button.command, label: button.label, actionType: button.actionType || 'command' } : b));
                                            setPopoverState(null);
                                            addMessage('system', `Assigned '${button.label}' to button.`);
                                        } else {
                                            handleButtonClick(button, e, popoverState!.context);
                                        }
                                    }}>{button.label}</div>
                                ))
                            )}
                            {popoverState.setId !== 'setmanager' && btn.buttons.filter(b => b.setId === popoverState!.setId).length === 0 && <div className="popover-empty">No buttons in set '{popoverState.setId}'</div>}
                        </>
                    </div>
                )
            }

            {
                isSettingsOpen && (
                    <SettingsModal
                        setIsSettingsOpen={setIsSettingsOpen}
                        settingsTab={settingsTab}
                        setSettingsTab={setSettingsTab}
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
                        status={status}
                        connect={connect}
                        isMmapperMode={isMmapperMode}
                        setIsMmapperMode={setIsMmapperMode}
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
                isSetManagerOpen && (
                    <SetManagerModal
                        buttons={btn.buttons}
                        availableSets={btn.availableSets}
                        onClose={() => setIsSetManagerOpen(false)}
                        onEditButton={(id) => { setIsSetManagerOpen(false); btn.setEditingButtonId(id); }}
                        onDeleteButton={btn.deleteButton}
                        onDeleteSet={btn.deleteSet}
                        onCreateButton={btn.createButton}
                        onSaveAsDefault={btn.saveAsDefault}
                        onSaveAsCoreDefault={btn.saveAsCoreDefault}
                        combatSet={btn.combatSet}
                        defaultSet={btn.defaultSet}
                        onSetCombatSet={btn.setCombatSet}
                        onSetDefaultSet={btn.setDefaultSet}
                    />
                )
            }

            {
                isMobile && (
                    <>
                        <div className={`drawer-backdrop ${(isInventoryOpen || isCharacterOpen) ? 'open' : ''}`} onClick={() => { setIsInventoryOpen(false); setIsCharacterOpen(false); }} />

                        <div
                            className={`inventory-drawer ${isInventoryOpen ? 'open' : ''}`}
                            onPointerDown={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.closest('button') || target.closest('a')) return;
                                e.currentTarget.setPointerCapture(e.pointerId);
                                (e.currentTarget as any)._startY = e.clientY;
                                (e.currentTarget as any)._startX = e.clientX;
                            }}
                            onPointerUp={(e) => {
                                const startY = (e.currentTarget as any)._startY;
                                const startX = (e.currentTarget as any)._startX;

                                if (startY !== undefined && startY !== null && startX !== undefined && startX !== null) {
                                    const deltaY = e.clientY - startY;
                                    const deltaX = e.clientX - startX;
                                    const absDeltaX = Math.abs(deltaX);

                                    // ENTIRE drawer is now a swipe target.
                                    // 1. Down swipe (to close like a drawer)
                                    const isDownSwipe = deltaY > 20 && deltaY > absDeltaX;
                                    if (isDownSwipe) {
                                        const drawerContent = e.currentTarget.querySelector('.drawer-content');
                                        const scrolled = drawerContent ? drawerContent.scrollTop : 0;
                                        // If at top or if swipe was aggressive/on-header, close.
                                        if (scrolled <= 5 || deltaY > 100 || (e.target as HTMLElement).closest('.drawer-header')) {
                                            triggerHaptic(40);
                                            setIsInventoryOpen(false);
                                        }
                                    }
                                    // 2. Horizontal swipe dismissed (logic of side drawers)
                                    else if (absDeltaX > 30 && absDeltaX > Math.abs(deltaY)) {
                                        triggerHaptic(40);
                                        setIsInventoryOpen(false);
                                    }
                                }
                                (e.currentTarget as any)._startY = null;
                                (e.currentTarget as any)._startX = null;
                            }}
                            onPointerCancel={(e) => {
                                (e.currentTarget as any)._startY = null;
                                (e.currentTarget as any)._startX = null;
                            }}
                            style={{ touchAction: 'pan-x pan-y' }}
                        >
                            <div className="drawer-header"
                                style={{ cursor: 'ns-resize', touchAction: 'none', height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}
                            >
                                <div className="swipe-indicator" style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px' }} />
                                <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>Equipment & Inventory</span>
                                <button onClick={() => { triggerHaptic(20); setIsInventoryOpen(false); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', display: 'flex', flexDirection: isMobile && windowWidth < 600 ? 'column' : 'row' }}>
                                <div style={{ flex: 1, padding: '20px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '10px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.8rem', letterSpacing: '2px' }}>EQUIPMENT</div>
                                    <div dangerouslySetInnerHTML={{ __html: eqHtml }} />
                                </div>
                                <div style={{ flex: 1, padding: '20px' }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '10px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.8rem', letterSpacing: '2px' }}>INVENTORY</div>
                                    <div dangerouslySetInnerHTML={{ __html: inventoryHtml }} />
                                </div>
                            </div>
                        </div>

                        <div
                            className={`character-drawer ${isCharacterOpen ? 'open' : ''}`}
                            onPointerDown={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.closest('button') || target.closest('a')) return;
                                e.currentTarget.setPointerCapture(e.pointerId);
                                (e.currentTarget as any)._startX = e.clientX;
                                (e.currentTarget as any)._startY = e.clientY;
                            }}
                            onPointerUp={(e) => {
                                const startX = (e.currentTarget as any)._startX;
                                const startY = (e.currentTarget as any)._startY;
                                if (startX !== undefined && startX !== null) {
                                    const deltaX = startX - e.clientX;
                                    const deltaY = Math.abs(e.clientY - (startY || 0));
                                    // Left swipe to close anywhere in drawer
                                    if (deltaX > 20 && deltaX > deltaY) {
                                        triggerHaptic(40);
                                        setIsCharacterOpen(false);
                                    }
                                }
                                (e.currentTarget as any)._startX = null;
                                (e.currentTarget as any)._startY = null;
                            }}
                            onPointerCancel={(e) => {
                                (e.currentTarget as any)._startX = null;
                            }}
                            style={{ touchAction: 'pan-y' }}
                        >
                            <div className="drawer-content" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px', position: 'relative', touchAction: 'pan-y' }}>
                                {/* Visual Swipe Handle Overlay */}
                                <div className="swipe-indicator" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '6px', height: '80px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px', pointerEvents: 'none' }} />
                                <div className="drawer-title-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px' }}>Character</span>
                                    <button onClick={() => { triggerHaptic(20); setIsCharacterOpen(false); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                                </div>

                                <div style={{ marginBottom: '25px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px' }}>
                                    <StatBars stats={stats} hpRowRef={hpRowRef} manaRowRef={manaRowRef} moveRowRef={moveRowRef} onClick={() => executeCommand('score')} orientation="horizontal" />
                                </div>

                                <div className="controls-section" style={{ marginBottom: '25px' }}>
                                    {/* MOOD SLIDER */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px' }}>MOOD</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{mood === 'berserk' ? 'Berserk' : mood}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <input
                                                type="range"
                                                min="0"
                                                max="4"
                                                step="1"
                                                value={['wimpy', 'prudent', 'normal', 'brave', 'aggressive'].indexOf(mood === 'berserk' ? 'aggressive' : mood)}
                                                onChange={(e) => {
                                                    const options = ['wimpy', 'prudent', 'normal', 'brave', 'aggressive'];
                                                    const val = options[parseInt(e.target.value)];
                                                    setMood(val);
                                                    executeCommand(`change mood ${val}`);
                                                    triggerHaptic(15);
                                                }}
                                                className="mobile-slider"
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newVal = mood === 'berserk' ? 'aggressive' : 'berserk';
                                                    setMood(newVal);
                                                    executeCommand(`change mood ${newVal}`);
                                                    triggerHaptic(30);
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: mood === 'berserk' ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)',
                                                    background: mood === 'berserk' ? 'rgba(74, 222, 128, 0.2)' : 'transparent',
                                                    color: mood === 'berserk' ? 'var(--accent)' : '#fff',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                BERSERK
                                            </button>
                                        </div>
                                    </div>

                                    {/* SPELL SPEED SLIDER */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px' }}>SPELL SPEED</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{spellSpeed}</div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="4"
                                            step="1"
                                            value={['quick', 'fast', 'normal', 'careful', 'thorough'].indexOf(spellSpeed)}
                                            onChange={(e) => {
                                                const options = ['quick', 'fast', 'normal', 'careful', 'thorough'];
                                                const val = options[parseInt(e.target.value)];
                                                setSpellSpeed(val);
                                                executeCommand(`change spell ${val}`);
                                                triggerHaptic(15);
                                            }}
                                            className="mobile-slider"
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    {/* ALERTNESS SLIDER */}
                                    <div style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '2px' }}>ALERTNESS</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>{alertness}</div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="4"
                                            step="1"
                                            value={['normal', 'careful', 'attentive', 'vigilant', 'paranoid'].indexOf(alertness)}
                                            onChange={(e) => {
                                                const options = ['normal', 'careful', 'attentive', 'vigilant', 'paranoid'];
                                                const val = options[parseInt(e.target.value)];
                                                setAlertness(val);
                                                executeCommand(`change alert ${val}`);
                                                triggerHaptic(15);
                                            }}
                                            className="mobile-slider"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                                <div className="stat-section">
                                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '10px', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', fontSize: '0.8rem', letterSpacing: '2px' }}>STATUS</div>
                                    <div dangerouslySetInnerHTML={{ __html: statsHtml }} />
                                </div>
                            </div>
                        </div>

                    </>
                )
            }
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<MudClient />);

