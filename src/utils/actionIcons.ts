/**
 * @file actionIcons.ts
 * @description Maps a MUME command (or button label) to a lucide icon, so
 * dynamically generated action buttons (e.g. the room card's Watch/Camp strip)
 * can carry icons like the fixed CommandDeck ability bar. Keyed on the command's
 * leading verb, with a label fallback and a neutral default.
 */

import type React from 'react';
import {
    Eye, Tent, FlameKindling, Moon, Sunrise, Armchair, PersonStanding, Search,
    BookOpen, LogIn, LogOut, Mountain, Waves, Ear, Hand, Sparkles, ShoppingCart,
    Coins, Utensils, DoorOpen, DoorClosed, ScrollText, Swords, Play, Flag, MapPin,
    Droplets
} from 'lucide-react';

export type ActionIcon = React.ComponentType<{ size?: number; strokeWidth?: number }>;

// Full-command overrides, matched before the verb map so commands that share a
// verb can differ (e.g. `camp` pitches a campfire, `camp rent` pitches a tent).
const COMMAND_ICONS: Record<string, ActionIcon> = {
    'camp rent': Tent
};

// Keyed by the command's first word (the verb). Short MUME aliases included.
const VERB_ICONS: Record<string, ActionIcon> = {
    watch: Eye, look: Eye, examine: Eye, exa: Eye, glance: Eye,
    read: BookOpen,
    camp: FlameKindling,
    rest: Armchair, sit: Armchair,
    sleep: Moon,
    wake: Sunrise,
    stand: PersonStanding,
    search: Search,
    enter: LogIn, board: LogIn,
    leave: LogOut, exit: LogOut, disembark: LogOut,
    climb: Mountain,
    swim: Waves, dive: Waves,
    listen: Ear,
    knock: Hand, push: Hand, pull: Hand, touch: Hand,
    pray: Sparkles, worship: Sparkles,
    buy: ShoppingCart, order: ShoppingCart,
    list: ScrollText,
    sell: Coins, value: Coins,
    eat: Utensils, taste: Utensils,
    drink: Droplets,
    open: DoorOpen, unlock: DoorOpen,
    close: DoorClosed, lock: DoorClosed,
    kill: Swords, attack: Swords, consider: Swords,
    recall: MapPin, where: MapPin,
    quest: Flag
};

/**
 * Resolve a lucide icon for an action button. Prefers the command verb, then the
 * label, then a neutral "execute" default so every button still shows an icon.
 */
export const resolveActionIcon = (command: string, label?: string): ActionIcon => {
    const normalized = (command || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (COMMAND_ICONS[normalized]) return COMMAND_ICONS[normalized];
    const verb = normalized.split(' ')[0];
    if (verb && VERB_ICONS[verb]) return VERB_ICONS[verb];
    const labelKey = (label || '').trim().toLowerCase();
    return VERB_ICONS[labelKey] || Play;
};
