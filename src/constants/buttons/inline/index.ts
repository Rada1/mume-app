import { CustomButton } from '../../../types';
import { WORLD_BUTTONS } from './world';
import { ITEM_BUTTONS } from './items';
import { NPC_BUTTONS } from './npcs';

/**
 * @file index.ts
 * @description Aggregates all inline category buttons.
 */

export const INLINE_CATEGORY_BUTTONS: CustomButton[] = [
    ...WORLD_BUTTONS,
    ...ITEM_BUTTONS,
    ...NPC_BUTTONS
];

export const CATEGORY_BUTTON_MAP: Record<string, string[]> = {
    'inline-lantern': ['cat-lantern-light', 'cat-lantern-snuff', 'cat-lantern-fill'],
    'inline-lightsource': ['cat-lightsource-cover', 'cat-lightsource-uncover'],
    'inline-food': ['cat-food-eat'],
    'inline-water': ['cat-water-drink'],
    'inline-fluidcontainer': ['cat-fluid-drink', 'cat-fluid-pour', 'cat-fluid-empty', 'cat-fluid-look-in'],
    'inline-corpses': ['cat-corpse-butcher', 'cat-corpse-drag', 'cat-corpse-scalp'],
    'inline-containers': ['cat-container-look-in', 'cat-container-open', 'cat-container-close'],
    'inline-innkeeper': ['cat-innkeeper-offer', 'cat-innkeeper-rent', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-shopkeeper': ['cat-shopkeeper-shop', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-shopkeeper-drop': ['cat-shopkeeper-sell-drag', 'cat-shopkeeper-mend-drag'],
    'inlinenpc': ['innpc-group', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-mounts': ['cat-mount-group', 'cat-mount-ride', 'cat-mount-lead', 'cat-mount-saddle', 'cat-mount-unsaddle', 'cat-mount-unsaddle-all', 'innpc-consider', 'innpc-kill', 'innpc-ex', 'cat-mount-abandon'],
    'inline-shopitem': ['cat-shopitem-buy', 'cat-shopitem-show'],
    'inline-guildmaster': ['cat-guildmaster-practice', 'innpc-consider', 'innpc-kill', 'innpc-ex'],
    'inline-weapon': ['cat-weapon-wield', 'cat-obj-char-sell', 'cat-obj-char-value', 'cat-obj-char-mend'],
    'inline-armour': ['cat-armour-mend', 'cat-obj-char-sell', 'cat-obj-char-value'],
    'inline-shield': [],
    'inline-default': ['cat-default-kill', 'innpc-consider'],
    'inline-object': ['cat-obj-examine'],
    'inline-obj-room': ['cat-obj-room-get'],
    'inline-obj-char': ['cat-obj-char-drop', 'cat-obj-char-wear', 'cat-obj-char-wield', 'cat-obj-char-sell', 'cat-obj-char-value', 'cat-obj-char-give', 'cat-obj-char-put'],
    'inline-obj-worn': ['cat-obj-worn-remove', 'cat-obj-worn-examine'],
    'inline-obj-shop': ['cat-shopitem-buy', 'cat-shopitem-show'],
    'inline-exit': ['cat-exit-go', 'cat-exit-look']
};
