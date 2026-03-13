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
        id: 'cat-corpse-examine',
        label: 'Examine',
        command: 'examine %n',
        setId: 'inline-corpses',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#3b82f6', shape: 'pill' },
        trigger: { enabled: false, pattern: '', isRegex: false, autoHide: false, duration: 0 }
    },
    {
        id: 'cat-corpse-gac',
        label: 'GAC',
        command: 'get all from %n',
        setId: 'inline-corpses',
        actionType: 'command',
        display: 'floating',
        isVisible: true,
        style: { x: 0, y: 0, w: 90, h: 40, backgroundColor: '#f59e0b', shape: 'pill' },
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
    {
        id: 'cat-default-examine',
        label: 'Examine',
        command: 'examine %n',
        setId: 'inline-default',
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
    }
];

export const CATEGORY_BUTTON_MAP: Record<string, string[]> = {
    'inline-lantern': ['cat-lantern-light', 'cat-lantern-snuff', 'cat-lantern-fill'],
    'inline-food': ['cat-food-eat', 'cat-food-get'],
    'inline-water': ['cat-water-drink'],
    'inline-corpses': ['cat-corpse-examine', 'cat-corpse-gac', 'cat-corpse-drag'],
    'inline-shopkeeper': ['cat-shopkeeper-mend', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-innkeeper': ['cat-innkeeper-offer', 'cat-innkeeper-rent', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-mounts': ['cat-mount-ride', 'cat-mount-lead', 'cat-mount-saddle', 'cat-mount-unsaddle', 'cat-mount-unsaddle-all', 'innpc-consider', 'innpc-kill', 'innpc-ex', 'cat-mount-abandon'],
    'inline-shopitem': ['cat-shopitem-buy', 'cat-shopitem-show'],
    'inline-guildmaster': ['cat-guildmaster-practice', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-default': ['cat-default-kill', 'cat-default-examine', 'innpc-consider']
};
