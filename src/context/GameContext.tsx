import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameStats, TeleportTarget, PopoverState, CustomButton } from '../types';

interface GameContextType {
    // Settings & Mode
    isNoviceMode: boolean;
    setIsNoviceMode: (val: boolean) => void;
    isSoundEnabled: boolean;
    setIsSoundEnabled: (val: boolean) => void;
    isMmapperMode: boolean;
    setIsMmapperMode: (val: boolean) => void;

    // Game State
    status: 'connected' | 'disconnected' | 'connecting';
    setStatus: (val: 'connected' | 'disconnected' | 'connecting') => void;
    target: string | null;
    setTarget: (val: string | null) => void;

    // Shared UI state
    popoverState: PopoverState | null;
    setPopoverState: (val: PopoverState | null) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    settingsTab: 'general' | 'sound';
    setSettingsTab: (val: 'general' | 'sound') => void;
    accentColor: string;
    setAccentColor: (val: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isNoviceMode, setIsNoviceMode] = useState(() => localStorage.getItem('mud-novice-mode') === 'true');
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => localStorage.getItem('mud-sound-enabled') === 'true');
    const [isMmapperMode, setIsMmapperMode] = useState(() => localStorage.getItem('mud-mmapper-mode') === 'true');
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [target, setTarget] = useState<string | null>(null);
    const [popoverState, setPopoverState] = useState<PopoverState | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'general' | 'sound'>('general');
    const [accentColor, setAccentColor] = useState('#4a90e2'); // Default accent

    useEffect(() => {
        localStorage.setItem('mud-novice-mode', isNoviceMode.toString());
    }, [isNoviceMode]);

    useEffect(() => {
        localStorage.setItem('mud-sound-enabled', isSoundEnabled.toString());
    }, [isSoundEnabled]);

    useEffect(() => {
        localStorage.setItem('mud-mmapper-mode', isMmapperMode.toString());
    }, [isMmapperMode]);

    return (
        <GameContext.Provider value={{
            isNoviceMode, setIsNoviceMode,
            isSoundEnabled, setIsSoundEnabled,
            isMmapperMode, setIsMmapperMode,
            status, setStatus,
            target, setTarget,
            popoverState, setPopoverState,
            isSettingsOpen, setIsSettingsOpen,
            settingsTab, setSettingsTab,
            accentColor, setAccentColor
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) throw new Error('useGame must be used within a GameProvider');
    return context;
};
