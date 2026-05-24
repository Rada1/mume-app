import { CaptureStage, CustomButton, MessageType, AccountState } from '../types';

export interface InteractionDeps {
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    input: string;
    setInput: (val: string) => void;
    setTarget: (val: string | null) => void;
    addMessage: (type: MessageType, text: string) => void;
    triggerHaptic: (ms: number) => void;
    btn: {
        isEditMode: boolean;
        setEditingButtonId: (id: string | null) => void;
        setActiveSet: (setId: string) => void;
        buttons: CustomButton[];
        setButtons: (fn: (prev: CustomButton[]) => CustomButton[]) => void;
    };
    joystick: {
        currentDir: string | null;
        isTargetModifierActive: boolean;
        setIsJoystickConsumed: (val: boolean) => void;
        handleJoystickCancel: (e?: any) => void;
        isSwipeWheelHidden: boolean;
        setIsSwipeWheelHidden: (val: boolean) => void;
    };
    isTrackpadModifierActive: boolean;
    target: string | null;
    popoverState: any;
    setPopoverState: (val: any) => void;
    setCommandPreview: (val: string | null) => void;
    wasDraggingRef: React.RefObject<boolean>;
    viewport: any;
    setIsMapExpanded: (val: boolean) => void;
    handleTabClick: (drawer: any) => void;
    setGearTab: (tab: 'worn' | 'inv' | 'vicinity') => void;
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills') => void;
    setSettingsTab: (val: any) => void;
    setInventoryLines: (val: any) => void;
    setEqLines: (val: any) => void;
    setStatsLines: (val: any) => void;
    captureStage: React.MutableRefObject<CaptureStage>;
    ui: {
        mapExpanded: boolean;
        drawer: 'none' | 'character' | 'equipment' | 'inventory' | 'players' | 'stats' | 'map';
        setManagerOpen: boolean;
        isDrawerPeeking: boolean;
    };
    setUI: React.Dispatch<React.SetStateAction<any>>;
    heldButton: any;
    heldButtonRef?: React.MutableRefObject<any>;
    setHeldButton: (val: any) => void;
    parley: import('../types').ParleyState;
    setParley: React.Dispatch<React.SetStateAction<import('../types').ParleyState>>;
    cardRef?: React.RefObject<HTMLDivElement>;
    keywordOverrides: Record<string, string>;
    openKeywordEdit: (context: string, displayText: string) => void;
    lastCommandContextRef: React.MutableRefObject<{ context: string; displayText: string } | null>;
    entities: Record<string, import('../types').GameEntity>;
    applyOptimisticChange?: (change: import('../types').OptimisticChange) => void;
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (info: import('../stores/useUIStore').SelectedTargetInfo) => void;
    clearObjectSelection: () => void;
    playClickSound: () => void;
    playEffect: (name: string, options?: { pitch?: number; volume?: number }) => void;
    isSoundEnabled: boolean;
    initAudio: () => void;
    setAccountState: React.Dispatch<React.SetStateAction<AccountState>>;
    accountState: AccountState;
    accountStageRef: React.MutableRefObject<import('../types').AccountStage>;
}


import { useButtonClicks } from './interactions/useButtonClicks';
import { useGestures } from './interactions/useGestures';
import { useLogTaps } from './interactions/useLogTaps';
export const useInteractionHandlers = (deps: InteractionDeps) => {
    const { handleButtonClick } = useButtonClicks(deps);
    const { handleInputSwipe } = useGestures(deps);
    const { handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp } = useLogTaps(deps);

    return {
        handleButtonClick,
        handleInputSwipe,
        handleLogClick,
        handleLogDoubleClick,
        handleLogPointerDown,
        handleLogPointerUp,
    };
};
