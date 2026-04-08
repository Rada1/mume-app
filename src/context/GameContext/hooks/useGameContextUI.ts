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
