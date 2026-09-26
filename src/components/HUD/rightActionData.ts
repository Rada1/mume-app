/**
 * @file rightActionData.ts
 * @description Action item definitions and catalogs for the desktop right-side action panel.
 */

import React from 'react';
import {
    Sword, Footprints, Target, HeartPulse, Shield,
    BookOpen, Users, Clock, Cloud
} from 'lucide-react';
import type { PracticeClassKey } from '../../utils/practiceClassCatalog';

export type MainTab = 'combat' | 'skills' | 'utility';

export interface ActionItem {
    label: string;
    cmd: string;
    needsTarget: boolean;
    icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    isDanger?: boolean;
    targetKind?: 'characters' | 'allies' | 'objects';
}

export const COMBAT_ACTIONS: ActionItem[] = [
    { label: 'Kill', cmd: 'kill ', needsTarget: true, targetKind: 'characters', icon: Sword },
    { label: 'Flee', cmd: 'flee', needsTarget: false, icon: Footprints, isDanger: true },
    { label: 'Consider', cmd: 'consider ', needsTarget: true, targetKind: 'characters', icon: Target },
    { label: 'Assist', cmd: 'assist ', needsTarget: true, targetKind: 'allies', icon: HeartPulse }
];

export const UTILITY_ACTIONS: ActionItem[] = [
    { label: 'Score', cmd: 'score', needsTarget: false, icon: BookOpen },
    { label: 'Who', cmd: 'who', needsTarget: false, icon: Users },
    { label: 'Time', cmd: 'time', needsTarget: false, icon: Clock },
    { label: 'Weather', cmd: 'weather', needsTarget: false, icon: Cloud },
    { label: 'Inv', cmd: 'inventory', needsTarget: false, icon: BookOpen },
    { label: 'Eq', cmd: 'equipment', needsTarget: false, icon: Shield },
    { label: 'Group', cmd: 'group', needsTarget: false, icon: Users },
    { label: 'Get', cmd: 'get ', needsTarget: true, targetKind: 'objects', icon: BookOpen }
];

export const CLASS_KEYS: PracticeClassKey[] = ['ranger', 'warrior', 'thief', 'mage', 'cleric'];
