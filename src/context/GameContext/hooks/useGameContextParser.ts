import { useGameParser as useBaseGameParser } from '../../../hooks/GameParser/useGameParser';
import { MapperRef } from '../../../components/Mapper/mapperTypes';

interface UseGameContextParserProps {
    s: any;
    v: any;
    env: any;
    btn: any;
    mapperRef: React.RefObject<MapperRef>;
    addMessage: any; addSystemMessage: any;
    playSound: any; playHitImpactSound: any; playRandomSound: any; playDoorSound: any;
    triggerHaptic: any;
    addDiagnosticLog: any;
    keywordOverrides: any;
    settings: any;
    practice: any;
    shop: any;
    roomDescRef: any;
    pendingGmcpCommRef: any;
    lastCommIdBySenderRef: any;
    viewport: any;
    spectateTarget: any;
    audioMethods: any;
}

export const useGameContextParser = ({
    s, v, env, btn, mapperRef, addMessage, addSystemMessage, playSound, playHitImpactSound, playRandomSound, playDoorSound,
    triggerHaptic, addDiagnosticLog, keywordOverrides, settings, practice, shop, roomDescRef, pendingGmcpCommRef,
    lastCommIdBySenderRef, viewport, spectateTarget, audioMethods
}: UseGameContextParserProps) => {

    const { playIncantationSound, playCommMessageSound, stopIncantationSound, playTutorialExitSound, playMagicExplosionSound } = audioMethods;

    return useBaseGameParser({
        isInventoryOpen: s.ui.drawer === 'inventory',
        isEquipmentOpen: s.ui.drawer === 'equipment',
        isCharacterOpen: s.ui.drawer === 'character',
        isStatsOpen: s.ui.drawer === 'stats',
        isPlayersOpen: s.ui.drawer === 'players',
        mapperRef,
        btn: {
            buttonsRef: btn.buttonsRef,
            setButtons: btn.setButtons,
            buttonTimers: btn.buttonTimers,
            setActiveSet: btn.setActiveSet,
        },
        addMessage, playSound, playHitImpactSound, playRandomSound, playDoorSound, triggerHaptic,
        setWeather: s.setWeather,
        setIsFoggy: s.setIsFoggy,
        setStats: v.setStats,
        setAbilities: s.setAbilities,
        setCharacterClass: s.setCharacterClass,
        setInCombat: s.setInCombat,
        inCombatRef: s.inCombatRef,
        setLightningEnabled: s.setLightningEnabled,
        setPlayerPosition: s.setPlayerPosition,
        setMood: s.setMood,
        detectLighting: env.detectLighting,
        setCurrentTerrain: s.setCurrentTerrain,
        addDiagnosticLog,
        keywordOverrides,
        isSoundEnabledRef: settings.isSoundEnabledRef,
        soundTriggersRef: settings.soundTriggersRef,
        actionsRef: s.actionsRef,
        executeCommandRef: s.executeCommandRef,
        setInventoryLines: s.setInventoryLines,
        setStatsLines: s.setStatsLines,
        setEqLines: s.setEqLines,
        setWhoList: s.setWhoList,
        setWhereList: s.setWhereList,
        captureStage: s.captureStage,
        practice,
        shop,
        isDrawerCapture: s.isDrawerCapture,
        isSilentCapture: s.isSilentCapture,
        isWaitingForStats: s.isWaitingForStats,
        isWaitingForEq: s.isWaitingForEq,
        isWaitingForInv: s.isWaitingForInv,
        roomNameRef: s.roomNameRef,
        roomDescRef,
        roomName: s.roomName,
        setRoomName: s.setRoomName,
        setRoomDesc: s.setRoomDesc,
        popoverState: s.popoverState,
        setPopoverState: s.setPopoverState,
        pendingDrawerContainerRef: s.pendingDrawerContainerRef,
        setDiscoveredItems: s.setDiscoveredItems,
        setPlayerHealthStatus: v.setPlayerHealthStatus,
        setOpponentHealthStatus: v.setOpponentHealthStatus,
        setOpponentName: v.setOpponentName,
        setBufferHealthStatus: v.setBufferHealthStatus,
        setBufferName: v.setBufferName,
        setCharacterInfo: v.setCharacterInfo,
        setSpectateStats: s.setSpectateStats,
        setSpectateHealthStatus: s.setSpectateHealthStatus,
        setSpectateOpponentName: s.setSpectateOpponentName,
        setSpectateOpponentStatus: s.setSpectateOpponentStatus,
        setSpectatePosition: s.setSpectatePosition,
        setSpectateRoomName: s.setSpectateRoomName,
        setSpectateInCombat: s.setSpectateInCombat,
        setSpectateCharacterName: s.setSpectateCharacterName,
        characterInfo: v.characterInfo,
        setQuests: s.setQuests,
        quests: s.quests,
        mumeEditState: s.mumeEditState,
        setMumeEditState: s.setMumeEditState,
        triggerXpTicker: v.triggerXpTicker,
        addSystemMessage,
        pendingGmcpCommRef,
        lastCommIdBySenderRef,
        groupMembers: s.groupMembers,
        setEntities: s.setEntities,
        playIncantationSound,
        playCommMessageSound,
        stopIncantationSound,
        playTutorialExitSound,
        playMagicExplosionSound,
        deathRoomId: v.deathRoomId,
        setDeathRoomId: v.setDeathRoomId,
        accountState: v.accountState,
        setAccountState: v.setAccountState,
        setGameState: s.setGameState,
        activePrompt: v.activePrompt,
        gameState: s.gameState,
        isMobile: viewport.isMobile,
        playerPosition: s.playerPosition,
        isSpectateMode: s.isSpectateMode,
        spectateTarget,
        setRoomPlayers: s.setRoomPlayers,
        setRoomNpcs: s.setRoomNpcs,
        setRoomItems: s.setRoomItems,
        registerEntity: s.registerEntity,
        spectateStats: v.spectateStats,
        characterName: s.characterName
    });
};
