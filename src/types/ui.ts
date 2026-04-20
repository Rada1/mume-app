/**
 * @file ui.ts
 * @description UI components, buttons, and interaction types.
 */

import { SwipeDirection } from './game';

export type UiMode = 'auto' | 'desktop' | 'portrait' | 'landscape';
export type TriggerAction = 'show' | 'switch_set';
export type ActionType = 'command' | 'nav' | 'menu' | 'assign' | 'select-assign' | 'teleport-manage' | 'select-recipient' | 'select-container' | 'preload';

export interface CustomButton {
    id: string;
    label: string;
    icon?: string;
    command: string; 
    setId?: string; 
    actionType?: ActionType;
    longActionType?: ActionType;
    swipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
    longSwipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
    longCommand?: string;
    display: 'floating' | 'inline';
    style: {
        x: number;
        y: number;
        w: number;
        h: number;
        backgroundColor: string;
        borderColor?: string;
        color?: string;
        fontSize?: number;
        borderRadius?: number;
        transparent?: boolean;
        iconScale?: number;
        iconOpacity?: number;
        borderWidth?: number;
        curvedText?: boolean;
        shape: 'rect' | 'pill' | 'circle';
    };
    trigger: {
        enabled: boolean;
        pattern: string;
        isRegex: boolean;
        autoHide: boolean;
        duration: number;
        spit?: boolean;
        type?: TriggerAction;
        targetSet?: string;
        onKeyboard?: boolean;
        closeKeyboard?: boolean;
        offKeyboard?: boolean;
    };
    isVisible: boolean;
    swipeCommands?: Partial<Record<SwipeDirection, string>>;
    longSwipeCommands?: Partial<Record<SwipeDirection, string>>;
    menuDisplay?: 'list' | 'dial';
    requirement?: {
        ability?: string;
        minProficiency?: number;
        characterClass?: string[];
    };
    hideIfUnknown?: boolean;
    isDimmed?: boolean;
    _skipJoystick?: boolean;
}

export interface PopoverState {
    x: number;
    y: number;
    sourceHeight?: number;
    type?: 'menu' | 'teleport-select' | 'teleport-save' | 'teleport-manage' | 'give-recipient-select' | 'give-target-select' | 'put-container-select' | 'shop-search' | 'practice' | 'select-parley-command' | 'select-parley-target' | 'container' | 'shop-card' | 'session-log' | 'help-card' | 'character-select';
    setId: string;
    category?: string;
    context?: string;
    containerItems?: any[];
    assignSourceId?: string;
    assignSwipeDir?: SwipeDirection;
    executeAndAssign?: boolean;
    menuDisplay?: 'list' | 'dial';
    initialPointerX?: number;
    initialPointerY?: number;
    teleportId?: string;
    spellCommand?: string;
    isContainer?: boolean;
    parentNoun?: string;
    entityId?: string;
    shopItems?: any[];
    practiceData?: any;
    helpData?: string;
    accentColor?: string;
    direction?: string;
    accountCharacters?: any[];
    accountState?: any;
    setAccountState?: any;
}

export interface TeleportTarget {
    id: string;
    label: string;
    expiresAt: number;
}

export interface ParleyState {
    active: boolean;
    command: string;
    target: string | null;
}

export interface InlineCategoryConfig {
    id: string;
    keywords: string[];
    color?: string;
}

export interface ButtonSetSettings {
    themeColor?: string;
}

export interface SavedSettings {
    version: number;
    connectionUrl: string;
    bgImage: string;
    buttons: CustomButton[];
    soundTriggers: any[];
    actions?: any[];
    combatSet?: string;
    defaultSet?: string;
    loginName?: string;
    loginPassword?: string;
    isSoundEnabled?: boolean;
    isNoviceMode?: boolean;
    abilities?: Record<string, number>;
    characterClass?: string;
    setSettings?: Record<string, ButtonSetSettings>;
    autoConnect?: boolean;
    showDebugEchoes?: boolean;
    uiMode?: UiMode;
    disable3dScroll?: boolean;
    disableSmoothScroll?: boolean;
    isImmersionMode?: boolean;
    showRecordingIndicator?: boolean;
    showOrganicTerrain?: boolean;
    inlineCategories?: InlineCategoryConfig[];
    favorites?: string[];
    isHighlighterEnabled?: boolean;
    isBloomEnabled?: boolean;
    isNewbieMode?: boolean;
    isTimestampEnabled?: boolean;
    autoSaveSessions?: boolean;
}

export interface SpatButton {
    id: string;
    btnId: string;
    label: string;
    icon?: string;
    command: string;
    action: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    color: string;
    timestamp: number;
    swipeCommands?: Partial<Record<SwipeDirection, string>>;
    swipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
    menuDisplay?: 'list' | 'dial';
    closeKeyboard?: boolean;
    offKeyboard?: boolean;
    duration?: number;
    mid?: string;
}
