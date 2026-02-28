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
    stats: GameStats;
    setStats: React.Dispatch<React.SetStateAction<GameStats>>;
    inCombat: boolean;
    setInCombat: (val: boolean) => void;
    lightning: boolean;
    setLightning: (val: boolean) => void;
    weather: 'none' | 'cloud' | 'rain' | 'heavy-rain' | 'snow';
    setWeather: React.Dispatch<React.SetStateAction<'none' | 'cloud' | 'rain' | 'heavy-rain' | 'snow'>>;
    isFoggy: boolean;
    setIsFoggy: (val: boolean) => void;

    // Shared UI state
    popoverState: PopoverState | null;
    setPopoverState: (val: PopoverState | null) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    settingsTab: 'general' | 'sound';
    setSettingsTab: (val: 'general' | 'sound') => void;
    accentColor: string;
    setAccentColor: (val: string) => void;
    abilities: Record<string, number>;
    setAbilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    characterClass: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none';
    setCharacterClass: (val: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none') => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isNoviceMode, setIsNoviceMode] = useState(() => localStorage.getItem('mud-novice-mode') === 'true');
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => localStorage.getItem('mud-sound-enabled') === 'true');
    const [isMmapperMode, setIsMmapperMode] = useState(() => localStorage.getItem('mud-mmapper-mode') === 'true');
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [target, setTarget] = useState<string | null>(null);
    const [stats, setStats] = useState<GameStats>({
        hp: 0, maxHp: 1,
        mana: 0, maxMana: 1,
        move: 0, maxMove: 1,
        wimpy: 0
    });
    const [inCombat, setInCombat] = useState(false);
    const [lightning, setLightning] = useState(false);
    const [weather, setWeather] = useState<'none' | 'cloud' | 'rain' | 'heavy-rain' | 'snow'>('none');
    const [isFoggy, setIsFoggy] = useState(false);
    const [popoverState, setPopoverState] = useState<PopoverState | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'general' | 'sound'>('general');
    const [accentColor, setAccentColor] = useState('#4a90e2'); // Default accent
    const [abilities, setAbilities] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('mud-abilities');
        return saved ? JSON.parse(saved) : {};
    });
    const [characterClass, setCharacterClass] = useState<'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none'>(() => {
        return (localStorage.getItem('mud-character-class') as any) || 'none';
    });

    useEffect(() => {
        localStorage.setItem('mud-novice-mode', isNoviceMode.toString());
    }, [isNoviceMode]);

    useEffect(() => {
        localStorage.setItem('mud-sound-enabled', isSoundEnabled.toString());
    }, [isSoundEnabled]);

    useEffect(() => {
        localStorage.setItem('mud-mmapper-mode', isMmapperMode.toString());
    }, [isMmapperMode]);

    useEffect(() => {
        localStorage.setItem('mud-abilities', JSON.stringify(abilities));
    }, [abilities]);

    useEffect(() => {
        localStorage.setItem('mud-character-class', characterClass);
    }, [characterClass]);

    return (
        <GameContext.Provider value={{
            isNoviceMode, setIsNoviceMode,
            isSoundEnabled, setIsSoundEnabled,
            isMmapperMode, setIsMmapperMode,
            status, setStatus,
            target, setTarget,
            stats, setStats,
            inCombat, setInCombat,
            lightning, setLightning,
            weather, setWeather,
            isFoggy, setIsFoggy,
            popoverState, setPopoverState,
            isSettingsOpen, setIsSettingsOpen,
            settingsTab, setSettingsTab,
            accentColor, setAccentColor,
            abilities, setAbilities,
            characterClass, setCharacterClass
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
