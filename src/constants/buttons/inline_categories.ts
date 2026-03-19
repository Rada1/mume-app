import { CustomButton } from '../../types';

/**
 * Specialized buttons for categorized inline entities.
 * These buttons are used when an item/NPC is identified as belonging to a specific category.
 */
export const INLINE_CATEGORY_BUTTONS: CustomButton[] = [
    // --- LANTERN ---
    {
        id: 'cat-lantern-light',
        label: 'Light',
        command: 'light %n',
        setId: 'inline-lantern',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#facc15', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-lantern-snuff',
        label: 'Snuff',
        command: 'snuff %n',
        setId: 'inline-lantern',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#94a3b8', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-lantern-fill',
        label: 'Fill',
        command: 'fill %n',
        setId: 'inline-lantern',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-lightsource-cover',
        label: 'Cover',
        command: 'cover %n',
        setId: 'inline-lightsource',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#475569', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-lightsource-uncover',
        label: 'Uncover',
        command: 'uncover %n',
        setId: 'inline-lightsource',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#facc15', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- FOOD & WATER ---
    {
        id: 'cat-food-eat',
        label: 'Eat',
        command: 'eat %n',
        setId: 'inline-food',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#4ade80', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-food-get',
        label: 'Get',
        command: 'get %n',
        setId: 'inline-food',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#f59e0b', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-water-drink',
        label: 'Drink',
        command: 'drink %n',
        setId: 'inline-water',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- CORPSES ---
    {
        id: 'cat-corpse-drag',
        label: 'Drag',
        command: 'drag %n',
        setId: 'inline-corpses',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#94a3b8', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-corpse-butcher',
        label: 'Butcher',
        command: 'butcher %n',
        setId: 'inline-corpses',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#dc2626', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-corpse-scalp',
        label: 'Scalp',
        command: 'scalp %n',
        setId: 'inline-corpses',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#991b1b', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-container-open',
        label: 'Open',
        command: 'open %n',
        setId: 'inline-containers',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-container-close',
        label: 'Close',
        command: 'close %n',
        setId: 'inline-containers',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#4b5563', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-container-get-all',
        label: 'G/All',
        command: 'get all from %n',
        setId: 'inline-hidden',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#f59e0b', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-container-look-in',
        label: 'Look In',
        command: 'look in %n',
        setId: 'inline-containers',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- INNKEEPERS ---
    {
        id: 'cat-innkeeper-offer',
        label: 'Offer',
        command: 'offer %n',
        setId: 'inline-innkeeper',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#ec4899', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-innkeeper-rent',
        label: 'Rent',
        command: 'rent',
        setId: 'inline-innkeeper',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#8b5cf6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- MOUNTS ---
    {
        id: 'cat-mount-ride',
        label: 'Ride',
        command: 'ride %n',
        setId: 'inline-mounts',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#78350f', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-mount-lead',
        label: 'Lead',
        command: 'lead %n',
        setId: 'inline-mounts',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#92400e', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-mount-unsaddle-all',
        label: 'Unsaddle All',
        command: 'unsaddle %n all',
        setId: 'inline-mounts',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 110, h: 40, backgroundColor: '#451a03', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-mount-unsaddle',
        label: 'Unsaddle',
        command: 'unsaddle %n',
        setId: 'inline-mounts',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#451a03', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-mount-abandon',
        label: 'Abandon',
        command: 'abandon %n',
        setId: 'inline-mounts',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#ef4444', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-mount-saddle',
        label: 'Saddle',
        command: 'saddle %n',
        setId: 'inline-mounts',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#78350f', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- GUILDMASTER ---
    {
        id: 'cat-guildmaster-practice',
        label: 'Practice Skills',
        command: 'practice',
        setId: 'inline-guildmaster',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 120, h: 40, backgroundColor: '#a855f7', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    {
        id: 'cat-obj-room-get',
        label: 'Get',
        command: 'get %n',
        setId: 'inline-obj-room',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#f59e0b', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-obj-room-examine',
        label: 'Examine',
        command: 'examine %n',
        setId: 'inline-obj-room',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 100, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-obj-room-wield',
        label: 'Wield',
        command: 'get %n; wield %n',
        setId: 'inline-obj-room',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#6366f1', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-obj-room-wear',
        label: 'Wear',
        command: 'get %n; wear %n',
        setId: 'inline-obj-room',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#64748b', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-obj-examine',
        label: 'Examine',
        command: 'examine %n',
        setId: 'inline-object',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 100, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- SHOP ITEMS ---
    {
        id: 'cat-shopitem-buy',
        label: 'Buy',
        command: 'buy %n',
        setId: 'inline-shopitem',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#8b5cf6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-shopitem-show',
        label: 'Show',
        command: 'show %n',
        setId: 'inline-shopitem',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-shopkeeper-mend',
        label: 'Mend',
        command: 'shop-mend',
        setId: 'inline-shopkeeper',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#8b5cf6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- WEAPON ---
    {
        id: 'cat-weapon-wield',
        label: 'Wield',
        command: 'wield %n',
        setId: 'inline-weapon',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#6366f1', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- DEFAULT ---
    {
        id: 'cat-default-kill',
        label: 'Kill',
        command: 'kill %n',
        setId: 'inline-default',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#ef4444', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- COLOR-TAGGED OBJECT: INVENTORY (in character's possession) ---
    {
        id: 'cat-obj-char-drop',
        label: 'Drop',
        command: 'drop %n',
        setId: 'inline-obj-char',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#ef4444', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-obj-char-wear',
        label: 'Wear',
        command: 'wear %n',
        setId: 'inline-obj-char',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#64748b', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-obj-char-wield',
        label: 'Wield',
        command: 'wield %n',
        setId: 'inline-obj-char',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#6366f1', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-obj-char-examine',
        label: 'Examine',
        command: 'examine %n',
        setId: 'inline-obj-char',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 100, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- COLOR-TAGGED OBJECT: WORN (equipped) ---
    {
        id: 'cat-obj-worn-remove',
        label: 'Remove',
        command: 'remove %n',
        setId: 'inline-obj-worn',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 100, h: 40, backgroundColor: '#94a3b8', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-obj-worn-examine',
        label: 'Examine',
        command: 'examine %n',
        setId: 'inline-obj-worn',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 100, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },

    // --- DEFAULT ---
    {
        id: 'cat-armour-mend',
        label: 'Mend',
        command: 'remove %n; mend %n',
        setId: 'inline-armour',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#8b5cf6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    
    // --- EXITS ---
    {
        id: 'cat-exit-go',
        label: 'Go',
        command: '%n',
        setId: 'inline-exit',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: 'rgba(255, 255, 255, 0.25)', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-exit-look',
        label: 'Look',
        command: 'look %n',
        setId: 'inline-exit',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
];

export const CATEGORY_BUTTON_MAP: Record<string, string[]> = {
    'inline-lantern': ['cat-lantern-light', 'cat-lantern-snuff', 'cat-lantern-fill'],
    'inline-lightsource': ['cat-lightsource-cover', 'cat-lightsource-uncover'],
    'inline-food': ['cat-food-eat'],
    'inline-water': ['cat-water-drink'],
    'inline-corpses': ['cat-corpse-butcher', 'cat-corpse-drag', 'cat-corpse-scalp'],
    'inline-containers': ['cat-container-look-in', 'cat-container-open', 'cat-container-close'],
    'inline-shopkeeper': ['cat-shopkeeper-mend', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-innkeeper': ['cat-innkeeper-offer', 'cat-innkeeper-rent', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-mounts': ['cat-mount-ride', 'cat-mount-lead', 'cat-mount-saddle', 'cat-mount-unsaddle', 'cat-mount-unsaddle-all', 'innpc-consider', 'innpc-kill', 'innpc-ex', 'cat-mount-abandon'],
    'inline-shopitem': ['cat-shopitem-buy', 'cat-shopitem-show'],
    'inline-guildmaster': ['cat-guildmaster-practice', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-weapon': ['cat-weapon-wield'],
    'inline-armour': ['cat-armour-mend'],
    'inline-shield': [],
    'inline-default': ['cat-default-kill', 'innpc-consider'],
    'inline-object': ['cat-obj-examine'],
    'inline-obj-room': ['cat-obj-room-get', 'cat-obj-room-examine', 'cat-obj-room-wield', 'cat-obj-room-wear'],
    'inline-obj-char': ['cat-obj-char-drop', 'cat-obj-char-wear', 'cat-obj-char-wield', 'cat-obj-char-examine'],
    'inline-obj-worn': ['cat-obj-worn-remove', 'cat-obj-worn-examine'],
    'inline-obj-shop': ['cat-shopitem-buy', 'cat-shopitem-show'],
    'inline-exit': ['cat-exit-go', 'cat-exit-look']
};
