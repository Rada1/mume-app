/**
 * @file ui.ts
 * @description UI components, buttons, and interaction types.
 */

import { SwipeDirection } from './game';
import { EntityKind, EntityLocation } from './entities';

export type UiMode = 'auto' | 'desktop' | 'portrait' | 'landscape';
export type TriggerAction = 'spit' | 'hide' | 'show' | 'command';
export type ActionType = 'command' | 'menu' | 'nav' | 'select-assign' | 'select-recipient' | 'select-container' | 'assign' | 'teleport-manage' | 'historical' | 'preload' | 'show';

export interface UiPosition {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    scale?: number;
}

export interface BranchingEdgeGlowControls {
    spreadSpeed: number;
    branchingFactor: number;
    persistenceMs: number;
}

export interface BranchingEdgeGlowProps {
    imageUrl: string | null;
    controls?: Partial<BranchingEdgeGlowControls>;
}

export type UiPositions = Record<string, UiPosition>;

export interface PopoverState {
    x: number;
    y: number;
    sourceHeight?: number;
    type?: 'menu' | 'teleport-select' | 'teleport-save' | 'teleport-manage' | 'give-recipient-select' | 'give-target-select' | 'put-container-select' | 'shop-search' | 'practice' | 'select-parley-command' | 'select-parley-target' | 'container' | 'shop-card' | 'session-log' | 'help-card';
    setId: string; // The legacy command or set ID. Can still hold standard menu set IDs.
    kind?: EntityKind; 
    location?: EntityLocation; 
    category?: string;
    context?: string; // Optional context like "Orc" or "Iron Sword"
    entityId?: string; // Unique registry ID
    parentNoun?: string; // For things like "Orc corpse"
    accentColor?: string;
    executeAndAssign?: boolean;
    assignSourceId?: string;
    assignSwipeDir?: SwipeDirection;
    direction?: string;
    anchorId?: string;
    menuDisplay?: 'list' | 'dial';
    isChoosingCategory?: boolean;
    containerItems?: any[];
    // Gesture/Pointer support
    initialPointerX?: number;
    initialPointerY?: number;
    // Special data for cards
    shopItems?: any[];
    helpData?: any;
    teleportId?: string;
    spellCommand?: string;
}

export interface ButtonSetSettings {
    activeSet: string;
    isEditMode: boolean;
    isGridEnabled: boolean;
    gridSize: number;
    editingButtonId: string | null;
    selectedButtonIds: Set<string>;
    themeColor?: string;
}

export interface CustomButton {
    id: string;
    setId: string; // "nav", "combat", "misc", or category ID like "object-weapon"
    label: string;
    command: string;
    actionType?: ActionType;
    icon?: string;
    display?: 'standard' | 'floating' | 'hidden' | 'inline'; // Restore 'inline' for legacy compat
    hideIfUnknown?: boolean;
    isDimmed?: boolean;
    _skipJoystick?: boolean; // Internal flag for gestures
    
    // Requirements for smart population
    requirement?: {
        ability?: string;
        minProficiency?: number;
        characterClass?: string[];
    };
    
    style: {
        backgroundColor?: string;
        borderColor?: string;
        color?: string;
        icon?: string;
        borderWidth?: number;
        borderRadius?: number;
        shape?: 'rect' | 'circle' | 'pill' | 'diamond';
        iconScale?: number;
        iconOpacity?: number;
        fontSize?: number;
        curvedText?: boolean;
        x?: number; // Legacy position in style
        y?: number;
        w?: number;
        h?: number;
        transparent?: boolean;
    };
    position: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    isVisible: boolean;
    
    // Gesture support
    swipeCommands?: Partial<Record<SwipeDirection, string>>;
    swipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
    
    // Long-press support
    longCommand?: string;
    longActionType?: ActionType;
    longSwipeCommands?: Partial<Record<SwipeDirection, string>>;
    longSwipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;

    // Dynamic triggers
    trigger?: {
        enabled: boolean;
        type?: 'match' | 'status' | 'switch_set' | 'show'; // Made optional to fix manifest errors
        pattern?: string;
        isRegex?: boolean;
        onKeyboard?: boolean;
        offKeyboard?: boolean;
        autoHide?: boolean;
        closeKeyboard?: boolean;
        spit?: boolean;
        targetSet?: string;
        duration?: number;
    };

    menuDisplay?: 'list' | 'dial';
    closeKeyboard?: boolean;
    offKeyboard?: boolean;
    duration?: number;
    mid?: string;
}

export type DrawerType = 'none' | 'character' | 'players' | 'equipment' | 'status';
