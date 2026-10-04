/**
 * @file ui.ts
 * @description UI components, buttons, and interaction types.
 */

import { SwipeDirection } from './game';
import { EntityKind, EntityLocation } from './entities';
import type { CommandTargetSuggestion } from '../objects/targetSuggestionTypes';

export interface TacticalArgumentChip {
    id: string;
    title: string;
    displayLabel: string;
    selectedValue: string | null;
    suggestions: CommandTargetSuggestion[];
    onChoose: (value: string) => void;
}

export interface TacticalArgumentChipState {
    ownerId: string | null;
    command: string | null;
    chips: TacticalArgumentChip[];
    setArguments: (ownerId: string, command: string, chips: TacticalArgumentChip[]) => void;
    clearArguments: (ownerId: string) => void;
}

export type UiMode = 'auto' | 'desktop' | 'portrait' | 'landscape';

export interface QuickButton {
    id: string;
    label: string;
    command: string;
}
export type ActionType = 'command' | 'menu' | 'nav' | 'select-assign' | 'select-recipient' | 'select-container' | 'assign' | 'historical' | 'preload' | 'show' | 'modifier';
export type ObjectDragRow = 'inventory' | 'worn' | 'room';

export interface ObjectDragItem {
    row: ObjectDragRow;
    noun: string;
    label: string;
    itemId?: string;
    parentContainerNoun?: string;
    parentContainerId?: string;
}

export interface ObjectDragSource extends ObjectDragItem {
    selectedItems?: ObjectDragItem[];
    sourceLevelItemIds?: string[];
}

export type ObjectDropTarget =
    | { type: 'row'; row: ObjectDragRow; slot?: string }
    | { type: 'entity'; entityId: string; noun: string; label: string }
    | { type: 'container'; containerId: string; noun: string; label: string };

export interface ObjectDragState {
    source: ObjectDragSource;
    x: number;
    y: number;
    target: ObjectDropTarget | null;
}

export interface UiPosition {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    scale?: number;
}

export type UiPositions = Record<string, UiPosition>;

export interface PopoverState {
    x: number;
    y: number;
    sourceHeight?: number;
    sourceRect?: { left: number; top: number; width: number; height: number };
    type?: 'menu' | 'give-recipient-select' | 'give-target-select' | 'put-container-select' | 'shop-search' | 'practice' | 'select-parley-command' | 'select-parley-target' | 'container' | 'shop-card' | 'session-log' | 'help-card' | 'account-character' | 'account-stat-edit';
    setId: string; // The legacy command or set ID. Can still hold standard menu set IDs.
    kind?: EntityKind; 
    location?: EntityLocation; 
    category?: string;
    context?: string; // Command keyword/target like "orc" or "sword"
    displayName?: string; // Exact visible entity/object label from the log
    keyword?: string; // Resolved command keyword shown separately from displayName
    entityId?: string; // Unique registry ID
    parentNoun?: string; // For things like "Orc corpse"
    accentColor?: string;
    executeAndAssign?: boolean;
    assignSourceId?: string;
    assignSwipeDir?: SwipeDirection;
    direction?: string;
    anchorId?: string;
    menuDisplay?: 'list' | 'dial';
    preferSide?: 'top' | 'right';
    isChoosingCategory?: boolean;
    containerItems?: any[];
    // Gesture/Pointer support
    initialPointerX?: number;
    initialPointerY?: number;
    // Special data for cards
    shopItems?: any[];
    helpData?: any;
    capturedExamineLines?: string[];
    capturedConsiderLines?: string[];
    isCapturingExamine?: boolean;
    isCapturingConsider?: boolean;
    capturedWhoisLines?: string[];
    isCapturingWhois?: boolean;
    whoisTarget?: string;
    // Keep the inspect-card layout visible before the player explicitly gathers
    // look/consider data.
    hasInspectionCard?: boolean;
    openedByHover?: boolean;
    isRoomDescription?: boolean;
    accountCharName?: string;
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
        race?: string[];
        subrace?: string[];
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
    rebindCenterSetId?: string;
    rebindSets?: Partial<Record<SwipeDirection, string>>;

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
    hotkey?: string; // e.g. "F1" through "F12" — fires command on keydown
}

export type DrawerType = 'none' | 'account' | 'character' | 'equipment' | 'status';
