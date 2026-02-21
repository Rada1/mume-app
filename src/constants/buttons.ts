import { CustomButton } from '../types';

export const DEFAULT_BUTTONS: CustomButton[] = [
    // --- MAIN SET (Bottom Right Cluster) ---
    {
        id: 'btn-look',
        label: 'Look',
        command: 'look',
        setId: 'main',
        actionType: 'command',
        display: 'floating',
        style: { x: 85, y: 70, w: 80, h: 40, backgroundColor: 'rgba(59, 130, 246, 0.4)', transparent: true, shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },
    {
        id: 'btn-inv',
        label: 'Inv',
        command: 'inventory',
        setId: 'main',
        actionType: 'command',
        display: 'floating',
        style: { x: 75, y: 70, w: 80, h: 40, backgroundColor: 'rgba(139, 92, 246, 0.4)', transparent: true, shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },
    {
        id: 'btn-score',
        label: 'Score',
        command: 'score',
        setId: 'main',
        actionType: 'command',
        display: 'floating',
        style: { x: 65, y: 70, w: 80, h: 40, backgroundColor: 'rgba(245, 158, 11, 0.4)', transparent: true, shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },

    // --- INFO SET ---
    {
        id: 'btn-who',
        label: 'Who',
        command: 'who',
        setId: 'info',
        actionType: 'command',
        display: 'floating',
        style: { x: 85, y: 75, w: 80, h: 40, backgroundColor: 'rgba(6, 182, 212, 0.4)', transparent: true, shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },
    {
        id: 'btn-where',
        label: 'Where',
        command: 'where',
        setId: 'info',
        actionType: 'command',
        display: 'floating',
        style: { x: 75, y: 75, w: 80, h: 40, backgroundColor: 'rgba(6, 182, 212, 0.4)', transparent: true, shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },

    // --- DYNAMIC HIGHLIGHTS (In-line) ---
    {
        id: 'hl-corpse',
        label: 'Loot',
        command: 'get all from corpse',
        setId: 'main',
        actionType: 'command',
        display: 'inline',
        style: { x: 0, y: 0, w: 0, h: 0, backgroundColor: 'rgba(239, 68, 68, 0.6)', transparent: true, shape: 'rect' },
        trigger: { enabled: true, pattern: 'corpse', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },
    {
        id: 'hl-door',
        label: 'Open',
        command: 'open door',
        setId: 'main',
        actionType: 'command',
        display: 'inline',
        style: { x: 0, y: 0, w: 0, h: 0, backgroundColor: 'rgba(16, 185, 129, 0.6)', transparent: true, shape: 'rect' },
        trigger: { enabled: true, pattern: 'door', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },

    // --- NAVIGATION BUTTONS (Switcher) ---
    {
        id: 'nav-combat',
        label: 'COMBAT',
        command: 'combat',
        setId: 'main',
        actionType: 'nav',
        display: 'floating',
        style: { x: 92, y: 70, w: 40, h: 40, backgroundColor: 'rgba(239, 68, 68, 0.5)', transparent: true, shape: 'circle' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },
    {
        id: 'btn-menu-assign',
        label: 'SET',
        command: 'main',
        setId: 'main',
        actionType: 'nav',
        longActionType: 'assign',
        longCommand: 'setmanager', // This is a special ID to list all sets
        display: 'floating',
        style: { x: 92, y: 64, w: 40, h: 40, backgroundColor: 'rgba(99, 102, 241, 0.5)', transparent: true, shape: 'circle' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },
    {
        id: 'nav-main',
        label: 'BACK',
        command: 'main',
        setId: 'combat',
        actionType: 'nav',
        display: 'floating',
        style: { x: 92, y: 70, w: 40, h: 40, backgroundColor: 'rgba(59, 130, 246, 0.5)', transparent: true, shape: 'circle' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 },
        isVisible: true
    },

    // --- THIEF SKILL LIST ---
    { id: 'thief-backstab', label: 'Backstab', command: 'backstab', setId: 'thiefskilllist', actionType: 'command', display: 'floating', style: { x: 85, y: 60, w: 80, h: 40, backgroundColor: 'rgba(55, 65, 81, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'thief-escape', label: 'Escape', command: 'escape', setId: 'thiefskilllist', actionType: 'command', display: 'floating', style: { x: 75, y: 60, w: 80, h: 40, backgroundColor: 'rgba(55, 65, 81, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'thief-hide', label: 'Hide', command: 'hide', setId: 'thiefskilllist', actionType: 'command', display: 'floating', style: { x: 65, y: 60, w: 80, h: 40, backgroundColor: 'rgba(55, 65, 81, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'thief-missile', label: 'Missile', command: 'shoot', setId: 'thiefskilllist', actionType: 'command', display: 'floating', style: { x: 55, y: 60, w: 80, h: 40, backgroundColor: 'rgba(55, 65, 81, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'thief-pick', label: 'Pick', command: 'pick', setId: 'thiefskilllist', actionType: 'command', display: 'floating', style: { x: 85, y: 65, w: 80, h: 40, backgroundColor: 'rgba(55, 65, 81, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'thief-search', label: 'Search', command: 'search', setId: 'thiefskilllist', actionType: 'command', display: 'floating', style: { x: 75, y: 65, w: 80, h: 40, backgroundColor: 'rgba(55, 65, 81, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'thief-sneak', label: 'Sneak', command: 'sneak', setId: 'thiefskilllist', actionType: 'command', display: 'floating', style: { x: 65, y: 65, w: 80, h: 40, backgroundColor: 'rgba(55, 65, 81, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'thief-steal', label: 'Steal', command: 'steal', setId: 'thiefskilllist', actionType: 'command', display: 'floating', style: { x: 55, y: 65, w: 80, h: 40, backgroundColor: 'rgba(55, 65, 81, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },

    // --- WARRIOR SKILL LIST ---
    { id: 'war-bash', label: 'Bash', command: 'bash', setId: 'warriorskilllist', actionType: 'command', display: 'floating', style: { x: 85, y: 60, w: 80, h: 40, backgroundColor: 'rgba(185, 28, 28, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'war-rescue', label: 'Rescue', command: 'rescue', setId: 'warriorskilllist', actionType: 'command', display: 'floating', style: { x: 75, y: 60, w: 80, h: 40, backgroundColor: 'rgba(185, 28, 28, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'war-kick', label: 'Kick', command: 'kick', setId: 'warriorskilllist', actionType: 'command', display: 'floating', style: { x: 65, y: 60, w: 80, h: 40, backgroundColor: 'rgba(185, 28, 28, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },

    // --- RANGER SKILL LIST ---
    { id: 'rng-bandage', label: 'Bandage', command: 'bandage', setId: 'rangerskilllist', actionType: 'command', display: 'floating', style: { x: 85, y: 60, w: 80, h: 40, backgroundColor: 'rgba(21, 128, 61, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'rng-ride', label: 'Ride', command: 'ride', setId: 'rangerskilllist', actionType: 'command', display: 'floating', style: { x: 75, y: 60, w: 80, h: 40, backgroundColor: 'rgba(21, 128, 61, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true },
    { id: 'rng-track', label: 'Track', command: 'track', setId: 'rangerskilllist', actionType: 'command', display: 'floating', style: { x: 65, y: 60, w: 80, h: 40, backgroundColor: 'rgba(21, 128, 61, 0.5)', transparent: true, shape: 'pill' }, trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }, isVisible: true }
];
