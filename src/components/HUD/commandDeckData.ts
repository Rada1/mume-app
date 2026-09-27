/** @file commandDeckData.ts — Command deck tabs, actions, and icons. */

import React from 'react';
import {
    Swords, MessageSquare, Wrench, Home, UserRound,
    Sword, HeartPulse, Footprints, Target, ScrollText,
    Eye, Tent, BedDouble, PackagePlus, PackageMinus, PackageOpen,
    Utensils, CupSoda, Shirt, Handshake, Cigarette,
    MessageSquareQuote, Smile, Info
} from 'lucide-react';
import type { DeckItem } from './useDeckTargeting';

export type TabKey = 'combat' | 'social' | 'utility' | 'room' | 'personal' | 'consume';
type DeckAction = Omit<DeckItem, 'needsTarget'> & { needsTarget?: boolean };

// --- Data Section ---
export const DECK_ACTIONS: Record<TabKey, DeckAction[]> = {
    combat: [
        { label: 'Kill', cmd: 'kill ' }, { label: 'Flee', cmd: 'flee' },
        { label: 'Consider', cmd: 'consider ' },
        { label: 'Assist', cmd: 'assist ', needsTarget: false, holdOpensMenuOnly: true },
    ],
    social: [
        { label: 'Say', cmd: 'say ' }, { label: 'Narrate', cmd: 'narrate ' },
        { label: 'Gtell', cmd: 'gtell ' }, { label: 'Yell', cmd: 'yell ' },
        { label: 'Tell', cmd: 'tell ' }, { label: 'Whisper', cmd: 'whisper ' },
        { label: 'Emote', cmd: 'emote ' }, { label: 'Social', cmd: 'social', targetKind: 'social' },
    ],
    utility: [
        { label: 'Score', cmd: 'score' }, { label: 'Inventory', cmd: 'inventory' },
        { label: 'Equipment', cmd: 'equipment' }, { label: 'Time', cmd: 'time' },
        { label: 'Weather', cmd: 'weather' }, { label: 'Info', cmd: 'info' },
        { label: 'Group', cmd: 'group' },
        { label: 'Who', cmd: 'who' },
    ],
    room: [
        { label: 'Watch', cmd: 'watch' }, { label: 'Camp', cmd: 'camp' },
        { label: 'Camp Rent', cmd: 'camp rent' },
        { label: 'Crush', cmd: 'crush' }, { label: 'Drain', cmd: 'drain' },
        { label: 'Empty', cmd: 'empty' }, { label: 'Cook', cmd: 'cook' },
        { label: 'Boil', cmd: 'boil' }, { label: 'Butcher', cmd: 'butcher' },
        { label: 'Cut', cmd: 'cut' },
    ],
    personal: [
        { label: 'Get', cmd: 'get ', targetKind: 'room-object-container' },
        { label: 'Put', cmd: 'put ', targetKind: 'inventory-container' },
        { label: 'Drop', cmd: 'drop ', targetKind: 'inventory' },
        { label: 'Wear', cmd: 'wear ', targetKind: 'inventory' },
        { label: 'Remove', cmd: 'remove ', targetKind: 'worn' },
        { label: 'Draw', cmd: 'draw ', targetKind: 'worn-sheaths' },
        { label: 'Sheath', cmd: 'sheath ', targetKind: 'worn-weapons' },
        { label: 'Use', cmd: 'use ', targetKind: 'inventory-and-worn' },
        { label: 'Give', cmd: 'give ', targetKind: 'inventory-recipient' },
    ],
    consume: [
        { label: 'Eat', cmd: 'eat ', targetKind: 'inventory' },
        { label: 'Drink', cmd: 'drink ', targetKind: 'inventory' },
        { label: 'Smoke', cmd: 'smoke ', targetKind: 'inventory' },
        { label: 'Quaff', cmd: 'quaff ', targetKind: 'inventory' },
        { label: 'Taste', cmd: 'taste ', targetKind: 'inventory' },
        { label: 'Sip', cmd: 'sip ', targetKind: 'inventory' },
    ],
};

export const DECK_TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'combat', label: 'Combat', icon: Swords },
    { key: 'social', label: 'Social', icon: MessageSquare },
    { key: 'utility', label: 'Utility', icon: Wrench },
    { key: 'room', label: 'Room', icon: Home },
    { key: 'personal', label: 'Personal', icon: UserRound },
    { key: 'consume', label: 'Consume', icon: CupSoda },
];

export const DECK_LABEL_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
    Kill: Sword, Flee: Footprints, Consider: Target, Assist: HeartPulse,
    Watch: Eye, Camp: Tent, 'Camp Rent': BedDouble,
    Get: PackagePlus, Put: PackageOpen, Drop: PackageMinus, Eat: Utensils, Drink: CupSoda,
    Quaff: CupSoda, Taste: Utensils, Sip: CupSoda,
    Wear: Shirt, Remove: Shirt, Give: Handshake, Smoke: Cigarette,
    Whisper: MessageSquareQuote, Social: Smile,
    Info,
};

export const DEFAULT_DECK_ICON = ScrollText;
