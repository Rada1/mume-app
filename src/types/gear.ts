/** @file gear.ts — Gear rows, scoped selection, and gear component contracts. */

import type { ReactNode } from 'react';
import type { DrawerLine } from './game';

// --- Gear Model ---
export interface GearRow {
    line: DrawerLine;
    slot: string;
    slotLabel: string;
    article: string;
    name: string;
    condition: string;
    noun: string;
    isContainer: boolean;
}

export interface GearRecipient {
    id: string;
    label: string;
    noun: string;
    kind: 'player' | 'npc';
}

export type GearPanelSection = 'worn' | 'carried' | 'room';
export type GearSelectionAction = 'get' | 'put' | 'wear' | 'remove' | 'drop';

export interface GearSelectionItem {
    id: string;
    row: GearRow;
    section: GearPanelSection;
    parentNoun?: string;
    parentId?: string;
}

export interface GearSelection {
    scopeKey: string;
    section: GearPanelSection;
    parentNoun?: string;
    items: GearSelectionItem[];
    sourceLevelItemIds: string[];
}

export interface GearSelectionCheckboxProps {
    checked: boolean;
    mixed?: boolean;
    disabled?: boolean;
    label: string;
    visibleLabel?: string;
    size?: 'normal' | 'large';
    onChange: () => void;
}

export interface GearSelectionActionsProps {
    selection: GearSelection;
    containers: GearRow[];
    onRun: (action: GearSelectionAction, destinationNoun?: string) => void;
    onClear: () => void;
}

export interface GearContainerContentsProps {
    container: GearRow;
    keyPrefix: string;
    section: GearPanelSection;
    contents: DrawerLine[];
    loaded: boolean;
    isScopeLocked: boolean;
    getScopeCount: (items: GearSelectionItem[]) => number;
    onSelectAll: (items: GearSelectionItem[]) => void;
    renderChild: (item: GearSelectionItem, levelItems: GearSelectionItem[]) => ReactNode;
}
