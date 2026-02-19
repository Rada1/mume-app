import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Sun, Moon, Zap, EyeOff, CloudRain, CloudLightning, Snowflake, CloudFog, Plus, Monitor, Smartphone, Keyboard, Package, Swords, ScrollText } from 'lucide-react';

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
import InputArea, { InputAreaHandle } from './components/InputArea';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import EditButtonModal from './components/EditButtonModal';
import SetManagerModal from './components/SetManagerModal';
import GameDrawer from './components/GameDrawer';

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
    const [weather, setWeather] = useState<WeatherType>('none');
    const [isFoggy, setIsFoggy] = useState(false);
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
    const [isSetManagerOpen, setIsSetManagerOpen] = useState(false);
    const [roomPlayers, setRoomPlayers] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(() => {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        return (isTouch || isSmallScreen) ? 'mobile' : 'desktop';
    });
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const inputAreaRef = useRef<InputAreaHandle>(null);

    // --- Drawer state ---
    const [invDrawerOpen, setInvDrawerOpen] = useState(false);
    const [charDrawerOpen, setCharDrawerOpen] = useState(false);
    const [invItems, setInvItems] = useState<string[]>([]);
    const [eqItems, setEqItems] = useState<string[]>([]);
    const [statLines, setStatLines] = useState<string[]>([]);
    const [invLoading, setInvLoading] = useState(false);
    const [charLoading, setCharLoading] = useState(false);
    type DrawerAwait = 'inv' | 'stat' | 'eq' | null;
    const awaitingDrawer = useRef<DrawerAwait>(null);
    const drawerBuffer = useRef<{ stat: string[]; eq: string[]; inv: string[] }>({
        stat: [], eq: [], inv: []
    });

    const wasDraggingRef = useRef(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const navIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const navPathRef = useRef<string[]>([]);
    const didLongPressRef = useRef(false);
    const lastCameraRoomIdRef = useRef<number | null>(null);
    const promptTerrainRef = useRef<string | null>(null);
    const inCombatRef = useRef(false);

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
    const hpRowRef = useRef<HTMLDivElement>(null);
    const manaRowRef = useRef<HTMLDivElement>(null);
    const moveRowRef = useRef<HTMLDivElement>(null);
    const soundTriggersRef = useRef(soundTriggers);
    useEffect(() => { soundTriggersRef.current = soundTriggers; }, [soundTriggers]);

    // --- Custom Hooks ---

    const btn = useButtons();
    const { audioCtxRef, initAudio, playSound, triggerHaptic } = useSoundSystem();
    const joystick = useJoystick();



    const hpRatio = stats.maxHp > 0 ? stats.hp / stats.maxHp : 0;
    const manaRatio = stats.maxMana > 0 ? stats.mana / stats.maxMana : 0;
    const moveRatio = stats.maxMove > 0 ? stats.move / stats.maxMove : 0;

    // --- Derived State & Handlers ---
    const isCombatLine = (text: string): boolean => {
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
    };

    const isCommunicationLine = (text: string): boolean => {
        const t = text.toLowerCase();
        return (
            t.includes(' says ') || t.includes(' narrate ') || t.includes(' narrates ') ||
            t.includes(' tell ') || t.includes(' tells ') || t.includes(' whisper ') ||
            t.includes(' whispers ') || t.includes(' yell ') || t.includes(' yells ') ||
            t.includes(' states ') || t.includes(' state ') ||
            /^you (tell|say|whisper|yell|narrate|state)\b/i.test(t) ||
            /^\w+ (says|narrates|tells|whispers|yells|states)\b/i.test(t)
        );
    };

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
        const textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        const lower = textOnly.toLowerCase();

        // Stats Parsing
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
                '(': 'hills', '<': 'mountain', '%': 'shallow', '~': 'water',
                '+': 'road', 'W': 'rapids', 'U': 'underwater', ':': 'brush',
                '=': 'tunnel', '0': 'cavern'
            };

            // 1. Check for explicit names
            const terrainPatterns = [
                /\b(Inside|City|Field|Forest|Hills|Mountain|Swimming|Underwater|Air|Desert|Road|Underground|Rapids|Brush|Tunnel|Cavern)\b/i,
                /\[\s*(Inside|City|Field|Forest|Hills|Mountain|Swimming|Underwater|Air|Desert|Road|Underground|Rapids|Brush|Tunnel|Cavern)\s*\]/i,
                /\(\s*(Inside|City|Field|Forest|Hills|Mountain|Swimming|Underwater|Air|Desert|Road|Underground|Rapids|Brush|Tunnel|Cavern)\s*\)/i
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

            // 2. Check for symbols from cheat sheet
            if (!found) {
                // Check if any of our symbols appear in the standard prompt brackets/parentheses or as standalone
                for (const [symbol, name] of Object.entries(terrainSymbols)) {
                    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const symPattern = new RegExp(`([\\[\\(\\s])${escaped}([\\]\\)\\s]|$)`);
                    if (symPattern.test(textOnly)) {
                        promptTerrainRef.current = name;
                        found = true;
                        break;
                    }
                }
            }
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

        const mumePromptRegex = /^([\*\)\!o\.\[f<%\~+WU:=0\#\?\(].*[>:])\s*(.*)$/;
        const pMatch = cleanLine.match(mumePromptRegex);

        if (pMatch) {
            const promptPart = pMatch[1];
            const messagePart = pMatch[2];
            if (messagePart) addMessage('game', messagePart);
        } else {
            addMessage('game', cleanLine);
        }
    }, [detectLighting, addMessage, btn]);

    const telnet = useTelnet({
        connectionUrl, addMessage, setStatus, setStats, setWeather, setIsFoggy,
        setRumble, setHitFlash, setDeathStage, detectLighting, processLine,
        setPrompt: setActivePrompt, setInCombat,
        onOpponentChange: (name) => {
            // Auto-targeting removed for items/objects
        }
    });

    const callbacksRef = useRef<any>(null);
    useEffect(() => {
        callbacksRef.current = {
            onRoomInfo: (data: any) => {
                // Delegate to Robust Mapper

            },
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
            onRoomInfo: (data) => callbacksRef.current.onRoomInfo(data),
            onRoomPlayers: (data) => callbacksRef.current.onRoomPlayers(data)
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
        addMessage('user', finalCmd);
        const moveCmd = finalCmd.toLowerCase().trim();
        const validMoves: Direction[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd'];
        let dir: Direction | null = null;
        if (validMoves.includes(moveCmd as any)) dir = moveCmd as Direction;
        else if (moveCmd === 'north') dir = 'n'; else if (moveCmd === 'south') dir = 's'; else if (moveCmd === 'east') dir = 'e'; else if (moveCmd === 'west') dir = 'w';
        else if (moveCmd === 'up') dir = 'u'; else if (moveCmd === 'down') dir = 'd';
        else if (moveCmd === 'northeast') dir = 'ne'; else if (moveCmd === 'northwest') dir = 'nw';
        else if (moveCmd === 'southeast') dir = 'se'; else if (moveCmd === 'southwest') dir = 'sw';

        if (status === 'connected') telnet.sendCommand(finalCmd);
        else addMessage('error', 'Not connected.');
    };

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        const cmd = input.trim();
        // Allow empty command to just send 'return'
        setInput('');
        executeCommand(cmd);
    };

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

    // --- Interaction Handlers ---
    const handleNavClick = (dir: 'up' | 'down') => { triggerHaptic(30); executeCommand(dir); setBtnGlow(prev => ({ ...prev, [dir]: true })); setTimeout(() => setBtnGlow(prev => ({ ...prev, [dir]: false })), 300); };
    const handleLogClick = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        const target = e.target as HTMLElement, btnEl = target.closest('.inline-btn') as HTMLElement;
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
    };
    const handleMouseUp = (e: React.MouseEvent) => {
        // Delay to ensure selection is complete and accurate
        setTimeout(() => {
            const selection = window.getSelection();
            const selectedText = selection?.toString().trim();
            if (selectedText && selectedText.length > 0 && selectedText.length < 50) {
                setTarget(selectedText);
                addMessage('system', `Target set to: ${selectedText}`);
                triggerHaptic(20);
                window.getSelection()?.removeAllRanges(); // Clear selection for cleaner look
            }
        }, 50);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (selectedText && selectedText.length > 0 && selectedText.length < 50) {
            setTarget(selectedText);
            addMessage('system', `Target set to: ${selectedText}`);
            triggerHaptic(20);
            window.getSelection()?.removeAllRanges();
        }
    };

    const processMessageHtml = (html: string) => {
        let newHtml = html;
        const itemMarkerRegex = /^(a|an|the|some|several|two|three|four|five|six|seven|eight|nine|ten|\d+)/i;


        // Highlight Current Target (Top priority)
        if (target) {
            try {
                const pattern = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Negative lookahead to avoid wrapping inside a tag
                const regex = new RegExp(`\\b(${pattern})\\b(?![^<]*>|[^<>]*<\\/span>)`, 'gi');
                newHtml = newHtml.replace(regex, (match) => `<span class="target-highlight">${match}</span>`);
            } catch (e) { }
        }



        return newHtml;
    };

    const getMessageClass = (index: number, total: number) => {
        const anchorIndex = focusedIndex !== null ? focusedIndex : total - 1;
        const distance = anchorIndex - index;
        if (distance < 5) return 'msg-latest'; if (distance < 15) return 'msg-recent'; if (distance < 40) return 'msg-old'; return 'msg-ancient';
    };

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

    const handleDragStart = (e: React.MouseEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => {
        if (!btn.isEditMode) return;
        e.stopPropagation(); e.preventDefault();

        if (type === 'cluster' || type === 'cluster-resize') {
            const clusterId = id as 'joystick' | 'stats';
            const rect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
            const pos = btn.uiPositions[clusterId];
            const startX = pos?.x ?? rect.left;
            const startY = pos?.y ?? rect.top;
            const initialScale = pos?.scale ?? 1;
            btn.setDragState({
                id: clusterId,
                startX: e.clientX,
                startY: e.clientY,
                initialX: startX,
                initialY: startY,
                type: type as any,
                initialW: initialScale, // Re-purpose initialW for scale
                initialH: 0
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
        effectiveSelected.forEach(selId => {
            const b = btn.buttons.find(x => x.id === selId);
            if (b) initialPositions[selId] = { x: b.style.x, y: b.style.y };
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
            initialPositions: type === 'move' ? initialPositions : undefined
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (btn.dragState?.type === 'cluster') {
            const dx = e.clientX - btn.dragState.startX;
            const dy = e.clientY - btn.dragState.startY;
            const clusterId = btn.dragState.id as 'joystick' | 'stats';
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
            const clusterId = btn.dragState.id as 'joystick' | 'stats';
            const newScale = Math.max(0.5, Math.min(2.5, btn.dragState.initialW + dx / 200));
            btn.setUiPositions(prev => ({
                ...prev,
                [clusterId]: {
                    ...prev[clusterId],
                    scale: newScale
                }
            }));
            return;
        }

        if (btn.dragState) {
            const dx = e.clientX - btn.dragState.startX, dy = e.clientY - btn.dragState.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDraggingRef.current = true;
            btn.setButtons(prev => prev.map(b => {
                if (btn.dragState?.type === 'resize') {
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
        if (btn.dragState) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
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
        addMessage('system', 'Welcome to GEMINI MUD Client.');
        addMessage('system', `Default Target: ${DEFAULT_URL} `);
        setTimeout(() => connect(), 1000);
        return () => telnet.disconnect();
    }, []);

    const scrollToBottom = useCallback((force = false) => {
        if ((focusedIndex === null || force) && messagesEndRef.current && scrollContainerRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [focusedIndex]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, activePrompt, focusedIndex, scrollToBottom]);

    // Handle mobile keyboard and window resizing
    useEffect(() => {
        const handleResize = () => scrollToBottom();
        window.visualViewport?.addEventListener('resize', handleResize);
        window.visualViewport?.addEventListener('scroll', handleResize);
        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, [scrollToBottom]);

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

    // Track last processed message index for drawer parsing
    const lastParserIdx = useRef(-1);

    // --- Parse incoming messages for drawer data ---
    useEffect(() => {
        if (!awaitingDrawer.current) return;
        // Process only NEW messages since last run
        const startIdx = lastParserIdx.current + 1;
        const newMsgs = messages.slice(startIdx);
        if (newMsgs.length === 0) return;
        lastParserIdx.current = messages.length - 1;

        for (const msg of newMsgs) {
            // Skip user-echoed commands
            if (msg.type === 'user' || msg.type === 'prompt') continue;
            const raw = msg.textRaw.trim();

            if (awaitingDrawer.current === 'inv') {
                // Skip the header line
                if (/^You are carrying/i.test(raw)) continue;
                // Empty line or a prompt character signals end
                if (raw === '' || raw === '>' || raw.startsWith('HP:')) {
                    if (drawerBuffer.current.inv.length > 0) {
                        setInvItems([...drawerBuffer.current.inv]);
                        setInvLoading(false);
                        awaitingDrawer.current = null;
                        drawerBuffer.current.inv = [];
                    }
                    continue;
                }
                drawerBuffer.current.inv.push(raw);
            } else if (awaitingDrawer.current === 'stat') {
                // "You are using:" marks transition to eq section
                if (/^You are using/i.test(raw)) {
                    awaitingDrawer.current = 'eq';
                    continue;
                }
                if (raw !== '') drawerBuffer.current.stat.push(raw);
            } else if (awaitingDrawer.current === 'eq') {
                if (raw === '' || raw === '>' || raw.startsWith('HP:')) {
                    if (drawerBuffer.current.eq.length > 0) {
                        setStatLines([...drawerBuffer.current.stat]);
                        setEqItems([...drawerBuffer.current.eq]);
                        setCharLoading(false);
                        awaitingDrawer.current = null;
                        drawerBuffer.current.stat = [];
                        drawerBuffer.current.eq = [];
                    }
                    continue;
                }
                if (raw !== '') drawerBuffer.current.eq.push(raw);
            }
        }
    }, [messages]);

    const openInventoryDrawer = () => {
        setInvDrawerOpen(true);
        setInvLoading(true);
        setInvItems([]);
        drawerBuffer.current.inv = [];
        // Stamp the watermark BEFORE sending so the parser ignores all prior messages
        lastParserIdx.current = messages.length - 1;
        awaitingDrawer.current = 'inv';
        executeCommand('inv');
    };

    const openCharDrawer = () => {
        setCharDrawerOpen(true);
        setCharLoading(true);
        setStatLines([]);
        setEqItems([]);
        drawerBuffer.current.stat = [];
        drawerBuffer.current.eq = [];
        // Stamp the watermark BEFORE sending so the parser ignores all prior messages
        lastParserIdx.current = messages.length - 1;
        awaitingDrawer.current = 'stat';
        executeCommand('stat');
        setTimeout(() => executeCommand('eq'), 200);
    };

    return (
        <div className={`viewport-sim-wrapper ${viewMode}`}>
            <div className={`app-container ${btn.isEditMode ? 'edit-mode-active' : ''}`}>
                <div className={`app-content-shaker ${rumble ? 'rumble-active' : ''}`}>
                    <div className="background-layer" style={{ backgroundImage: `url(${bgImage})` }} />
                    <div className="overlay-layer" />
                    <div className="screen-vignette" />

                    <div className="lighting-container lighting-sun" style={{ opacity: lighting === 'sun' ? 1 : 0 }}><div className="lighting-inner" /></div>
                    <div className="lighting-container lighting-moon" style={{ opacity: lighting === 'moon' ? 1 : 0 }}><div className="lighting-inner" /></div>
                    <div className="lighting-container lighting-artificial" style={{ opacity: lighting === 'artificial' ? 1 : 0 }}><div className="lighting-inner" /></div>
                    <div className="lighting-container lighting-dark" style={{ opacity: lighting === 'dark' ? 1 : 0 }}><div className="lighting-inner" /></div>

                    <div className={`weather-layer ${weather !== 'cloud' ? `weather-${weather}` : ''}`} />
                    <div className="weather-layer weather-cloud" style={{ opacity: weather === 'cloud' ? 1 : 0 }} />
                    <div className={`fog-layer ${isFoggy ? 'fog-active' : ''}`} />
                    {(weather === 'rain' || weather === 'heavy-rain') && <Rain heavy={weather === 'heavy-rain'} />}
                    <div className={`combat-grayscale-filter ${inCombat ? 'active' : ''}`} />
                    <div className={`combat-vignette ${inCombat ? 'active' : ''}`} />
                    <div className={`combat-layer ${hitFlash ? 'combat-active' : ''}`} />
                    <div className={`lightning-layer ${lightning ? 'lightning-active' : ''}`} />
                    <div className={`death-overlay ${deathStage !== 'none' ? 'death-active' : ''}`} style={{ opacity: deathStage === 'fade_in' ? 0 : (deathStage === 'black_hold' ? 1 : undefined) }} />
                    <div className={`death-image-layer ${deathStage === 'flash' ? 'death-flash' : ''}`} style={{ backgroundImage: `url(${DEATH_IMG})`, opacity: deathStage === 'flash' ? 1 : 0 }} />

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
                                    onMouseDown={(e) => { if (btn.isEditMode) handleDragStart(e, button.id, 'move'); }}
                                    onPointerDown={(e) => {
                                        if (btn.isEditMode) return;
                                        e.currentTarget.setPointerCapture(e.pointerId);
                                        const startX = e.clientX, startY = e.clientY;
                                        let didFire = false;
                                        // Long-press timer
                                        const lpt = setTimeout(() => {
                                            didFire = true;
                                            triggerHaptic(40);
                                            const el = e.currentTarget as HTMLElement;
                                            el?.classList.remove('btn-glow-active'); void el?.offsetWidth; el?.classList.add('btn-glow-active');
                                            const cmd = button.longCommand || button.command;
                                            const actionType = button.longActionType || button.actionType || 'command';

                                            if (actionType === 'nav') btn.setActiveSet(cmd);
                                            else if (actionType === 'assign') {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                setPopoverState({ x: rect.right + 10, y: rect.top, setId: cmd, context: button.label, assignSourceId: button.id });
                                            }
                                            else if (actionType === 'menu') {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                setPopoverState({ x: rect.right + 10, y: rect.top, setId: cmd, context: button.label });
                                            }
                                            else executeCommand(cmd);
                                        }, 500);
                                        // Store on element for cleanup
                                        (e.currentTarget as any)._lpt = lpt;
                                        (e.currentTarget as any)._startX = startX;
                                        (e.currentTarget as any)._startY = startY;
                                        (e.currentTarget as any)._didFire = false;
                                    }}
                                    onPointerMove={(e) => {
                                        if (btn.isEditMode) return;
                                        const el = e.currentTarget as any;
                                        const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
                                        // Cancel long-press if moved more than 8px
                                        if ((Math.abs(dx) > 8 || Math.abs(dy) > 8) && el._lpt) {
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
                                        if (btn.isEditMode) {
                                            if (wasDraggingRef.current) return;
                                            if (e.ctrlKey || e.metaKey) return;
                                            btn.setEditingButtonId(button.id);
                                            if (!btn.selectedButtonIds.has(button.id)) btn.setSelectedIds(new Set([button.id]));
                                        } else e.stopPropagation();
                                    }}
                                >
                                    {button.label} {btn.isEditMode && <div className="resize-handle" onMouseDown={(e) => handleDragStart(e, button.id, 'resize')} />}
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
                        />
                        <MessageLog messages={messages} activePrompt={activePrompt} inCombat={inCombat} scrollContainerRef={scrollContainerRef} messagesEndRef={messagesEndRef} scrollToBottom={scrollToBottom} onScroll={() => {
                            const container = scrollContainerRef.current; if (!container) return; const { scrollTop, scrollHeight, clientHeight } = container, scrollBottom = scrollTop + clientHeight;
                            // Threshold lowered to 50 for mobile sensitivity
                            if (scrollHeight - scrollBottom < 50) { if (focusedIndex !== null) setFocusedIndex(null); return; }
                            const children = container.children; let newFocusIndex = 0;
                            for (let i = Math.min(children.length - 2, messages.length - 1); i >= 0; i--) { const child = children[i] as HTMLElement; if (child.offsetTop < scrollBottom) { newFocusIndex = i; break; } }
                            setFocusedIndex(newFocusIndex);
                        }} onLogClick={handleLogClick} onMouseUp={handleMouseUp} onDoubleClick={handleDoubleClick} getMessageClass={getMessageClass} processMessageHtml={processMessageHtml} />
                        {/* Keyboard FAB — fades out when input is expanded */}
                        {viewMode === 'mobile' && (
                            <div
                                className="mobile-input-toggle"
                                onClick={() => {
                                    // focusInput must be called synchronously inside the
                                    // gesture event so mobile browsers show the keyboard
                                    inputAreaRef.current?.focusInput();
                                    setIsInputExpanded(true);
                                }}
                                style={{
                                    position: 'absolute',
                                    bottom: 'calc(8dvh + 70px + 20px)',
                                    left: '50%',
                                    width: '60px',
                                    height: '60px',
                                    background: 'none',
                                    backdropFilter: 'none',
                                    border: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    zIndex: 100,
                                    opacity: isInputExpanded ? 0 : 0.35,
                                    pointerEvents: isInputExpanded ? 'none' : 'auto',
                                    transition: 'opacity 0.25s ease, transform 0.25s ease',
                                    transform: `translateX(-50%) scale(${isInputExpanded ? 0.7 : 1})`
                                }}
                            >
                                <Keyboard size={32} color="white" />
                            </div>
                        )}
                        {/* InputArea — always rendered, animates in/out */}
                        <InputArea
                            ref={inputAreaRef}
                            input={input}
                            setInput={setInput}
                            onSend={(val) => {
                                handleSend(val);
                                // keyboard stays open; only the chevron button collapses it
                            }}
                            target={target}
                            onClearTarget={() => setTarget(null)}
                            terrain={undefined}
                            isExpanded={viewMode === 'mobile' ? isInputExpanded : undefined}
                            onHide={viewMode === 'mobile' ? () => setIsInputExpanded(false) : undefined}
                        />
                    </div>


                    <div
                        className="stats-cluster"
                        style={{
                            left: btn.uiPositions.stats?.x,
                            top: btn.uiPositions.stats?.y,
                            bottom: btn.uiPositions.stats ? 'auto' : undefined,
                            right: btn.uiPositions.stats ? 'auto' : undefined,
                            transform: btn.uiPositions.stats?.scale ? `scale(${btn.uiPositions.stats.scale})` : undefined,
                            transformOrigin: 'top left',
                            cursor: btn.isEditMode ? 'move' : undefined,
                            border: (btn.isEditMode && btn.dragState?.id === 'stats') ? '2px dashed #ffff00' : (btn.isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined),
                            padding: btn.isEditMode ? '10px' : undefined,
                            borderRadius: '20px'
                        }}
                        onMouseDown={(e) => {
                            if (btn.isEditMode) handleDragStart(e, 'stats', 'cluster');
                        }}
                    >
                        {btn.isEditMode && <div className="resize-handle" onMouseDown={(e) => handleDragStart(e, 'stats', 'cluster-resize')} />}
                        <StatBars stats={stats} hpRowRef={hpRowRef} manaRowRef={manaRowRef} moveRowRef={moveRowRef} />
                    </div>

                    <div
                        className="joystick-cluster"
                        style={{
                            left: btn.uiPositions.joystick?.x,
                            top: btn.uiPositions.joystick?.y,
                            bottom: btn.uiPositions.joystick ? 'auto' : undefined,
                            right: btn.uiPositions.joystick ? 'auto' : undefined,
                            transform: btn.uiPositions.joystick?.scale ? `scale(${btn.uiPositions.joystick.scale})` : undefined,
                            transformOrigin: (btn.uiPositions.joystick?.y && btn.uiPositions.joystick.y > window.innerHeight / 2) ? 'bottom left' : 'top left',
                            cursor: btn.isEditMode ? 'move' : undefined,
                            border: (btn.isEditMode && btn.dragState?.id === 'joystick') ? '2px dashed #ffff00' : (btn.isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined),
                            padding: btn.isEditMode ? '10px' : undefined,
                            borderRadius: '20px'
                        }}
                        onMouseDown={(e) => {
                            if (btn.isEditMode) handleDragStart(e, 'joystick', 'cluster');
                        }}
                    >
                        {btn.isEditMode && <div className="resize-handle" onMouseDown={(e) => handleDragStart(e, 'joystick', 'cluster-resize')} />}
                        <Joystick joystickKnobRef={joystick.joystickKnobRef} joystickGlow={joystickGlow} btnGlow={btnGlow} onJoystickStart={joystick.handleJoystickStart} onJoystickMove={joystick.handleJoystickMove} onJoystickEnd={(e) => joystick.handleJoystickEnd(e, executeCommand, triggerHaptic, setJoystickGlow)} onNavClick={handleNavClick} />
                    </div>
                </div>

                {btn.isEditMode && <div className="add-btn-fab" onClick={() => btn.createButton()}><Plus size={32} /></div>}

                {popoverState && (
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
                            {btn.buttons.filter(b => b.setId === popoverState!.setId).map(button => (
                                <div key={button.id} className="popover-item" onClick={(e) => {
                                    if (popoverState?.assignSourceId) {
                                        btn.setButtons(prev => prev.map(b => b.id === popoverState.assignSourceId ? { ...b, command: button.command, label: button.label, actionType: button.actionType || 'command' } : b));
                                        setPopoverState(null);
                                        addMessage('system', `Assigned '${button.label}' to button.`);
                                    } else {
                                        handleButtonClick(button, e, popoverState!.context);
                                    }
                                }}>{button.label}</div>
                            ))}
                            {btn.buttons.filter(b => b.setId === popoverState!.setId).length === 0 && <div className="popover-empty">No buttons in set '{popoverState.setId}'</div>}
                        </>
                    </div>
                )}

                {isSettingsOpen && (
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
                        resetButtons={(useUserDefault) => {
                            import('./constants/buttons').then(({ DEFAULT_BUTTONS }) => {
                                btn.setButtons(DEFAULT_BUTTONS);
                                addMessage('system', 'Buttons reset to core defaults.');
                            });
                        }}
                        hasUserDefaults={btn.hasUserDefaults}
                        status={status}
                        connect={connect}
                    />
                )}

                {btn.editingButtonId && (() => {
                    const editingButton = btn.buttons.find(b => b.id === btn.editingButtonId);
                    if (!editingButton) return null;
                    return (
                        <EditButtonModal
                            editingButton={editingButton}
                            setEditingButtonId={btn.setEditingButtonId}
                            deleteButton={btn.deleteButton}
                            setButtons={btn.setButtons}
                            availableSets={btn.availableSets}
                        />
                    );
                })()}



                {isSetManagerOpen && (
                    <SetManagerModal
                        buttons={btn.buttons}
                        availableSets={btn.availableSets}
                        onClose={() => setIsSetManagerOpen(false)}
                        onEditButton={(id) => { setIsSetManagerOpen(false); btn.setEditingButtonId(id); }}
                        onDeleteButton={btn.deleteButton}
                        onCreateButton={btn.createButton}
                        onSaveAsDefault={btn.saveAsDefault}
                        combatSet={btn.combatSet}
                        defaultSet={btn.defaultSet}
                        onSetCombatSet={btn.setCombatSet}
                        onSetDefaultSet={btn.setDefaultSet}
                    />
                )}
                {/* ── Mobile swipe zones & drawers — inside app-container so overflow:hidden clips them ── */}
                {viewMode === 'mobile' && (
                    <>
                        {/* BOTTOM swipe zone — swipe up from stat bar footer → inventory */}
                        <div
                            className="swipe-zone-bottom"
                            onTouchStart={(e) => {
                                (e.currentTarget as any)._sy = e.touches[0].clientY;
                            }}
                            onTouchEnd={(e) => {
                                const dy = e.changedTouches[0].clientY - (e.currentTarget as any)._sy;
                                if (dy < -50) openInventoryDrawer();
                            }}
                        />

                        {/* LEFT swipe zone — narrow sliver at left edge → character panel */}
                        <div
                            className="swipe-zone-left"
                            onTouchStart={(e) => {
                                (e.currentTarget as any)._sx = e.touches[0].clientX;
                            }}
                            onTouchEnd={(e) => {
                                const dx = e.changedTouches[0].clientX - (e.currentTarget as any)._sx;
                                if (dx > 50) openCharDrawer();
                            }}
                        />

                        {/* INVENTORY DRAWER */}
                        <GameDrawer
                            isOpen={invDrawerOpen}
                            onClose={() => setInvDrawerOpen(false)}
                            side="bottom"
                            title="Inventory"
                            icon={<Package size={18} />}
                            items={invItems}
                            isLoading={invLoading}
                        />

                        {/* CHARACTER DRAWER */}
                        <GameDrawer
                            isOpen={charDrawerOpen}
                            onClose={() => setCharDrawerOpen(false)}
                            side="left"
                            title="Character"
                            icon={<Swords size={18} />}
                            items={eqItems}
                            isLoading={charLoading}
                            topSection={statLines.length > 0 ? (
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        <ScrollText size={12} /> Statistics
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        {statLines.map((line, i) => (
                                            <div key={i} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, fontFamily: 'monospace' }}>{line}</div>
                                        ))}
                                    </div>
                                    {eqItems.length > 0 && (
                                        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            <Swords size={12} /> Equipment
                                        </div>
                                    )}
                                </div>
                            ) : undefined}
                        />
                    </>
                )}
            </div>

            <div className="viewport-switcher">
                <button
                    className={`viewport-btn ${viewMode === 'desktop' ? 'active' : ''}`}
                    onClick={() => setViewMode('desktop')}
                    title="Desktop View"
                >
                    <Monitor size={18} />
                </button>
                <button
                    className={`viewport-btn ${viewMode === 'mobile' ? 'active' : ''}`}
                    onClick={() => setViewMode('mobile')}
                    title="Mobile View"
                >
                    <Smartphone size={18} />
                </button>
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<MudClient />);

