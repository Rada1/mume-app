import { CustomButton, ButtonSetSettings } from '../../types';
import { TACTICAL_BUTTONS } from './tactical';
import { COMMUNICATION_BUTTONS } from './communication';
import { INLINE_CATEGORY_BUTTONS } from './inline';
import { INVENTORY_BUTTONS } from './inventory';
import { SOCIAL_BUTTONS } from './socials';
import { DOOR_BUTTONS } from './doors';
import { META_BUTTONS } from './meta';

export const ALL_BUTTONS: CustomButton[] = [
    ...TACTICAL_BUTTONS,
    ...INVENTORY_BUTTONS,
    ...COMMUNICATION_BUTTONS,
    ...SOCIAL_BUTTONS,
    ...DOOR_BUTTONS,
    ...INLINE_CATEGORY_BUTTONS,
    ...META_BUTTONS
];

// Compatibility aliases
export const DEFAULT_BUTTONS = ALL_BUTTONS;
export const DEFAULT_UI_POSITIONS = {};

export const DEFAULT_SET_SETTINGS: Record<string, ButtonSetSettings> = {
    warrior: { activeSet: 'warrior', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#ef4444' },
    warriorskilllist: { activeSet: 'warriorskilllist', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#ef4444' },
    ranger: { activeSet: 'ranger', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#22c55e' },
    rangerskilllist: { activeSet: 'rangerskilllist', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#22c55e' },
    cleric: { activeSet: 'cleric', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#fbbf24' },
    clericspelllist: { activeSet: 'clericspelllist', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#fbbf24' },
    mage: { activeSet: 'mage', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#3b82f6' },
    magespelllist: { activeSet: 'magespelllist', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#3b82f6' },
    thief: { activeSet: 'thief', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#94a3b8' },
    thiefskilllist: { activeSet: 'thiefskilllist', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#94a3b8' },
    doors: { activeSet: 'doors', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#06b6d4' },
    'social list': { activeSet: 'social list', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#06b6d4' },
    'inline-default': { activeSet: 'inline-default', isEditMode: false, isGridEnabled: false, gridSize: 10, editingButtonId: null, selectedButtonIds: new Set(), themeColor: '#facc15' }
};
