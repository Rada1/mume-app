cat << 'INNER_EOF' > src/context/GameContext/hooks/useSpectateMode.ts
import { useMemo, useRef, useEffect } from 'react';
import { GroupMember } from '../../../types';

interface UseSpectateModeProps {
    isSpectateMode: boolean;
    spectateTargetId: number | null;
    groupMembers: GroupMember[];
}

export const useSpectateMode = ({ isSpectateMode, spectateTargetId, groupMembers }: UseSpectateModeProps) => {
    const spectateTarget = useMemo(() => {
        if (!isSpectateMode || spectateTargetId == null) return null;
        const target = groupMembers.find(m => {
            const mIdStr = String(m.id);
            const targetIdStr = String(spectateTargetId);
            return mIdStr === targetIdStr || m.name === targetIdStr;
        });
        if (!target) {
            console.warn('[Spectate] Target not found in groupMembers!', {
                spectateTargetId,
                memberIds: groupMembers.map(m => m.id),
                memberNames: groupMembers.map(m => m.name)
            });
        }
        return target ?? null;
    }, [isSpectateMode, spectateTargetId, groupMembers]);

    const prevSpectateTargetIdRef = useRef<number | null>(null);
    useEffect(() => {
        if (spectateTarget && spectateTarget.id !== prevSpectateTargetIdRef.current) {
            console.log('[Spectate] Switched Target to:', spectateTarget.name,
                '| HP:', spectateTarget.hp, '| Mana:', spectateTarget.mana,
                '| Room:', spectateTarget.room, '| MapID:', spectateTarget.mapid,
                '| Fighting:', spectateTarget.fighting,
                '| Full:', JSON.stringify(spectateTarget));
            prevSpectateTargetIdRef.current = spectateTarget.id;
        } else if (!spectateTarget && prevSpectateTargetIdRef.current !== null) {
            console.log('[Spectate] Target cleared');
            prevSpectateTargetIdRef.current = null;
        }
    }, [spectateTarget]);

    return spectateTarget;
};
INNER_EOF

cat << 'INNER_EOF' > src/context/GameContext/hooks/useTerminalSync.ts
import { useRef, useEffect } from 'react';

interface UseTerminalSyncProps {
    gameState: import('../../../types').GameState;
    viewport: ReturnType<typeof import('../../../hooks/useViewport').useViewport>;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
}

export const useTerminalSync = ({ gameState, viewport, executeCommand }: UseTerminalSyncProps) => {
    const lastSyncRef = useRef({ cols: 0, rows: 0 });

    useEffect(() => {
        if (gameState === 'disconnected' || !viewport.columns || !viewport.rows) return;

        // Skip if dimensions haven't changed since last SUCCESSFUL sync command
        if (viewport.columns === lastSyncRef.current.cols &&
            viewport.rows === lastSyncRef.current.rows) return;

        const timer = setTimeout(() => {
            // Re-check inside timer in case it changed back or already fired
            if (viewport.columns === lastSyncRef.current.cols &&
                viewport.rows === lastSyncRef.current.rows) return;

            console.log(`[Sync] Terminal: ${viewport.columns}x${viewport.rows}`);

            // Combine into one command to minimize silent capture overhead
            executeCommand(`change width ${viewport.columns}; change length ${viewport.rows}`, true, true);

            // Update the ref so we don't spam if executeCommand identity shifts again
            lastSyncRef.current = { cols: viewport.columns, rows: viewport.rows };
        }, 500); // 500ms settle time

        return () => clearTimeout(timer);
    }, [viewport.columns, viewport.rows, gameState, executeCommand]);
};
INNER_EOF

cat << 'INNER_EOF' > src/context/GameContext/hooks/useKeyboardVisibility.ts
import { useEffect, Dispatch, SetStateAction } from 'react';
import { CustomButton } from '../../../types';

interface UseKeyboardVisibilityProps {
    isKeyboardOpen: boolean;
    rawButtons: CustomButton[];
    setButtons: Dispatch<SetStateAction<CustomButton[]>>;
    triggerSpitManual: (b: CustomButton) => void;
}

export const useKeyboardVisibility = ({
    isKeyboardOpen,
    rawButtons,
    setButtons,
    triggerSpitManual
}: UseKeyboardVisibilityProps) => {
    useEffect(() => {
        if (isKeyboardOpen) {
            rawButtons.forEach(b => {
                if (b.trigger?.enabled && b.trigger.onKeyboard && b.trigger.spit) {
                    triggerSpitManual(b);
                }
            });
        }

        setButtons(prev => {
            let changed = false;
            const next = prev.map(b => {
                if (b.trigger?.enabled && (b.trigger.onKeyboard || b.trigger.offKeyboard) && !b.trigger.spit) {
                    const shouldBeVisible = isKeyboardOpen;
                    if (b.isVisible !== shouldBeVisible) {
                        changed = true;
                        return { ...b, isVisible: shouldBeVisible };
                    }
                }
                return b;
            });
            return changed ? next : prev;
        });
    }, [isKeyboardOpen, setButtons, rawButtons, triggerSpitManual]);
};
INNER_EOF

cat << 'INNER_EOF' > src/context/GameContext/hooks/useGameContextUI.ts
import { useMemo } from 'react';
import { useSessionRecorder } from '../../../hooks/useSessionRecorder';
import { useSessionReplayer } from '../../../hooks/useSessionReplayer';
import { PopoverState } from '../../../types';

interface UseGameContextUIProps {
    s: any;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    settingsTab: string;
    setSettingsTab: (tab: any) => void;
    recorder: ReturnType<typeof useSessionRecorder>;
    replayer: ReturnType<typeof useSessionReplayer>;
}

export const useGameContextUI = ({
    s,
    isSettingsOpen, setIsSettingsOpen,
    settingsTab, setSettingsTab,
    recorder,
    replayer
}: UseGameContextUIProps) => {
    return useMemo(() => ({
        ui: s.ui, setUI: s.setUI,
        popoverState: s.popoverState, setPopoverState: s.setPopoverState,
        isSettingsOpen, setIsSettingsOpen,
        settingsTab, setSettingsTab,
        setIsStatsOpen: s.setIsStatsOpen,
        setIsCharacterOpen: s.setIsCharacterOpen,
        setIsEquipmentOpen: s.setIsEquipmentOpen,
        setIsInventoryOpen: s.setIsInventoryOpen,
        setIsMapExpanded: s.setIsMapExpanded,
        setIsSetManagerOpen: s.setIsSetManagerOpen,
        setIsPlayersOpen: s.setIsPlayersOpen,
        characterName: s.characterName,
        isRecording: recorder.isRecording,
        duration: recorder.duration,
        startRecording: recorder.startRecording,
        stopRecording: recorder.stopRecording,
        saveLog: recorder.saveLog,
        replayer: replayer
    }), [
        s.ui, s.popoverState, s.setPopoverState, isSettingsOpen, settingsTab,
        s.setIsCharacterOpen, s.setIsEquipmentOpen, s.setIsInventoryOpen, s.setIsMapExpanded, s.setIsSetManagerOpen, s.setUI, s.setIsPlayersOpen,
        recorder.isRecording, recorder.duration, recorder.startRecording, recorder.stopRecording, recorder.saveLog,
        replayer.log, replayer.state, replayer.loadLog, replayer.clearLog, replayer.play, replayer.pause, replayer.seek, replayer.setSpeed,
        replayer.setIsVisible, replayer.setPrivacyMode, replayer.startExport, replayer.stopExport
    ]);
};
INNER_EOF

cat << 'INNER_EOF' > src/context/GameContext/hooks/useGameContextVitals.ts
import { useMemo } from 'react';
import { GameStats, CombatHealthStatus, CharacterInfo } from '../../../types';

interface UseGameContextVitalsProps {
    v: any;
    s: any;
}

export const useGameContextVitals = ({ v, s }: UseGameContextVitalsProps) => {
    const effectiveStats = useMemo(() => {
        if (s.isSpectateMode) {
            return s.spectateStats;
        }
        return v.stats;
    }, [s.isSpectateMode, s.spectateStats, v.stats]);

    const effectiveVitals = useMemo(() => {
        if (s.isSpectateMode) {
            return {
                ...v,
                stats: s.spectateStats,
                playerHealthStatus: s.spectateHealthStatus,
                opponentName: s.spectateOpponentName,
                opponentHealthStatus: s.spectateOpponentStatus,
                characterName: s.spectateCharacterName,
                roomName: s.spectateRoomName
            };
        }
        return v;
    }, [v, s.isSpectateMode, s.spectateStats, s.spectateHealthStatus, s.spectateOpponentName, s.spectateOpponentStatus, s.spectateCharacterName, s.spectateRoomName]);

    return { effectiveStats, effectiveVitals };
};
INNER_EOF

cat << 'INNER_EOF' > src/context/GameContext/hooks/useGameContextValuePart1.ts
import { useMemo } from 'react';
import { useSessionRecorder } from '../../../hooks/useSessionRecorder';
import { useSessionReplayer } from '../../../hooks/useSessionReplayer';
import { useButtons } from '../../../hooks/useButtons';
import { useJoystick } from '../../../hooks/useJoystick';
import { useButtonEditor } from '../../../hooks/useButtonEditor';
import { useViewport } from '../../../hooks/useViewport';
import { useEnvironment } from '../../../hooks/useEnvironment';

export interface UseGameContextValueProps {
    s: Record<string, unknown> & { roomName?: string, characterName?: string, quests?: unknown, groupMembers?: unknown, mumeEditState?: unknown, hasSeenOnboarding?: boolean, gameState?: unknown, setQuests?: unknown, setGroupMembers?: unknown, setMumeEditState?: unknown, setHasSeenOnboarding?: unknown, setGameState?: unknown };
    v: Record<string, unknown> & { opponentId?: string | null, setOpponentId?: unknown, isMendingMode?: boolean, setIsMendingMode?: unknown, mendingTarget?: unknown, setMendingTarget?: unknown, heldButton?: unknown, setHeldButton?: unknown, accountState?: unknown, setAccountState?: unknown };
    isSpectateMode: boolean;
    spectateTarget: { room?: string, name?: string, fighting?: boolean, position?: string } | null;
    accentColor: string;
    setAccentColor: (color: string) => void;
    teleportTargets: import('../../../types').TeleportTarget[];
    setTeleportTargets: (targets: import('../../../types').TeleportTarget[] | ((prev: import('../../../types').TeleportTarget[]) => import('../../../types').TeleportTarget[])) => void;
    roomInfoFn: unknown; setRoomInfoFn: unknown;
    roomExitsFn: unknown; setRoomExitsFn: unknown;
    charVitalsFn: unknown; setCharVitalsFn: unknown;
    roomPlayersFn: unknown; setRoomPlayersFn: unknown;
    roomNpcsFn: unknown; setRoomNpcsFn: unknown;
    roomItemsFn: unknown; setRoomItemsFn: unknown;
    addPlayerFn: unknown; setAddPlayerFn: unknown;
    addNpcFn: unknown; setAddNpcFn: unknown;
    removePlayerFn: unknown; setRemovePlayerFn: unknown;
    removeNpcFn: unknown; setRemoveNpcFn: unknown;
    opponentChangeFn: unknown; setOpponentChangeFn: unknown;
    groupAddFn: unknown; setGroupAddFn: unknown;
    groupUpdateFn: unknown; setGroupUpdateFn: unknown;
    groupRemoveFn: unknown; setGroupRemoveFn: unknown;
    groupSetFn: unknown; setGroupSetFn: unknown;
    playSound: unknown; playRandomSound: unknown; playDoorSound: unknown; setPlaySound: unknown; triggerHaptic: unknown; setTriggerHaptic: unknown; playClickSound: unknown; playCommMessageSound: unknown; stopCommMessageSound: unknown; playTutorialExitSound: unknown;
    btn: ReturnType<typeof useButtons>;
    joystick: ReturnType<typeof useJoystick>;
    editor: ReturnType<typeof useButtonEditor>;
    containerRef: React.RefObject<HTMLDivElement>;
    viewport: ReturnType<typeof useViewport>;
    env: ReturnType<typeof useEnvironment>;
    initAudio: unknown;
    input: string; setInput: (input: string) => void;
    handleSend: unknown; handleInputSwipe: unknown; executeCommand: unknown; handleButtonClick: unknown; handleLogClick: unknown; handleLogDoubleClick: unknown; handleLogPointerDown: unknown; handleLogPointerUp: unknown; handleDragStart: unknown; handleDragEnd: unknown;
    handleSaveMumeEdit: unknown;
    mapperRef: unknown;
    settings: unknown;
    audioCtxRef: unknown;
    telnet: unknown;
    parser: unknown;
    practice: unknown;
    spatButtons: unknown; setSpatButtons: unknown;
    prepareLoginAttempt: unknown;
    diagnosticLogs: unknown; addDiagnosticLog: unknown;
    refreshLogHighlights: unknown;
    addMessage: unknown; addSystemMessage: unknown;
    keywordOverrides: unknown; openKeywordEdit: unknown; keywordEditState: unknown; setKeywordEditState: unknown; setKeywordOverride: unknown; removeKeywordOverride: unknown; keywordFailureBanner: unknown; setKeywordFailureBanner: unknown;
    recorder: ReturnType<typeof useSessionRecorder>;
}

export const useGameContextValuePart1 = (props: UseGameContextValueProps) => {
     return useMemo(() => {
        const base = { ...props.s };
        if (props.isSpectateMode && props.spectateTarget) {
            base.roomName = props.spectateTarget.room || props.s.roomName;
            base.characterName = props.spectateTarget.name || props.s.characterName;
            const isTargetFighting = props.spectateTarget.fighting || (typeof props.spectateTarget.position === 'string' && props.spectateTarget.position.toLowerCase() === 'fighting');
            base.inCombat = isTargetFighting ?? false;
        }

        return {
            ...base,
            accentColor: props.accentColor, setAccentColor: props.setAccentColor,
            teleportTargets: props.teleportTargets, setTeleportTargets: props.setTeleportTargets,
            onRoomInfo: props.roomInfoFn, setOnRoomInfo: props.setRoomInfoFn,
            onRoomUpdateExits: props.roomExitsFn, setOnRoomUpdateExits: props.setRoomExitsFn,
            onCharVitals: props.charVitalsFn, setOnCharVitals: props.setCharVitalsFn,
            onRoomPlayers: props.roomPlayersFn, setOnRoomPlayers: props.setRoomPlayersFn,
            onRoomNpcs: props.roomNpcsFn, setOnRoomNpcs: props.setRoomNpcsFn,
            onRoomItems: props.roomItemsFn, setOnRoomItems: props.setRoomItemsFn,
            onAddPlayer: props.addPlayerFn, setOnAddPlayer: props.setAddPlayerFn,
            onAddNpc: props.addNpcFn, setOnAddNpc: props.setAddNpcFn,
            onRemovePlayer: props.removePlayerFn, setOnRemovePlayer: props.setRemovePlayerFn,
            onRemoveNpc: props.removeNpcFn, setOnRemoveNpc: props.setRemoveNpcFn,
            onOpponentChange: props.opponentChangeFn, setOnOpponentChange: props.setOpponentChangeFn,
            opponentId: props.v.opponentId, setOpponentId: props.v.setOpponentId,
            onGroupAdd: props.groupAddFn, setOnGroupAdd: props.setGroupAddFn,
            onGroupUpdate: props.groupUpdateFn, setOnGroupUpdate: props.setGroupUpdateFn,
            onGroupRemove: props.groupRemoveFn, setOnGroupRemove: props.setGroupRemoveFn,
            onGroupSet: props.groupSetFn, setOnGroupSet: props.setGroupSetFn,
            playSound: props.playSound, playRandomSound: props.playRandomSound, playDoorSound: props.playDoorSound, setPlaySound: props.setPlaySound, triggerHaptic: props.triggerHaptic, setTriggerHaptic: props.setTriggerHaptic, playClickSound: props.playClickSound, playCommMessageSound: props.playCommMessageSound, stopCommMessageSound: props.stopCommMessageSound, playTutorialExitSound: props.playTutorialExitSound,
            btn: props.btn, joystick: props.joystick, editor: props.editor, containerRef: props.containerRef, viewport: props.viewport, env: props.env,
            initAudio: props.initAudio,
            setSettings: props.btn.setSettings, setSetSettings: props.btn.setSetSettings,
            input: props.input, setInput: props.setInput,
            handleSend: props.handleSend, handleInputSwipe: props.handleInputSwipe, executeCommand: props.executeCommand, handleButtonClick: props.handleButtonClick, handleLogClick: props.handleLogClick, handleLogDoubleClick: props.handleLogDoubleClick,
            handleLogPointerDown: props.handleLogPointerDown, handleLogPointerUp: props.handleLogPointerUp,
            handleDragStart: props.handleDragStart, handleDragEnd: props.handleDragEnd,
            quests: props.s.quests, setQuests: props.s.setQuests,
            groupMembers: props.s.groupMembers, setGroupMembers: props.s.setGroupMembers,
            mumeEditState: props.s.mumeEditState, setMumeEditState: props.s.setMumeEditState,
            handleSaveMumeEdit: props.handleSaveMumeEdit,
            hasSeenOnboarding: props.s.hasSeenOnboarding, setHasSeenOnboarding: props.s.setHasSeenOnboarding,
            mapperRef: props.mapperRef, ...(props.settings as Record<string, unknown>), audioCtxRef: props.audioCtxRef,
            telnet: props.telnet, parser: props.parser, practice: props.practice,
            spatButtons: props.spatButtons, setSpatButtons: props.setSpatButtons,
            gameState: props.s.gameState, setGameState: props.s.setGameState, prepareLoginAttempt: props.prepareLoginAttempt,
            diagnosticLogs: props.diagnosticLogs, addDiagnosticLog: props.addDiagnosticLog,
            refreshLogHighlights: props.refreshLogHighlights,
            addMessage: props.addMessage, addSystemMessage: props.addSystemMessage,
            isMendingMode: props.v.isMendingMode, setIsMendingMode: props.v.setIsMendingMode,
            mendingTarget: props.v.mendingTarget, setMendingTarget: props.v.setMendingTarget,
            heldButton: props.v.heldButton, setHeldButton: props.v.setHeldButton,
            accountState: props.v.accountState, setAccountState: props.v.setAccountState,
            keywordOverrides: props.keywordOverrides, openKeywordEdit: props.openKeywordEdit,
            keywordEditState: props.keywordEditState, setKeywordEditState: props.setKeywordEditState,
            setKeywordOverride: props.setKeywordOverride, removeKeywordOverride: props.removeKeywordOverride,
            keywordFailureBanner: props.keywordFailureBanner, setKeywordFailureBanner: props.setKeywordFailureBanner,
            detectLighting: props.env.detectLighting,
            setDetectLighting: (fn: (text: string) => void) => { /* internal use */ },
            isRecording: props.recorder.isRecording,
            duration: props.recorder.duration,
            startRecording: props.recorder.startRecording,
            stopRecording: props.recorder.stopRecording,
            saveLog: props.recorder.saveLog,
            recordEntry: props.recorder.recordEntry
        };
    }, [
        props.s, props.isSpectateMode, props.spectateTarget, props.accentColor, props.teleportTargets,
        props.roomInfoFn, props.roomExitsFn, props.charVitalsFn, props.roomPlayersFn, props.roomNpcsFn, props.roomItemsFn,
        props.addPlayerFn, props.addNpcFn, props.removePlayerFn, props.removeNpcFn, props.opponentChangeFn,
        props.playSound, props.triggerHaptic, props.playCommMessageSound, props.stopCommMessageSound, props.playTutorialExitSound,
        props.btn, props.joystick, props.editor, props.viewport, props.env, props.v,
        props.input, props.handleSend, props.handleInputSwipe, props.executeCommand, props.handleButtonClick, props.handleLogClick, props.handleLogDoubleClick,
        props.handleDragStart, props.handleDragEnd,
        props.settings, props.audioCtxRef, props.telnet, props.parser, props.spatButtons, props.diagnosticLogs, props.addDiagnosticLog,
        props.handleLogPointerDown, props.handleLogPointerUp,
        props.handleSaveMumeEdit, props.s.setQuests, props.addMessage, props.addSystemMessage,
        props.s.gameState, props.s.setGameState, props.prepareLoginAttempt
    ]);
};
INNER_EOF

cat << 'INNER_EOF' > src/context/GameContext/hooks/useGameContextValue.ts
import { useGameContextValuePart1, UseGameContextValueProps } from './useGameContextValuePart1';

export const useGameContextValue = (props: UseGameContextValueProps) => {
    return useGameContextValuePart1(props);
};
INNER_EOF
