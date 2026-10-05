/** @file commandDeckData.ts — Command deck tabs, actions, and icons. */

import React from 'react';
import {
    Backpack, Box, MessageSquare,
    Sword, HeartPulse, Footprints, Target, ScrollText,
    Eye, Tent, BedDouble, PackagePlus, PackageMinus, PackageOpen,
    Utensils, CupSoda, Shirt, Handshake, Cigarette,
    MessageSquareQuote, Smile, Info
} from 'lucide-react';
import type { DeckItem } from './useDeckTargeting';

export type TabKey = 'combat' | 'social' | 'utility' | 'room' | 'personal' | 'consume' | 'mounts';
type DeckAction = Omit<DeckItem, 'needsTarget'> & { needsTarget?: boolean };

export const isDeckActionAvailable = (item: Pick<DeckItem, 'requirement'>, race = '', subrace = ''): boolean => {
    const allowedAncestries = item.requirement?.raceOrSubrace;
    if (!allowedAncestries?.length) return true;
    const ancestry = `${race} ${subrace}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return allowedAncestries.some(value => ancestry.includes(value.toLowerCase()));
};

const HorseHeadIcon: React.FC<{ size?: number; strokeWidth?: number }> = ({ size = 17, strokeWidth = 2 }) =>
    React.createElement('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true
    },
    React.createElement('path', {
        d: 'M7.5 21c-1.3-3-1.8-6.2-1.1-9.4.9-4 3.3-6.8 6.2-8.1 1.1-.5 2.1-.7 3.1-.6-.3-1.1.1-2.1 1-3 .7.9 1.1 1.8 1.1 2.8 1 .4 1.8 1.1 2.4 2l-1.8 1.2c1.4 1.5 2.7 3.1 4 4.8 1.1 1.5.8 3.2-.5 4-1.1.6-2.1.2-2.7-.9-.8-1.4-2.1-2.2-4-2.6-1.3-.3-2.3-.8-3-1.7-.8 2.5-.3 5.1 1.5 7.4 1.2 1.6 2.1 3.2 2.7 5.1'
    }),
    React.createElement('path', {
        d: 'M13.2 3.4c-1.3-1.1-2.7-.8-3.8 0-1 .8-2 1.5-3.4 1.5.2.9.9 1.5 1.8 1.7-1.8.5-3.1 1.7-4 3.3.8.4 1.8.5 2.7.3-1.2 1.3-1.7 2.8-1.8 4.3l1.8-.1c-.5 2.1.3 3.9.5 5.5.1 1.2-.3 2.2-1.1 3 1.4.2 2.7-.2 3.5-1.2'
    }),
    React.createElement('circle', { cx: 16.7, cy: 7.6, r: 0.55, fill: 'currentColor', stroke: 'none' }));

// --- Data Section ---
export const DECK_ACTIONS: Record<TabKey, DeckAction[]> = {
    combat: [
        { label: 'Use', cmd: 'use ', targetKind: 'inventory' },
        { label: 'Smoke', cmd: 'smoke ', targetKind: 'inventory-and-worn' },
        { label: 'Quaff', cmd: 'quaff ', targetKind: 'inventory' },
        { label: 'Draw', cmd: 'draw ', targetKind: 'draw-targets' },
        { label: 'Sheath', cmd: 'sheath ', targetKind: 'worn-weapons' },
        { label: 'Throw', cmd: 'throw ', targetKind: 'throwables' },
        { label: 'Recite', cmd: 'recite ', targetKind: 'scrolls' },
        { label: 'Wield', cmd: 'wield ', targetKind: 'inventory-weapons' },
    ],
    social: [
        { label: 'Say', cmd: 'say ' }, { label: 'Narrate', cmd: 'narrate ' },
        { label: 'Gtell', cmd: 'gtell ' }, { label: 'Yell', cmd: 'yell ' },
        { label: 'Tell', cmd: 'tell ' }, { label: 'Whisper', cmd: 'whisper ' },
        { label: 'Emote', cmd: 'emote ' }, { label: 'Social', cmd: 'social', targetKind: 'social' },
    ],
    utility: [
        { label: 'Score', cmd: 'score' }, { label: 'Inventory', cmd: 'inventory' },
        { label: 'Equipment', cmd: 'equipment' }, { label: 'Gear', cmd: 'gear' },
        { label: 'Time', cmd: 'time' },
        { label: 'Weather', cmd: 'weather' }, { label: 'Info', cmd: 'info' },
        { label: 'Group', cmd: 'group', needsTarget: true, targetKind: 'group' },
        { label: 'Status', cmd: 'stat' },
        { label: 'Who', cmd: 'who' },
        { label: 'Practice', cmd: 'practice', needsTarget: true, targetKind: 'status-panel' },
    ],
    room: [
        { label: 'Camp', cmd: 'camp' },
        { label: 'Burn', cmd: 'burn' },
        { label: 'Fill', cmd: 'fill ', needsTarget: true, targetKind: 'lanterns' },
        { label: 'Light', cmd: 'light ', targetKind: 'room-objects' },
        { label: 'Snuff', cmd: 'snuff ', targetKind: 'room-objects' },
        { label: 'Cover', cmd: 'cover ', targetKind: 'room-objects' },
        { label: 'Uncover', cmd: 'uncover ', targetKind: 'room-objects' },
    ],
    personal: [
        { label: 'Get', cmd: 'get ', targetKind: 'room-object-container' },
        { label: 'Put', cmd: 'put ', targetKind: 'inventory-container' },
        { label: 'Drop', cmd: 'drop ', targetKind: 'inventory' },
        { label: 'Wear', cmd: 'wear ', targetKind: 'inventory' },
        { label: 'Remove', cmd: 'remove ', targetKind: 'worn' },
        { label: 'Give', cmd: 'give ', targetKind: 'inventory-recipient' },
        { label: 'Empty', cmd: 'empty' },
        { label: 'Buy', cmd: 'buy ', needsTarget: true, targetKind: 'shop' },
        { label: 'Sell', cmd: 'sell ', needsTarget: true, targetKind: 'inventory' },
        { label: 'Mend', cmd: 'mend ', needsTarget: true, targetKind: 'inventory' },
        { label: 'Value', cmd: 'value ', needsTarget: true, targetKind: 'inventory' },
    ],
    consume: [
        { label: 'Eat', cmd: 'eat ', targetKind: 'inventory' },
        { label: 'Drink', cmd: 'drink ', targetKind: 'inventory' },
        { label: 'Pour', cmd: 'pour ', needsTarget: true, targetKind: 'pour' },
        { label: 'Butcher', cmd: 'butcher ', targetKind: 'room-corpses' },
        { label: 'Cook', cmd: 'cook ', targetKind: 'inventory-meat' },
        { label: 'Mix', cmd: 'mix ', targetKind: 'worn-mixing-tools' },
        { label: 'Crush', cmd: 'crush' },
        { label: 'Forage', cmd: 'forage', requirement: { raceOrSubrace: ['beorning', 'bear'] } },
        { label: 'Drain', cmd: 'drain', requirement: { raceOrSubrace: ['orc', 'troll'] } },
    ],
    mounts: [
        { label: 'Ride', cmd: 'ride ', needsTarget: true, targetKind: 'mounts' },
        { label: 'Lead', cmd: 'lead ', needsTarget: true, targetKind: 'mounts' },
        { label: 'Saddle', cmd: 'saddle ', needsTarget: true, targetKind: 'mounts' },
        { label: 'Unsaddle', cmd: 'unsaddle ', needsTarget: true, targetKind: 'mounts' },
        { label: 'Abandon', cmd: 'abandon ', needsTarget: true, targetKind: 'mounts' },
        { label: 'Dismount', cmd: 'dismount ', needsTarget: true, targetKind: 'mounts' },
    ],
};

export const DECK_TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'combat', label: 'Special', icon: Box },
    { key: 'social', label: 'Social', icon: MessageSquare },
    { key: 'utility', label: 'Info', icon: Info },
    { key: 'consume', label: 'Consume', icon: Utensils },
    { key: 'mounts', label: 'Mounts', icon: HorseHeadIcon },
];

export const DECK_LABEL_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
    Gear: Backpack,
    Kill: Sword, Flee: Footprints, Consider: Target, Assist: HeartPulse,
    Watch: Eye, Camp: Tent, 'Camp Rent': BedDouble,
    Get: PackagePlus, Put: PackageOpen, Drop: PackageMinus, Eat: Utensils, Drink: CupSoda,
    Quaff: CupSoda, Taste: Utensils, Sip: CupSoda,
    Wear: Shirt, Wield: Sword, Remove: Shirt, Give: Handshake, Smoke: Cigarette,
    Whisper: MessageSquareQuote, Social: Smile,
    Info,
};

export const DEFAULT_DECK_ICON = ScrollText;
